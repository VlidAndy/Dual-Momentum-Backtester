
import React from 'react';
import { RealOperation, BacktestResult, FundData } from '../types';
import SignalBanner from './SignalBanner';

interface Props {
  result: BacktestResult | null;
  fundA: any;
  fundB: any;
  portfolio: any;
  realOps: RealOperation[];
  setRealOps: (ops: RealOperation[]) => void;
  rawData: FundData[];
}

const RealWorldView: React.FC<Props> = (props) => {
  const [newOp, setNewOp] = React.useState<Partial<RealOperation>>({ 
    date: new Date().toISOString().split('T')[0], type: 'BUY', code: props.fundA.code, amount: 0, price: 0 
  });

  const matchedNav = React.useMemo(() => {
    if (!newOp.date || !newOp.code || props.rawData.length === 0) return 0;
    const day = props.rawData.find(d => d.date === newOp.date);
    return day ? (newOp.code === props.fundA.code ? day.nav1 : day.nav2) : 0;
  }, [newOp.date, newOp.code, props.rawData, props.fundA.code]);

  const handleAddOp = () => {
    if (newOp.date && newOp.code && newOp.amount && newOp.price) {
      const op: RealOperation = {
        id: Math.random().toString(36).substr(2, 9),
        date: newOp.date as string,
        code: newOp.code as string,
        name: newOp.code === props.fundA.code ? props.fundA.name : props.fundB.name,
        type: newOp.type as 'BUY' | 'SELL',
        price: newOp.price as number,
        amount: newOp.amount as number,
        note: newOp.note
      };
      props.setRealOps([...props.realOps, op]);
      setNewOp({ date: new Date().toISOString().split('T')[0], type: 'BUY', code: props.fundA.code, amount: 0, price: 0 });
    }
  };

  const alerts = React.useMemo(() => {
    const list = [];
    const today = new Date();
    
    props.portfolio.activePositions.forEach((pos: any) => {
      const buyDate = new Date(pos.lastBuyDate);
      const diffDays = Math.ceil((today.getTime() - buyDate.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays < 7) {
        list.push({
          type: 'danger',
          title: `${pos.name} 持仓不足7天`,
          desc: `赎回将面临 1.5% 惩罚性费率，建议等待对齐。`
        });
      } else if (diffDays < 14) {
        list.push({
          type: 'warning',
          title: `${pos.name} 刚过惩罚期`,
          desc: `虽免惩罚费，但频繁交易会损耗申购费，请谨慎。`
        });
      }
    });

    if (props.result?.lastSignal) {
      const sig = props.result.lastSignal;
      const scoreGap = Math.abs(sig.score1 - sig.score2);
      const currentHoldingCode = props.portfolio.activePositions[0]?.code || 'CASH';
      const isSwitchNeeded = sig.recommendation !== currentHoldingCode;

      if (isSwitchNeeded && sig.recommendation !== 'CASH') {
        if (scoreGap >= 0.01) {
          list.push({
            type: 'action',
            title: `触发轮动信号 (差异 ${(scoreGap * 100).toFixed(2)}%)`,
            desc: `差额已超 1% 经验阈值，建议执行换仓操作。`
          });
        } else {
          list.push({
            type: 'info',
            title: `弱轮动信号 (${(scoreGap * 100).toFixed(2)}%)`,
            desc: `信号已变但分差较小，可结合市场热度观察。`
          });
        }
      }
    }

    return list;
  }, [props.portfolio.activePositions, props.result]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6 md:space-y-8">
      {/* 关键改动：传入 portfolio 数据 */}
      <SignalBanner result={props.result} fundA={props.fundA} fundB={props.fundB} portfolio={props.portfolio} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* 策略纪律看板 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
                <i className="fa-solid fa-gavel text-indigo-500"></i> 实盘纪律手册
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                实盘操作需对抗人性。双动量策略的核心在于“截断亏损，让利润奔跑”。若触发空仓信号，请务必执行，切勿主观猜底。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="bg-slate-50 px-4 py-3 rounded-2xl text-center border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">换仓阈值</p>
                <p className="text-xs font-black text-slate-700">1.0% 分差</p>
              </div>
              <div className="bg-slate-50 px-4 py-3 rounded-2xl text-center border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">均线参考</p>
                <p className="text-xs font-black text-slate-700">MA 20日</p>
              </div>
            </div>
          </div>

          {/* 预警区块 */}
          <div className="bg-slate-900 rounded-3xl p-5 md:p-6 shadow-xl border border-white/10 text-white relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <i className="fa-solid fa-bell-concierge text-indigo-400"></i>
              <h4 className="text-xs font-black uppercase tracking-widest">智能交易预警</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                  a.type === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 
                  a.type === 'action' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' : 
                  a.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' :
                  'bg-slate-800 border-slate-700 text-slate-300'
                }`}>
                  <i className={`fa-solid mt-1 text-xs ${
                    a.type === 'danger' ? 'fa-circle-exclamation' : 
                    a.type === 'action' ? 'fa-bolt' : 
                    'fa-circle-info'
                  }`}></i>
                  <div>
                    <p className="text-[11px] font-black mb-0.5">{a.title}</p>
                    <p className="text-[9px] opacity-70 leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              )) : (
                <div className="py-4 text-center text-slate-500 font-bold italic text-xs w-full sm:col-span-2">
                  策略运行平稳，暂无操作预警
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">当前实盘持仓</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PORTFOLIO OVERVIEW</p>
              </div>
              <div className="sm:text-right w-full sm:w-auto bg-indigo-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-indigo-100 sm:border-0">
                <p className="text-[10px] font-black text-slate-400 uppercase">估值总资产</p>
                <p className="text-2xl md:text-3xl font-black text-indigo-600">¥{props.portfolio.activePositions.reduce((sum: number, p: any) => sum + (p.cost + (p.profit / (p.amount || 1))) * p.amount, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {props.portfolio.activePositions.map((pos: any) => (
                <div key={pos.code} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-200 transition-colors">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
                    <i className="fa-solid fa-gem text-4xl"></i>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 mb-1 uppercase">{pos.code}</p>
                  <h4 className="text-base font-black text-slate-800 mb-3 truncate">{pos.name}</h4>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                    <div><p className="text-[9px] text-slate-400 font-bold">持仓份额</p><p className="font-mono font-black text-xs">{pos.amount.toFixed(2)}</p></div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold">累计浮盈</p>
                      <p className={`font-mono font-black text-xs ${pos.profit >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {pos.profit >= 0 ? '+' : ''}{pos.profit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {props.portfolio.activePositions.length === 0 && (
                <div className="col-span-2 py-10 text-center text-slate-300 font-black uppercase text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                  暂无持仓记录，等待信号买入
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50/50 border-b flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm">操作手记流水</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                  <tr><th className="px-6 py-4">交易日期</th><th className="px-6 py-4">标的名称</th><th className="px-6 py-4 text-center">动作</th><th className="px-6 py-4 text-right">成交净值</th><th className="px-6 py-4 text-right">确认份额</th><th className="px-6 py-4 text-center">操作</th></tr>
                </thead>
                <tbody className="divide-y">{props.realOps.slice().reverse().map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-400">{op.date}</td>
                    <td className="px-6 py-3 font-black text-slate-700 max-w-[100px] truncate">{op.name}</td>
                    <td className="px-6 py-3 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-black ${op.type === 'BUY' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{op.type === 'BUY' ? '买入' : '卖出'}</span></td>
                    <td className="px-6 py-3 text-right font-mono font-bold">¥{op.price.toFixed(4)}</td>
                    <td className="px-6 py-3 text-right font-mono text-slate-500">{op.amount.toFixed(2)}</td>
                    <td className="px-6 py-3 text-center"><button onClick={() => props.setRealOps(props.realOps.filter(x => x.id !== op.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fa-solid fa-trash-can"></i></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 lg:sticky lg:top-8">
            <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3 underline decoration-indigo-500 decoration-4 underline-offset-4">实盘记录录入</h4>
            <div className="space-y-4">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setNewOp({...newOp, type: 'BUY'})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${newOp.type === 'BUY' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>买入 (+)</button>
                <button onClick={() => setNewOp({...newOp, type: 'SELL'})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${newOp.type === 'SELL' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>卖出 (-)</button>
              </div>
              <div className="space-y-3">
                <select value={newOp.code} onChange={e => setNewOp({...newOp, code: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value={props.fundA.code}>{props.fundA.name}</option>
                  <option value={props.fundB.code}>{props.fundB.name}</option>
                </select>
                <input type="date" value={newOp.date} onChange={e => setNewOp({...newOp, date: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                <div className="relative">
                  <input type="number" step="0.0001" value={newOp.price || ''} onChange={e => setNewOp({...newOp, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none pr-12" placeholder="成交净值" />
                  {matchedNav > 0 && <button onClick={() => setNewOp({...newOp, price: matchedNav})} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-indigo-600 text-white px-2 py-1 rounded font-black">对齐净值</button>}
                </div>
                <input type="number" value={newOp.amount || ''} onChange={e => setNewOp({...newOp, amount: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="成交份额" />
              </div>
              <button onClick={handleAddOp} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                <i className="fa-solid fa-check-circle"></i> 保存至本地
              </button>
            </div>
          </div>
          
          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-lightbulb text-8xl"></i>
             </div>
             <div className="flex items-center gap-2 mb-4">
               <i className="fa-solid fa-compass"></i>
               <span className="text-[10px] font-black uppercase tracking-widest">实盘导航</span>
             </div>
             <ul className="text-[10px] space-y-3 opacity-90 relative z-10">
                <li className="flex items-start gap-2"><span className="mt-1 w-1 h-1 rounded-full bg-white flex-shrink-0"></span><p><b>换仓频率</b>：一般 20 个交易日左右轮动一次，频繁换仓会产生巨大手续费。</p></li>
                <li className="flex items-start gap-2"><span className="mt-1 w-1 h-1 rounded-full bg-white flex-shrink-0"></span><p><b>分差保护</b>：分差（Score Gap）建议大于 1.0% 再执行换仓，防止在分值交叉点反复摩擦。</p></li>
                <li className="flex items-start gap-2"><span className="mt-1 w-1 h-1 rounded-full bg-white flex-shrink-0"></span><p><b>费用优化</b>：持有满 7 天后，红利低波类基金通常赎回费较低，但申购费仍需注意。</p></li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealWorldView;
