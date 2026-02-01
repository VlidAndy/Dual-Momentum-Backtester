
import { FundData } from "../types";

export interface SearchResult {
  code: string;
  name: string;
  type: string;
}

/**
 * 智能代理调度器：聚合多个公共代理，对抗 IP 屏蔽和网络波动
 */
const fetchWithProxy = async (targetUrl: string): Promise<string> => {
  // 备选代理列表
  const proxyStrategies = [
    {
      name: 'AllOrigins',
      getUrl: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&_v=${Date.now()}`,
      parser: (data: any) => data.contents
    },
    {
      name: 'CorsProxyIO',
      getUrl: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      parser: (data: any) => typeof data === 'string' ? data : JSON.stringify(data)
    },
    {
      name: 'ThingProxy',
      getUrl: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
      parser: (data: any) => typeof data === 'string' ? data : JSON.stringify(data)
    }
  ];

  let lastError: Error | null = null;

  for (const strategy of proxyStrategies) {
    try {
      console.log(`[DataService] Attempting with ${strategy.name}...`);
      const response = await fetch(strategy.getUrl(targetUrl), {
        headers: { 'Accept': '*/*' }
      });
      
      if (!response.ok) {
        throw new Error(`${strategy.name} returned status ${response.status}`);
      }

      // 绝大多数代理对 JS 文件会返回 text
      const rawText = await response.text();
      
      // 处理某些代理会将结果包装成 JSON 的情况（如 AllOrigins）
      try {
        const json = JSON.parse(rawText);
        const content = strategy.parser(json);
        if (content) return content;
      } catch (e) {
        // 如果不是 JSON，说明直接返回了原始文本
        return rawText;
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`[DataService] ${strategy.name} failed:`, lastError.message);
      // 继续尝试下一个代理
      continue;
    }
  }

  throw new Error(`所有代理尝试均失败。最后错误: ${lastError?.message}`);
};

/**
 * 搜索基金
 */
export const searchFunds = async (key: string): Promise<SearchResult[]> => {
  if (!key) return [];
  try {
    const targetUrl = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(key)}`;
    const contents = await fetchWithProxy(targetUrl);
    const data = JSON.parse(contents);
    
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

/**
 * 正则解析 JS 变量
 */
const extractDataFromJS = (text: string, varName: string): any[] => {
  const regex = new RegExp(`${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);?`, 'm');
  const match = text.match(regex);
  if (!match) return [];
  
  let jsonStr = match[1].trim();
  try {
    // 处理天天基金 JS 的非标格式
    const sanitized = jsonStr
      .replace(/'/g, '"') 
      .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') 
      .replace(/,(\s*[\]}])/g, '$1'); 
      
    return JSON.parse(sanitized);
  } catch (e) {
    try {
      return JSON.parse(jsonStr);
    } catch (e2) {
      return [];
    }
  }
};

/**
 * 获取原始净值
 */
const fetchRawFundData = async (code: string): Promise<{ timestamp: number; nav: number }[]> => {
  if (!code) return [];
  try {
    // 注意：天天基金的 pingzhongdata 接口对代码有要求
    const targetUrl = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;
    const text = await fetchWithProxy(targetUrl);
    
    if (!text || text.length < 100) throw new Error("Response too short");

    let rawData = extractDataFromJS(text, 'Data_ACWorthTrend');
    if (rawData.length === 0) {
      rawData = extractDataFromJS(text, 'Data_netWorthTrend');
    }

    return rawData
      .map((item: any) => {
        if (Array.isArray(item)) return { timestamp: item[0], nav: item[1] };
        if (item && typeof item.x === 'number') return { timestamp: item.x, nav: item.y };
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
  return date.toISOString().split('T')[0];
};

export const fetchHistoricalData = async (code1: string, code2: string): Promise<FundData[]> => {
  const marketBenchCode = '000300'; 
  
  const [data1, data2, dataBench] = await Promise.all([
    fetchRawFundData(code1),
    fetchRawFundData(code2),
    fetchRawFundData(marketBenchCode)
  ]);

  if (data1.length === 0 || data2.length === 0) {
    throw new Error(`数据同步失败。这通常是由于公共代理服务器被目标网站屏蔽导致，请稍后再试或更换基金代码。`);
  }

  const dataMap = new Map<string, { nav1?: number, nav2?: number, navBench?: number }>();
  
  data1.forEach(p => dataMap.set(formatDate(p.timestamp), { nav1: p.nav }));
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

  if (intersection.length === 0) throw new Error("标的时间轴无交集");
  return intersection;
};
