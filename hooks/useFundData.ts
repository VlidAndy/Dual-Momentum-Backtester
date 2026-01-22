
import { useState, useCallback, useEffect } from 'react';
import { fetchHistoricalData } from '../services/dataService';
import { FundData } from '../types';

export const useFundData = (codeA: string, codeB: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FundData[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setShowSuccess(false);
    
    try {
      const result = await fetchHistoricalData(codeA, codeB);
      setData(result);
      setLastRefreshed(new Date());
      // 触发成功反馈
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || "获取失败");
    } finally {
      setLoading(false);
    }
  }, [codeA, codeB, loading]);

  useEffect(() => {
    refresh();
  }, [codeA, codeB]); // 仅在代码变化时自动执行，手动刷新由按钮触发

  return { data, loading, error, refresh, lastRefreshed, showSuccess };
};
