
import React from 'react';
import { BacktestResult } from '../types';

interface Props {
  result: BacktestResult | null;
  fundA: any;
  fundB: any;
  portfolio?: any; // 传入实盘组合数据
}

const SignalBanner: React.FC<Props> = ({ result, fundA, fundB, portfolio }) => {
  if (!result?.lastSignal) {
    return (
      <div className="mb-6 md:mb-10 bg-slate-100 rounded-3xl md:rounded-[3rem] p-8 md:p-12 text-center border-2 border-dashed border-slate-200">
        <p className="text-slate-400 text-xs md:text-sm font-bold italic tracking-widest uppercase">请先运行左侧回测引擎获取基准信号</p>
      </div>
    );
  }

  const { lastSignal } = result;
  const theoreticalRec = lastSignal.recommendation;
  
  // 获取当前实盘持仓情况
  const activePos = portfolio?.activePositions?.[0]; // 假设本策略主要关注单一持仓轮动
  const currentHoldingCode = activePos ? activePos.code : 'CASH';
  
  // 核心逻辑：判定实盘与策略是否对齐
  const isAligned = theoreticalRec === currentHoldingCode;
  
  // 计算 C 类赎回保护（基于实盘真实入场日期）
  let daysSinceBuy = 0;
  let remainingLockDays = 0;
  if (activePos?.lastBuyDate) {
    const buyDate = new Date(activePos.lastBuyDate);
    const today = new Date();
    daysSinceBuy = Math.ceil((today.getTime() - buyDate.getTime()) / (1000 * 3600 * 24));
    remainingLockDays = Math.max(0, 7 - daysSinceBuy);
  }

  // 渲染逻辑状态
  const isLagging = (new Date().getTime() - new Date(lastSignal.date).getTime()) / (1000 * 3600 * 24) >= 2;

  return (
    <div className={`mb-6 md:mb-10 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden text-white border transition-all duration-500 ${
      !isAligned ? 'bg-amber-950 border-amber-500/30' : 'bg-indigo-950 border-white/5'
    }`}>
      {/* 背景装饰 */}
      <div className="absolute right-0 top-0 opacity-5 translate-x-1/4 -translate-y-1/4 hidden md:block">
        <i className={`fa-solid ${isAligned ? 'fa-diagram-project' : 'fa-triangle-exclamation'} text-[20rem]`}></i>
      </div>
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${isLagging ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'}`}>
              <i className="fa-solid fa-clock-rotate-left mr-1"></i>
              最新净值: {lastSignal.date}
            </div>
            {isAligned ? (
              <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                <i className="fa-solid fa-circle-check mr-1"></i> 实盘已对齐信号
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border border-amber-500/50 text-amber-400 bg-amber-500/10 animate-pulse">
                <i className="fa-solid fa-circle-exclamation mr-1"></i> 实盘偏离理论建议
              </div>
            )}
          </div>
          <div className="text-[10px] font-bold text-indigo-300 italic opacity-60">
            * 基于实盘手记中 {activePos?.lastBuyDate || '未知'} 的入场记录计算
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* 左侧：决策结果 */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 h-px bg-indigo-400"></span> 
              {isAligned ? '继续保持' : (remainingLockDays > 0 ? '调仓受限 (C类锁定期)' : '触发调仓动作')}
            </p>
            
            <div className="space-y-2">
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter">
                {!isAligned && remainingLockDays > 0 ? (
                  <span className="text-amber-400">等待 {remainingLockDays} 天后卖出</span>
                ) : theoreticalRec === 'CASH' ? (
                  <span className="text-slate-400">建议清仓避险</span>
                ) : theoreticalRec === fundA.code ? (
                  <span className="text-rose-500">持有 {fundA.name}</span>
                ) : (
                  <span className="text-amber-500">持有 {fundB.name}</span>
                )}
              </h3>
              
              {!isAligned && (
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200/80 bg-white/5 p-2 rounded-lg border border-white/5">
                   <i className="fa-solid fa-shuffle"></i>
                   理论建议从 {currentHoldingCode === 'CASH' ? '空仓' : (currentHoldingCode === fundA.code ? fundA.name : fundB.name)} 切换至新标的
                </div>
              )}
            </div>

            <p className="text-sm text-indigo-200/70 font-medium max-w-sm">
              {remainingLockDays > 0 
                ? `实盘记录显示你于 ${activePos.lastBuyDate} 买入，目前持仓仅 ${daysSinceBuy} 天。为规避 1.5% 惩罚性费率，请强制等待对齐。`
                : (isAligned ? "实盘持仓与策略信号完美契合，请无视短期波动，继续执行。“截断亏损，让利润奔跑”。" : "当前标的分差或趋势已逆转，且已过免赎回费期，建议执行换仓。")}
            </p>
          </div>

          {/* 右侧：逻辑数据 */}
          <div className="lg:col-span-7 bg-white/5 backdrop-blur-sm rounded-[2rem] p-6 md:p-8 border border-white/10">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-2 tracking-widest">A分 (动量强度)</p>
                    <div className="flex items-end gap-2">
                      <span className={`text-2xl font-black ${(lastSignal.score1 > 0) ? 'text-emerald-400' : 'text-rose-400'}`}>{(lastSignal.score1*100).toFixed(2)}%</span>
                      {lastSignal.passMA1 && <i className="fa-solid fa-chart-line text-emerald-500 mb-1 text-xs" title="均线上方"></i>}
                    </div>
                 </div>
                 <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-2 tracking-widest">B分 (动量强度)</p>
                    <div className="flex items-end gap-2">
                      <span className={`text-2xl font-black ${(lastSignal.score2 > 0) ? 'text-emerald-400' : 'text-rose-400'}`}>{(lastSignal.score2*100).toFixed(2)}%</span>
                      {lastSignal.passMA2 && <i className="fa-solid fa-chart-line text-emerald-500 mb-1 text-xs" title="均线上方"></i>}
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-indigo-300 px-1">
                  <span>当前分差 (Gap)</span>
                  <span className="text-white">{(Math.abs(lastSignal.score1 - lastSignal.score2)*100).toFixed(2)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{width: `${Math.min(100, Math.abs(lastSignal.score1 - lastSignal.score2) * 500)}%`}}
                   ></div>
                </div>
                <p className="text-[9px] text-indigo-400 font-bold italic">
                  * 经验值：分差 > 1.0% 时执行换仓更稳健，可抵消摩擦成本
                </p>
              </div>

              <div className="mt-2 pt-4 border-t border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${lastSignal.passMA1 && lastSignal.passMA2 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <span className="text-[10px] font-black text-indigo-300 uppercase">市场环境: {result.metrics.annualizedReturn > 0 ? '牛市氛围' : '震荡/熊市'}</span>
                 </div>
                 <div className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Decision Logic v2.3</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalBanner;
