
import React, { useState, useMemo } from 'react';
import { runBacktest } from './services/backtestEngine';
import { RealOperation, CapitalInjection } from './types';
import { useFundData } from './hooks/useFundData';
import { usePortfolio } from './hooks/usePortfolio';
import BacktestView from './components/BacktestView';
import RealWorldView from './components/RealWorldView';

type ViewMode = 'BACKTEST' | 'REAL_WORLD';

const getLocalDateString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('BACKTEST');
  
  // --- 更新为用户指定的默认标的 ---
  const [fundA, setFundA] = useState({code: '011861', name: '中证1000ETF联接C'});
  const [fundB, setFundB] = useState({code: '020603', name: '中证红利低波动100联接C'});
  
  const [momentumN, setMomentumN] = useState<number>(20); // 动量默认20日
  const [useMAFilter, setUseMAFilter] = useState<boolean>(true);
  const [minHoldDays, setMinHoldDays] = useState<number>(7);
  const [isParamLocked, setIsParamLocked] = useState<boolean>(false);
  const [principal, setPrincipal] = useState<number>(10000);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); 
    d.setFullYear(d.getFullYear() - 2); // 默认回测2年
    return getLocalDateString(d);
  });
  
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [injections, setInjections] = useState<CapitalInjection[]>([]);

  const { data: rawFundData, loading, refresh, showSuccess } = useFundData(fundA.code, fundB.code);
  const [realOps, setRealOps] = useState<RealOperation[]>(() => {
    const saved = localStorage.getItem('real_operations_v2');
    return saved ? JSON.parse(saved) : [];
  });
  React.useEffect(() => { localStorage.setItem('real_operations_v2', JSON.stringify(realOps)); }, [realOps]);

  const portfolio = usePortfolio(realOps, fundA, fundB, rawFundData);
  const result = useMemo(() => {
    if (rawFundData.length < 2) return null;
    const filtered = rawFundData.filter(d => d.date >= startDate && d.date <= endDate);
    if (filtered.length < 2) return null;
    return runBacktest(filtered, fundA.code, fundB.code, momentumN, 0.0012, false, useMAFilter, principal, minHoldDays, injections);
  }, [rawFundData, fundA.code, fundB.code, momentumN, useMAFilter, startDate, endDate, principal, minHoldDays, injections]);

  const addInjection = (inj: {date: string, amount: number}) => {
    if (inj.date && inj.amount > 0) {
      setInjections([...injections, { ...inj, id: Math.random().toString(36).substr(2, 9) }].sort((a,b) => a.date.localeCompare(b.date)));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-10 text-slate-900">
      <nav className="flex items-center justify-between mb-6 md:mb-8 bg-white p-1.5 md:p-2 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex gap-1 w-full md:w-auto">
          <button onClick={() => setViewMode('BACKTEST')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'BACKTEST' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <i className="fa-solid fa-chart-line text-[10px] md:text-xs"></i> 策略回测
          </button>
          <button onClick={() => setViewMode('REAL_WORLD')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'REAL_WORLD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <i className="fa-solid fa-book text-[10px] md:text-xs"></i> 实盘手记
          </button>
        </div>
        <div className="hidden md:flex items-center gap-3 pr-4">
           {loading && <span className="text-[10px] font-black text-indigo-500 animate-pulse uppercase">通过代理同步中...</span>}
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">A-SHARE_MOMENTUM_V2</span>
        </div>
      </nav>

      <main className="min-h-[60vh]">
        {viewMode === 'BACKTEST' ? (
          <BacktestView 
            fundA={fundA} setFundA={setFundA} fundB={fundB} setFundB={setFundB}
            principal={principal} setPrincipal={setPrincipal}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            loading={loading} refresh={refresh} showSuccess={showSuccess}
            momentumN={momentumN} setMomentumN={setMomentumN}
            useMAFilter={useMAFilter} setUseMAFilter={setUseMAFilter}
            minHoldDays={minHoldDays} setMinHoldDays={setMinHoldDays}
            isParamLocked={isParamLocked} setIsParamLocked={setIsParamLocked}
            injections={injections} addInjection={addInjection} removeInjection={(id) => setInjections(injections.filter(i=>i.id!==id))}
            result={result}
          />
        ) : (
          <RealWorldView 
            result={result} fundA={fundA} fundB={fundB}
            portfolio={portfolio} realOps={realOps} setRealOps={setRealOps}
            rawData={rawFundData}
          />
        )}
      </main>
    </div>
  );
};

export default App;
