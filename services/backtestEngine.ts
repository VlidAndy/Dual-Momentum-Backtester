
import { FundData, BacktestResult, EquityPoint, Trade, CapitalInjection } from "../types";

/**
 * 专业级基金回测 engine v6.0 - 修正追加资金对标逻辑与回撤时间
 */
export const runBacktest = (
  data: FundData[], 
  code1: string, 
  code2: string, 
  momentumWindow: number = 20,
  slippageRate: number = 0.0,
  useAveraging: boolean = false,
  useMAFilter: boolean = false,
  initialCapital: number = 2000,
  minHoldDays: number = 7,
  injections: CapitalInjection[] = []
): BacktestResult => {
  const CASH_ANNUAL_RATE = 0.015; 
  const MA_WINDOW = 20; 
  
  let totalInvested = initialCapital;
  let currentCapital = initialCapital;
  let currentHolding: string = 'CASH';
  let shares = 0;
  let totalCosts = 0;
  let lastTradeIdx = -1; 
  
  // 核心修正：基准也需要按份额计算，以应对中途加仓
  let bench1Shares = initialCapital / data[0].nav1;
  let bench2Shares = initialCapital / data[0].nav2;
  let benchMarketShares = initialCapital / data[0].navBenchmark;
  let cashValue = initialCapital;

  let pendingSwitchTo: string | null = null;
  const dailyEquity: EquityPoint[] = [];
  const trades: Trade[] = [];
  
  const dailyCashRate = Math.pow(1 + CASH_ANNUAL_RATE, 1 / 252) - 1;

  const getScore = (currentIdx: number, baseN: number, navKey: 'nav1' | 'nav2'): number => {
    const getMom = (idx: number, win: number) => {
      if (idx < win) return -999;
      return (data[idx][navKey] - data[idx - win][navKey]) / data[idx - win][navKey];
    };
    if (!useAveraging) return getMom(currentIdx, baseN);
    const r1 = getMom(currentIdx, Math.max(2, Math.floor(baseN * 0.5)));
    const r2 = getMom(currentIdx, baseN);
    const r3 = getMom(currentIdx, Math.floor(baseN * 1.5));
    if (r1 === -999 || r2 === -999 || r3 === -999) return -999;
    return (r1 + r2 + r3) / 3;
  };

  const getMA = (currentIdx: number, window: number, navKey: 'nav1' | 'nav2'): number => {
    if (currentIdx < window - 1) return -1;
    let sum = 0;
    for (let j = 0; j < window; j++) sum += data[currentIdx - j][navKey];
    return sum / window;
  };

  let lastS1 = 0, lastS2 = 0, lastPass1 = false, lastPass2 = false, lastRec = 'CASH';

  for (let i = 0; i < data.length; i++) {
    const today = data[i];

    // 1. 处理资金追加 (Injection) - 策略与所有基准同步加仓
    const todaysInjections = injections.filter(inj => inj.date === today.date);
    for (const inj of todaysInjections) {
      totalInvested += inj.amount;
      
      // 策略加仓
      if (currentHolding === 'CASH') {
        currentCapital += inj.amount;
      } else {
        const price = currentHolding === code1 ? today.nav1 : today.nav2;
        const cost = inj.amount * slippageRate;
        const netAmount = inj.amount - cost;
        shares += netAmount / price;
        totalCosts += cost;
        trades.push({
          date: today.date,
          asset: currentHolding,
          type: 'BUY',
          price,
          amount: netAmount / price,
          totalAmount: inj.amount,
          cost,
          reason: '中途追加投入资金'
        });
      }

      // 基准加仓（对比必须公平，基准也要买入相同金额）
      bench1Shares += inj.amount / today.nav1;
      bench2Shares += inj.amount / today.nav2;
      benchMarketShares += inj.amount / today.navBenchmark;
      cashValue += inj.amount;
    }
    
    // 2. 更新每日资产价值
    if (currentHolding === 'CASH') {
      currentCapital *= (1 + dailyCashRate);
    } else {
      const price = currentHolding === code1 ? today.nav1 : today.nav2;
      currentCapital = shares * price;
    }

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

    // 3. 处理挂起的调仓买入
    if (pendingSwitchTo) {
      const buyPrice = pendingSwitchTo === code1 ? today.nav1 : today.nav2;
      const totalAmount = currentCapital;
      const cost = totalAmount * slippageRate;
      totalCosts += cost;
      currentCapital -= cost;
      shares = currentCapital / buyPrice;
      currentHolding = pendingSwitchTo;
      lastTradeIdx = i;
      trades.push({ date: today.date, asset: pendingSwitchTo, type: 'BUY', price: buyPrice, amount: shares, totalAmount, cost, reason: `轮动买入` });
      pendingSwitchTo = null;
      continue;
    }

    // 4. 计算信号 (略)
    if (i >= 20) {
      const s1 = getScore(i, momentumWindow, 'nav1');
      const s2 = getScore(i, momentumWindow, 'nav2');
      const ma1 = getMA(i, MA_WINDOW, 'nav1');
      const ma2 = getMA(i, MA_WINDOW, 'nav2');
      const pass1 = today.nav1 > ma1;
      const pass2 = today.nav2 > ma2;

      let target = 'CASH';
      const trendPass1 = !useMAFilter || pass1;
      const trendPass2 = !useMAFilter || pass2;

      if (s1 > 0 && trendPass1 && s2 > 0 && trendPass2) target = s1 > s2 ? code1 : code2;
      else if (s1 > 0 && trendPass1) target = code1;
      else if (s2 > 0 && trendPass2) target = code2;

      if (i === data.length - 1) {
        lastS1 = s1; lastS2 = s2; lastPass1 = pass1; lastPass2 = pass2; lastRec = target;
      }

      // 5. 执行调仓
      if (target !== currentHolding) {
        const daysHeld = i - lastTradeIdx;
        if (currentHolding === 'CASH' || daysHeld >= minHoldDays) {
          if (currentHolding !== 'CASH') {
            const sellPrice = currentHolding === code1 ? today.nav1 : today.nav2;
            const isShortTerm = daysHeld < 7;
            const feeRate = isShortTerm ? 0.015 : slippageRate;
            const sellAmount = shares * sellPrice;
            const cost = sellAmount * feeRate;
            totalCosts += cost;
            currentCapital = sellAmount - cost;
            trades.push({ date: today.date, asset: currentHolding, type: 'SELL', price: sellPrice, amount: shares, totalAmount: sellAmount, cost, reason: isShortTerm ? `惩罚性费率1.5%(持仓${daysHeld}天)` : `轮动赎回` });
            shares = 0;
            currentHolding = 'CASH';
          }
          if (target !== 'CASH') pendingSwitchTo = target;
        }
      }
    }
  }

  // 6. 统计指标修正
  let maxEquity = 0, maxDD = 0, maxDDDuration = 0;
  let peakDate = data[0].date;

  dailyEquity.forEach((p) => {
    if (p.equity > maxEquity) {
      maxEquity = p.equity;
      peakDate = p.date;
    }
    const dd = (maxEquity - p.equity) / (maxEquity || 1);
    if (dd > maxDD) maxDD = dd;
    
    // 回撤持续时间计算修正：使用日历天数
    if (p.equity < maxEquity) {
      const duration = Math.floor((new Date(p.date).getTime() - new Date(peakDate).getTime()) / (1000 * 3600 * 24));
      if (duration > maxDDDuration) maxDDDuration = duration;
    }
  });

  const totalReturn = (currentCapital - totalInvested) / totalInvested;
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / Math.max(0.1, data.length / 252)) - 1;

  return {
    dailyEquity, trades, metrics: { 
      initialCapital, totalInvested, finalCapital: currentCapital, totalReturn, 
      maxDrawdown: maxDD, maxDrawdownDuration: maxDDDuration,
      tradeCount: trades.length, annualizedReturn, totalCosts 
    },
    codes: { code1, code2, codeBench: '005918' },
    lastSignal: {
      date: data[data.length - 1].date, score1: lastS1, score2: lastS2, passMA1: lastPass1, passMA2: lastPass2, recommendation: lastRec
    }
  };
};
