
import { FundData } from "../types";

export interface SearchResult {
  code: string;
  name: string;
  type: string;
}

/**
 * 基础 JSONP 工具函数
 * 用于绕过搜索接口的 CORS 限制
 */
const fetchJsonp = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_cb_${Math.round(Math.random() * 1000000)}`;
    const script = document.createElement('script');
    
    // 构造带 callback 的 URL
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    script.async = true;

    (window as any)[callbackName] = (data: any) => {
      delete (window as any)[callbackName];
      document.head.removeChild(script);
      resolve(data);
    };

    script.onerror = () => {
      delete (window as any)[callbackName];
      if (script.parentNode) document.head.removeChild(script);
      reject(new Error("JSONP 请求失败"));
    };

    document.head.appendChild(script);
    
    setTimeout(() => {
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
        if (script.parentNode) document.head.removeChild(script);
        reject(new Error("请求超时"));
      }
    }, 8000);
  });
};

/**
 * 使用动态脚本注入获取基金历史净值 (针对 pingzhongdata 接口)
 */
const injectScriptData = (code: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const scriptId = `fund_data_${code}_${Date.now()}`;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;
    script.async = true;

    const cleanup = () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };

    script.onload = () => {
      try {
        const acWorth = (window as any).Data_ACWorthTrend;
        const netWorth = (window as any).Data_netWorthTrend;
        const data = acWorth || netWorth;
        
        if (data && Array.isArray(data)) {
          resolve(JSON.parse(JSON.stringify(data)));
        } else {
          reject(new Error(`未找到数据 (Code: ${code})`));
        }
      } catch (e) {
        reject(e);
      } finally {
        cleanup();
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`加载失败 (Code: ${code})`));
    };

    document.head.appendChild(script);
    setTimeout(() => { cleanup(); reject(new Error("请求超时")); }, 10000);
  });
};

/**
 * 搜索基金 - 采用 JSONP 模式，彻底摒弃 AllOrigins 代理
 */
export const searchFunds = async (key: string): Promise<SearchResult[]> => {
  if (!key) return [];
  try {
    // 天天基金搜索接口支持 callback 参数进行 JSONP 调用
    const targetUrl = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(key)}`;
    const data = await fetchJsonp(targetUrl);
    
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

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
};

export const fetchHistoricalData = async (code1: string, code2: string): Promise<FundData[]> => {
  const marketBenchCode = '000300'; 
  
  try {
    const [raw1, raw2, rawBench] = await Promise.all([
      injectScriptData(code1),
      injectScriptData(code2),
      injectScriptData(marketBenchCode)
    ]);

    const dataMap = new Map<string, { nav1?: number, nav2?: number, navBench?: number }>();
    
    const processRaw = (raw: any[], key: 'nav1' | 'nav2' | 'navBench') => {
      raw.forEach((item: any) => {
        let ts, val;
        if (Array.isArray(item)) { [ts, val] = item; }
        else if (item.x) { ts = item.x; val = item.y; }
        
        if (ts && val !== undefined) {
          const d = formatDate(ts);
          const existing = dataMap.get(d) || {};
          dataMap.set(d, { ...existing, [key]: val });
        }
      });
    };

    processRaw(raw1, 'nav1');
    processRaw(raw2, 'nav2');
    processRaw(rawBench, 'navBench');

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

  } catch (error: any) {
    console.error(`[DataService] Fetch failed:`, error);
    throw new Error(`同步失败: ${error.message}`);
  }
};
