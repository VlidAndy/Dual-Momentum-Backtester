
import React from 'react';
import { FundData, CapitalInjection, BacktestResult } from '../types';
import MetricsCard from './MetricsCard';
import EquityChart from './EquityChart';
import FundPicker from './FundPicker';

interface Props {
  fundA: {code: string, name: string};
  setFundA: (f: any) => void;
  fundB: {code: string, name: string};
  setFundB: (f: any) => void;
  principal: number;
  setPrincipal: (p: number) => void;
  startDate: string;
  setStartDate: (s: string) => void;
  endDate: string;
  setEndDate: (e: string) => void;
  loading: boolean;
  refresh: () => void;
  showSuccess: boolean;
  momentumN: number;
  setMomentumN: (n: number) => void;
  useMAFilter: boolean;
  setUseMAFilter: (b: boolean) => void;
  minHoldDays: number;
  setMinHoldDays: (d: number) => void;
  isParamLocked: boolean;
  setIsParamLocked: (l: boolean) => void;
  injections: CapitalInjection[];
  addInjection: (inj: {date: string, amount: number}) => void;
  removeInjection: (id: string) => void;
  result: BacktestResult | null;
}

const BacktestView: React.FC<Props> = (props) => {
  const [newInj, setNewInj] = React.useState({ date: '', amount: 0 });

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8 md:mb-10 flex flex-col lg:flex-row lg:items-start justify-between border-b pb-8 md:pb-10 gap-8">
        <div className="flex-1 space-y-6 md:space-y-8">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight italic">LAB 分析实验室</h1>
             <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-black border border-amber-200">C 类费率模型</span>
          </div>
          <div className="space-y-4 md:space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FundPicker label="标的 A (1000ETF联接C)" code={props.fundA.code} name={props.fundA.name} onUpdate={props.setFundA} placeholder="011861" />
              <FundPicker label="标的 B (红利低波联接C)" code={props.fundB.code} name={props.fundB.name} onUpdate={props.setFundB} placeholder="020603" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-1">初始回测本金 (¥)</label>
                <input type="number" value={props.principal} onChange={(e) => props.setPrincipal(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-1">回测起点日期</label>
                <input type="date" value={props.startDate} onChange={(e) => props.setStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-1">回测终点日期</label>
                <input type="date" value={props.endDate} onChange={(e) => props.setEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full" />
              </div>
              <button onClick={props.refresh} disabled={props.loading} className={`w-full px-6 py-2.5 rounded-xl font-black text-sm shadow-xl h-[42px] transition-all flex items-center justify-center gap-2 ${props.showSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'} ${props.loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
                {props.loading ? <i className="fa-solid fa-arrows-rotate animate-spin"></i> : props.showSuccess ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-sync"></i>}
                <span>{props.loading ? '同步中' : props.showSuccess ? '对齐成功' : '刷新数据'}</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-96 flex flex-col gap-6">
          <div className="bg-white p-5 md:p-7 rounded-3xl shadow-xl border border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase mb-4 md:mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><i className="fa-solid fa-sliders text-indigo-500"></i> 策略配置</span>
              <button onClick={() => props.setIsParamLocked(!props.isParamLocked)} className={`transition-all ${props.isParamLocked ? 'text-indigo-600' : 'text-slate-300'}`}><i className={`fa-solid ${props.isParamLocked ? 'fa-lock' : 'fa-lock-open'}`}></i></button>
            </h4>
            <div className="space-y-5 md:space-y-6">
              <div>
                <div className="flex justify-between mb-2 text-[10px] font-black uppercase text-slate-400"><span>动量周期</span><span>{props.momentumN}天</span></div>
                <input type="range" min="5" max="60" value={props.momentumN} disabled={props.isParamLocked} onChange={(e) => props.setMomentumN(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg accent-indigo-600" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">最短持仓对齐 (避开1.5%费率)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 7, 14, 30].map(d => (
                    <button key={d} disabled={props.isParamLocked} onClick={() => props.setMinHoldDays(d)} className={`py-2 text-[10px] font-black rounded-xl border transition-all ${props.minHoldDays === d ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{d === 0 ? '不锁' : `${d}天`}</button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 mt-2 italic font-bold leading-tight">* 设为0则信号触发即轮动，若持仓&lt;7天将扣除1.5%费率</p>
              </div>
              <button disabled={props.isParamLocked} onClick={() => props.setUseMAFilter(!props.useMAFilter)} className={`w-full py-3 rounded-2xl text-[10px] font-black border transition-all ${props.useMAFilter ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>均线过滤(MA20): {props.useMAFilter ? '开启' : '关闭'}</button>
            </div>
          </div>

          <div className="bg-slate-50 p-5 md:p-6 rounded-3xl border-2 border-dashed border-slate-200">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">费率详情</span>
                <i className="fa-solid fa-circle-info text-slate-300"></i>
             </div>
             <ul className="text-[10px] font-bold text-slate-500 space-y-2">
                <li className="flex justify-between"><span>申购费 (BUY)</span><span className="text-emerald-600">0.00%</span></li>
                <li className="flex justify-between"><span>赎回费 (SELL &gt; 7天)</span><span className="text-slate-700">0.05% (滑点)</span></li>
                <li className="flex justify-between"><span>赎回费 (SELL &lt; 7天)</span><span className="text-rose-600">1.50% (惩罚)</span></li>
             </ul>
          </div>
        </div>
      </header>

      {props.result ? (
        <div className="space-y-8 md:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <MetricsCard label="最终总资产" value={`¥${props.result.metrics.finalCapital.toFixed(0)}`} subValue={`投入: ¥${props.result.metrics.totalInvested.toLocaleString()}`} icon="fa-coins" colorClass="bg-blue-600" />
            <MetricsCard label="累计盈利率" value={`${(props.result.metrics.totalReturn*100).toFixed(2)}%`} subValue={`浮盈: ¥${(props.result.metrics.finalCapital - props.result.metrics.totalInvested).toFixed(0)}`} icon="fa-chart-pie" colorClass="bg-emerald-600" />
            <MetricsCard label="年化收益" value={`${(props.result.metrics.annualizedReturn*100).toFixed(2)}%`} icon="fa-bolt" colorClass="bg-amber-600" />
            <MetricsCard label="交易成本消耗" value={`¥${props.result.metrics.totalCosts.toFixed(0)}`} subValue={`回撤: ${(props.result.metrics.maxDrawdown*100).toFixed(2)}%`} icon="fa-receipt" colorClass="bg-rose-600" />
          </div>
          <div className="h-[350px] md:h-[480px]">
            <EquityChart data={props.result.dailyEquity} name1={props.fundA.name} name2={props.fundB.name} />
          </div>
          <div className="bg-white rounded-2xl md:rounded-[2rem] border overflow-hidden shadow-sm">
            <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50/50 border-b flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm md:text-base">策略流水 (C 类费率模拟)</h3>
              <span className="text-[10px] text-slate-400 font-bold md:hidden italic">← 左右滑动表格</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                  <tr><th className="px-5 md:px-8 py-4 md:py-5">日期</th><th className="px-5 md:px-8 py-4 md:py-5">标的</th><th className="px-5 md:px-8 py-4 md:py-5 text-center">动作</th><th className="px-5 md:px-8 py-4 md:py-5 text-right">发生额</th><th className="px-5 md:px-8 py-4 md:py-5 text-right">费用</th><th className="px-5 md:px-8 py-4 md:py-5">备注</th></tr>
                </thead>
                <tbody className="divide-y">{props.result.trades.slice().reverse().map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 md:px-8 py-4 font-mono text-slate-400 text-[10px] md:text-xs">{t.date}</td>
                    <td className="px-5 md:px-8 py-4 font-black text-slate-700 max-w-[120px] truncate">{t.asset === props.fundA.code ? props.fundA.name : t.asset === props.fundB.code ? props.fundB.name : t.asset}</td>
                    <td className="px-5 md:px-8 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black ${t.reason.includes('追加') ? 'bg-indigo-100 text-indigo-700' : t.type === 'BUY' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {t.type === 'BUY' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="px-5 md:px-8 py-4 text-right font-mono font-bold">¥{t.totalAmount.toFixed(0)}</td>
                    <td className={`px-5 md:px-8 py-4 text-right font-mono font-black ${t.cost > 0 ? 'text-amber-600' : 'text-emerald-500'}`}>
                      {t.cost > 0 ? `¥${t.cost.toFixed(2)}` : 'FREE'}
                    </td>
                    <td className="px-5 md:px-8 py-4 text-slate-400 text-[9px] md:text-[10px] font-bold italic">{t.reason}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      ) : <div className="py-20 text-center font-black text-slate-300 uppercase animate-pulse">正在载入回测分析...</div>}
    </div>
  );
};

export default BacktestView;
