
import { FundData } from "../types";

export interface SearchResult {
  code: string;
  name: string;
  type: string;
}

/**
 * 使用动态脚本注入绕过 CORS
 * 天天基金的 pingzhongdata 接口返回的是 JS 变量赋值，非常适合这种方式
 */
const injectScriptData = (code: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const scriptId = `fund_data_${code}_${Date.now()}`;
    const script = document.createElement('script');
    script.id = scriptId;
    // 强制使用 https 协议
    script.src = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;
    script.async = true;

    const cleanup = () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      // 清理全局变量防止内存泄漏，但在读取后执行
    };

    script.onload = () => {
      try {
        // 天天基金 JS 文件定义的关键变量
        const acWorth = (window as any).Data_ACWorthTrend;
        const netWorth = (window as any).Data_netWorthTrend;
        const fundName = (window as any).fS_name;
        
        const data = acWorth || netWorth;
        
        if (data && Array.isArray(data)) {
          // 深度拷贝数据
          const result = JSON.parse(JSON.stringify(data));
          resolve(result);
        } else {
          reject(new Error(`未在脚本中找到有效数据变量 (Code: ${code})`));
        }
      } catch (e) {
        reject(e);
      } finally {
        cleanup();
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`脚本加载失败，可能是代码错误或请求被拦截 (Code: ${code})`));
    };

    document.head.appendChild(script);
    
    // 10秒超时控制
    setTimeout(() => {
      cleanup();
      reject(new Error("请求超时"));
    }, 10000);
  });
};

/**
 * 搜索基金 (搜索接口仍然需要代理，因为返回的是纯 JSON)
 */
export const searchFunds = async (key: string): Promise<SearchResult[]> => {
  if (!key) return [];
  try {
    const targetUrl = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(key)}`;
    // 搜索接口仍然保留一个轻量级代理，或者在生产环境使用自己的 proxy
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
    const json = await response.json();
    const data = JSON.parse(json.contents);
    
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
    console.log(`[DataService] Fetching via Direct Script Injection...`);
    
    // 并行注入脚本获取数据
    const [raw1, raw2, rawBench] = await Promise.all([
      injectScriptData(code1),
      injectScriptData(code2),
      injectScriptData(marketBenchCode)
    ]);

    const dataMap = new Map<string, { nav1?: number, nav2?: number, navBench?: number }>();
    
    // 解析逻辑
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
    console.error(`[DataService] Direct fetch failed:`, error);
    throw new Error(`直连同步失败: ${error.message}。请检查代码是否正确或尝试刷新。`);
  }
};
