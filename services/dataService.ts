
import { FundData } from "../types";

export interface SearchResult {
  code: string;
  name: string;
  type: string;
}

export const searchFunds = async (key: string): Promise<SearchResult[]> => {
  if (!key) return [];
  try {
    const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(key)}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];
    const data = await response.json();
    if (data && data.Datas && Array.isArray(data.Datas)) {
      return data.Datas.map((item: any) => ({
        code: item.CODE,
        name: item.NAME,
        type: item.FUNDTYPE || item.TYPE || '基金'
      }));
    }
    return [];
  } catch (error) {
    console.error("[DataService] Search failed:", error);
    return [];
  }
};

const cleanAndParseJSON = (jsonLikeStr: string): any[] => {
  if (!jsonLikeStr) return [];
  let cleaned = jsonLikeStr.trim();
  try {
    cleaned = cleaned.replace(/'/g, '"');
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("[DataService] JSON optimization failed");
    try { return JSON.parse(jsonLikeStr); } catch { return []; }
  }
};

const fetchRawFundData = async (code: string): Promise<{ timestamp: number; nav: number }[]> => {
  if (!code) return [];
  try {
    const cacheBuster = `v=${Date.now()}`;
    const targetUrl = `https://fund.eastmoney.com/pingzhongdata/${code}.js?${cacheBuster}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    
    const text = await response.text();
    if (!text || text.length < 200) throw new Error(`Invalid response for ${code}`);

    // EastMoney JS 变量名列表
    const varNames = ['Data_ACWorthTrend', 'Data_netWorthTrend', 'Data_grandTotalWorthTrend'];
    let rawData: any[] = [];

    for (const varName of varNames) {
      const searchStr = `${varName} = `;
      const startIdx = text.indexOf(searchStr);
      if (startIdx === -1) continue;

      const dataStart = startIdx + searchStr.length;
      const endIdx = text.indexOf(';', dataStart);
      if (endIdx === -1) continue;

      const arrayStr = text.substring(dataStart, endIdx).trim();
      if (arrayStr.startsWith('[') && arrayStr.endsWith(']')) {
        rawData = cleanAndParseJSON(arrayStr);
        if (rawData.length > 0) break;
      }
    }

    return rawData
      .map((item: any) => {
        if (Array.isArray(item)) return { timestamp: item[0], nav: item[1] };
        else if (item && typeof item.x === 'number') return { timestamp: item.x, nav: item.y };
        return null;
      })
      .filter((item): item is { timestamp: number; nav: number } => 
        item !== null && typeof item.nav === 'number'
      );
  } catch (error) {
    console.error(`[DataService] Fetching ${code} failed:`, error);
    return [];
  }
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  // 使用本地日期格式 YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fetchHistoricalData = async (code1: string, code2: string): Promise<FundData[]> => {
  const marketBenchCode = '005918'; 
  
  const [data1, data2, dataBench] = await Promise.all([
    fetchRawFundData(code1),
    fetchRawFundData(code2),
    fetchRawFundData(marketBenchCode)
  ]);

  if (data1.length === 0 || data2.length === 0) {
    throw new Error(`无法获取基金数据。可能是由于代码错误、尚未上市或网络波动。`);
  }

  const dataMap = new Map<string, { nav1?: number, nav2?: number, navBench?: number }>();
  
  data1.forEach(p => {
    const d = formatDate(p.timestamp);
    dataMap.set(d, { nav1: p.nav });
  });
  
  data2.forEach(p => {
    const d = formatDate(p.timestamp);
    const existing = dataMap.get(d) || {};
    dataMap.set(d, { ...existing, nav2: p.nav });
  });
  
  dataBench.forEach(p => {
    const d = formatDate(p.timestamp);
    const existing = dataMap.get(d) || {};
    dataMap.set(d, { ...existing, navBench: p.nav });
  });

  const intersection = Array.from(dataMap.entries())
    .filter(([_, v]) => v.nav1 !== undefined && v.nav2 !== undefined)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      nav1: v.nav1!,
      nav2: v.nav2!,
      navBenchmark: v.navBench ?? 1.0 
    }));

  return intersection;
};
