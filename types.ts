
export interface FundData {
  date: string;
  nav1: number;
  nav2: number;
  navBenchmark: number; 
}

export interface CapitalInjection {
  id: string;
  date: string;
  amount: number;
}

export interface RealOperation {
  id: string;
  date: string;
  code: string;
  name: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  note?: string;
}

export interface BacktestResult {
  dailyEquity: EquityPoint[];
  trades: Trade[];
  metrics: BacktestMetrics;
  codes: {
    code1: string;
    code2: string;
    codeBench: string;
  };
  lastSignal?: {
    date: string;
    score1: number;
    score2: number;
    passMA1: boolean;
    passMA2: boolean;
    recommendation: string;
    // 新增元数据
    meta?: {
      lastDate1: string;
      lastDate2: string;
      isSynced: boolean;
    };
  };
}

export interface EquityPoint {
  date: string;
  equity: number;
  benchmark1: number; 
  benchmark2: number; 
  benchmarkMarket: number; 
  benchmarkCash: number; 
  holding: string;
}

export interface Trade {
  date: string;
  asset: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  totalAmount: number; 
  cost: number;        
  reason: string;
}

export interface BacktestMetrics {
  initialCapital: number;
  totalInvested: number; 
  finalCapital: number;
  totalReturn: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  tradeCount: number;
  annualizedReturn: number;
  totalCosts: number;
}
