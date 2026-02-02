
import { FundData, BacktestResult, EquityPoint, Trade, CapitalInjection } from "../types";

export const runBacktest = (
  allData: FundData[], // 传入所有可用历史数据以供预热
  code1: string, 
  code2: string, 
  momentumWindow: number = 20,
  slippageRate: number = 0, // 默认 0 滑点
  useAveraging: boolean = false,
  useMAFilter: boolean = false,
  initialCapital: number = 10000,
  minHoldDays: number = 7, 
  injections: CapitalInjection[] = [],
  displayStartDate: string // 用户选显的起始日期
): BacktestResult => {
  const CASH_ANNUAL_RATE = 0.015; 
  const MA_WINDOW = 20; 
  
  let totalInvested = initialCapital;
  let currentCapital = initialCapital;
  let currentHolding: string = 'CASH';
  let shares = 0;
  let totalCosts = 0;
  let lastTradeIdx = -1; 
  
  // 基础参照初始化
  let bench1Shares = initialCapital;
  let bench2Shares = initialCapital;
  let benchMarketShares = initialCapital;
  let cashValue = initialCapital;

  let pendingSwitchTo: string | null = null;
  const dailyEquity: EquityPoint[] = [];
  const trades: Trade[] = [];
  
  const dailyCashRate = Math.pow(1 + CASH_ANNUAL_RATE, 1 / 252) - 1;

  // 核心：使用全量数据计算指标，避免信号漂移
  const getScore = (currentIdx: number, baseN: number, navKey: 'nav1' | 'nav2'): number => {
    if (currentIdx < baseN) return -999;
    return (allData[currentIdx][navKey] - allData[currentIdx - baseN][navKey]) / allData[currentIdx - baseN][navKey];
  };

  const getMA = (currentIdx: number, window: number, navKey: 'nav1' | 'nav2'): number => {
    if (currentIdx < window - 1) return -1;
    let sum = 0;
    for (let j = 0; j < window; j++) sum += allData[currentIdx - j][navKey];
    return sum / window;
  };

  let isTracking = false;
  let lastS1 = 0, lastS2 = 0, lastPass1 = false, lastPass2 = false, lastRec = 'CASH';

  for (let i = 0; i < allData.length; i++) {
    const today = allData[i];
    
    // 判定是否进入用户指定的回测区间
    if (!isTracking && today.date >= displayStartDate) {
      isTracking = true;
      // 修正：进入区间那一刻，重新锚定份额
      bench1Shares = initialCapital / today.nav1;
      bench2Shares = initialCapital / today.nav2;
      benchMarketShares = initialCapital / today.navBenchmark;
    }

    // 逻辑计算（无论是否在显示区间都要计算，以维持状态一致性）
    const s1 = getScore(i, momentumWindow, 'nav1');
    const s2 = getScore(i, momentumWindow, 'nav2');
    const ma1 = getMA(i, MA_WINDOW, 'nav1');
    const ma2 = getMA(i, MA_WINDOW, 'nav2');
    const pass1 = today.nav1 > ma1;
    const pass2 = today.nav2 > ma2;

    let target = 'CASH';
    const trendPass1 = !useMAFilter || (ma1 > 0 && pass1);
    const trendPass2 = !useMAFilter || (ma2 > 0 && pass2);

    if (s1 > 0 && trendPass1 && s2 > 0 && trendPass2) target = s1 > s2 ? code1 : code2;
    else if (s1 > 0 && trendPass1) target = code1;
    else if (s2 > 0 && trendPass2) target = code2;

    // 只有在区间内才进行资产统计和交易模拟
    if (isTracking) {
      const todaysInjections = injections.filter(inj => inj.date === today.date);
      for (const inj of todaysInjections) {
        totalInvested += inj.amount;
        if (currentHolding === 'CASH') currentCapital += inj.amount;
        else {
          const price = currentHolding === code1 ? today.nav1 : today.nav2;
          shares += inj.amount / price;
          trades.push({ date: today.date, asset: currentHolding, type: 'BUY', price, amount: inj.amount / price, totalAmount: inj.amount, cost: 0, reason: '定期追加' });
        }
        bench1Shares += inj.amount / today.nav1;
        bench2Shares += inj.amount / today.nav2;
        benchMarketShares += inj.amount / today.navBenchmark;
        cashValue += inj.amount;
      }

      if (currentHolding === 'CASH') currentCapital *= (1 + dailyCashRate);
      else currentCapital = shares * (currentHolding === code1 ? today.nav1 : today.nav2);
      
      cashValue *= (1 + dailyCashRate);

      dailyEquity.push({
        date: today.date,
        equity: currentCapital,
        benchmark1: bench1Shares * today.nav1,
        benchmark2: bench2Shares * today.nav2,
        benchmarkMarket: benchMarketShares * today.navBenchmark,
        benchmarkCash: cashValue,
        holding: currentHolding
      });

      if (pendingSwitchTo) {
        const buyPrice = pendingSwitchTo === code1 ? today.nav1 : today.nav2;
        shares = currentCapital / buyPrice;
        currentHolding = pendingSwitchTo;
        lastTradeIdx = i;
        trades.push({ date: today.date, asset: pendingSwitchTo, type: 'BUY', price: buyPrice, amount: shares, totalAmount: currentCapital, cost: 0, reason: `轮动买入` });
        pendingSwitchTo = null;
      } else if (target !== currentHolding) {
        const daysHeld = lastTradeIdx === -1 ? 999 : (i - lastTradeIdx);
        if (currentHolding === 'CASH' || daysHeld >= minHoldDays) {
          if (currentHolding !== 'CASH') {
            const sellPrice = currentHolding === code1 ? today.nav1 : today.nav2;
            const isPunish = daysHeld < 7;
            const feeRate = isPunish ? 0.015 : 0;
            const sellAmount = shares * sellPrice;
            const cost = sellAmount * feeRate;
            totalCosts += cost;
            currentCapital = sellAmount - cost;
            trades.push({ date: today.date, asset: currentHolding, type: 'SELL', price: sellPrice, amount: shares, totalAmount: sellAmount, cost, reason: isPunish ? `强制赎回(持仓${daysHeld}天,不足7天罚息)` : `轮动信号` });
            shares = 0;
            currentHolding = 'CASH';
          }
          if (target !== 'CASH') pendingSwitchTo = target;
        }
      }
    }
    
    // 更新实时信号
    if (i === allData.length - 1) {
      lastS1 = s1; lastS2 = s2; lastPass1 = pass1; lastPass2 = pass2; lastRec = target;
    }
  }

  // 最大回撤及持续天数计算
  let maxEquity = 0;
  let maxDD = 0;
  let maxDDDuration = 0;
  let currentDDBeginIdx = -1;

  for (let i = 0; i < dailyEquity.length; i++) {
    const e = dailyEquity[i].equity;
    if (e > maxEquity) {
      maxEquity = e;
      currentDDBeginIdx = -1;
    } else {
      if (currentDDBeginIdx === -1) currentDDBeginIdx = i - 1;
      const duration = i - currentDDBeginIdx;
      if (duration > maxDDDuration) maxDDDuration = duration;
      const dd = (maxEquity - e) / maxEquity;
      if (dd > maxDD) maxDD = dd;
    }
  }

  const totalReturn = (currentCapital - totalInvested) / totalInvested;
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / Math.max(0.1, dailyEquity.length / 252)) - 1;

  return {
    dailyEquity, trades, metrics: { 
      initialCapital, totalInvested, finalCapital: currentCapital, totalReturn, 
      maxDrawdown: maxDD, maxDrawdownDuration: maxDDDuration,
      tradeCount: trades.length, annualizedReturn, totalCosts 
    },
    codes: { code1, code2, codeBench: '000300' },
    lastSignal: {
      date: allData[allData.length-1].date, 
      score1: lastS1, score2: lastS2, passMA1: lastPass1, passMA2: lastPass2, recommendation: lastRec
    }
  };
};
