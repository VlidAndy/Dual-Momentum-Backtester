
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

  return (
    <div className="mb-6 md:mb-10 bg-indigo-900 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden text-white group">
      <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4 hidden md:block">
        <i className="fa-solid fa-tower-broadcast text-[15rem]"></i>
      </div>
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 md:gap-10">
        <div className="space-y-4 md:space-y-5 w-full">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">双动量决策中心</p>
          </div>
          <h3 className="text-2xl md:text-5xl font-black tracking-tight leading-tight">
            建议：
            <span className={`block md:inline-block mt-2 md:mt-0 md:ml-4 px-6 md:px-10 py-2 rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 ${isCash ? 'bg-slate-800 border-slate-700' : isA ? 'bg-rose-600 border-rose-500 animate-pulse' : 'bg-amber-500 border-amber-400 animate-pulse'}`}>
              {isCash ? '持币避险' : isA ? `持有 ${fundA.name}` : `持有 ${fundB.name}`}
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <p className="text-indigo-400 text-[10px] md:text-xs font-bold bg-white/10 px-3 py-1 rounded-full">数据截止: {lastSignal.date}</p>
            <div className="flex gap-2">
               <span className={`px-2 py-0.5 rounded-lg text-[9px] md:text-[10px] font-black border ${lastSignal.passMA1 ? 'border-emerald-500 text-emerald-400' : 'border-rose-500 text-rose-400'}`}>A均线: {lastSignal.passMA1 ? '多' : '空'}</span>
               <span className={`px-2 py-0.5 rounded-lg text-[9px] md:text-[10px] font-black border ${lastSignal.passMA2 ? 'border-emerald-500 text-emerald-400' : 'border-rose-500 text-rose-400'}`}>B均线: {lastSignal.passMA2 ? '多' : '空'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-around w-full lg:w-auto gap-4 md:gap-10 bg-white/5 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] backdrop-blur-md border border-white/10 shadow-inner">
          <div className="text-center flex-1 lg:flex-none">
            <div className="text-[8px] md:text-[9px] text-indigo-300 font-black uppercase mb-1 tracking-widest">A 分</div>
            <div className={`text-xl md:text-2xl font-black font-mono ${lastSignal.score1 > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{(lastSignal.score1*100).toFixed(2)}%</div>
          </div>
          <div className="w-px h-10 md:h-12 bg-white/10"></div>
          <div className="text-center flex-1 lg:flex-none">
            <div className="text-[8px] md:text-[9px] text-indigo-300 font-black uppercase mb-1 tracking-widest">B 分</div>
            <div className={`text-xl md:text-2xl font-black font-mono ${lastSignal.score2 > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{(lastSignal.score2*100).toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalBanner;
