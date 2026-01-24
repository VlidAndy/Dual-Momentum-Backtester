
import React from 'react';
import { BacktestResult } from '../types';

interface Props {
  result: BacktestResult | null;
  fundA: any;
  fundB: any;
}

const SignalBanner: React.FC<Props> = ({ result, fundA, fundB }) => {
  if (!result?.lastSignal) {
    return (
      <div className="mb-6 md:mb-10 bg-slate-100 rounded-3xl md:rounded-[3rem] p-8 md:p-12 text-center border-2 border-dashed border-slate-200">
        <p className="text-slate-400 text-xs md:text-sm font-bold italic tracking-widest uppercase">请运行回测以获取最新信号</p>
      </div>
    );
  }

  const { lastSignal } = result;
  const isA = lastSignal.recommendation === fundA.code;
  const isB = lastSignal.recommendation === fundB.code;
  const isCash = lastSignal.recommendation === 'CASH';

  // 决策状态
  const aValid = lastSignal.score1 > 0 && lastSignal.passMA1;
  const bValid = lastSignal.score2 > 0 && lastSignal.passMA2;

  // 数据滞后检测
  const today = new Date();
  const dataDate = new Date(lastSignal.date);
  const diffDays = Math.floor((today.getTime() - dataDate.getTime()) / (1000 * 3600 * 24));
  const isLagging = diffDays >= 2;

  return (
    <div className="mb-6 md:mb-10 bg-indigo-950 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden text-white border border-white/5">
      <div className="absolute right-0 top-0 opacity-5 translate-x-1/4 -translate-y-1/4 hidden md:block">
        <i className="fa-solid fa-diagram-project text-[20rem]"></i>
      </div>
      
      <div className="relative z-10">
        {/* 顶部状态 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${isLagging ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'}`}>
              <i className="fa-solid fa-clock-rotate-left mr-1"></i>
              数据更新: {lastSignal.date} {isLagging && "(数据滞后)"}
            </div>
            <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
              策略状态: 运行中
            </div>
          </div>
          <div className="text-[10px] font-bold text-indigo-300 italic opacity-60">
            * 建议在交易日 14:45 后观察此信号执行操作
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* 左侧：决策结果 */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 h-px bg-indigo-400"></span> 最终执行建议
            </p>
            <h3 className="text-4xl md:text-6xl font-black tracking-tighter">
              {isCash ? (
                <span className="text-slate-400 italic">空仓避险</span>
              ) : isA ? (
                <span className="text-rose-500 underline decoration-rose-500/30 underline-offset-8">持有 {fundA.name}</span>
              ) : (
                <span className="text-amber-500 underline decoration-amber-500/30 underline-offset-8">持有 {fundB.name}</span>
              )}
            </h3>
            <p className="text-sm text-indigo-200/70 font-medium max-w-sm">
              {isCash 
                ? "当前无标的同时满足“动量为正”且“均线上方”条件，建议归集资金至货币工具。" 
                : `当前 ${isA ? fundA.name : fundB.name} 相对强度占优且趋势健康，建议全仓持有。`}
            </p>
          </div>

          {/* 右侧：逻辑流水线 */}
          <div className="lg:col-span-7 bg-white/5 backdrop-blur-sm rounded-[2rem] p-6 md:p-8 border border-white/10">
            <div className="flex flex-col gap-6">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2 text-center">双动量决策链路 (Logic Pipeline)</p>
              
              <div className="grid grid-cols-3 gap-2 md:gap-4 relative">
                {/* 连线 */}
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2 hidden md:block"></div>
                
                {/* Step 1: 绝对动量 */}
                <div className="relative bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center z-10">
                  <div className="text-[8px] font-black text-indigo-400 uppercase mb-2">1. 绝对动量</div>
                  <div className="flex flex-col gap-1">
                    <div className={`text-[10px] font-bold ${lastSignal.score1 > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>A: {lastSignal.score1 > 0 ? 'PASS' : 'FAIL'}</div>
                    <div className={`text-[10px] font-bold ${lastSignal.score2 > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>B: {lastSignal.score2 > 0 ? 'PASS' : 'FAIL'}</div>
                  </div>
                </div>

                {/* Step 2: 趋势过滤 */}
                <div className="relative bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center z-10">
                  <div className="text-[8px] font-black text-indigo-400 uppercase mb-2">2. 趋势过滤</div>
                  <div className="flex flex-col gap-1">
                    <div className={`text-[10px] font-bold ${lastSignal.passMA1 ? 'text-emerald-400' : 'text-rose-400'}`}>A: {lastSignal.passMA1 ? 'PASS' : 'FAIL'}</div>
                    <div className={`text-[10px] font-bold ${lastSignal.passMA2 ? 'text-emerald-400' : 'text-rose-400'}`}>B: {lastSignal.passMA2 ? 'PASS' : 'FAIL'}</div>
                  </div>
                </div>

                {/* Step 3: 相对强度 */}
                <div className="relative bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center z-10">
                  <div className="text-[8px] font-black text-indigo-400 uppercase mb-2">3. 相对强度</div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-white">
                      {Math.abs(lastSignal.score1 - lastSignal.score2) > 0.005 ? '差异显著' : '差异较小'}
                    </div>
                    <div className="text-[9px] font-black text-indigo-400">Δ {(Math.abs(lastSignal.score1 - lastSignal.score2)*100).toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                 <div className="flex gap-4">
                   <span className="text-indigo-300">A分: <span className="text-white">{(lastSignal.score1*100).toFixed(2)}%</span></span>
                   <span className="text-indigo-300">B分: <span className="text-white">{(lastSignal.score2*100).toFixed(2)}%</span></span>
                 </div>
                 <div className="text-indigo-500 uppercase italic tracking-tighter">Algorithm Powered</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalBanner;
