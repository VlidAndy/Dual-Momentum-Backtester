
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { EquityPoint } from '../types';

interface Props {
  data: EquityPoint[];
  name1: string;
  name2: string;
}

const EquityChart: React.FC<Props> = ({ data, name1, name2 }) => {
  const formatCurrency = (value: number) => `¥${value.toFixed(0)}`;
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-[480px]">
      <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <i className="fa-solid fa-chart-line mr-2 text-indigo-600"></i>
          净值回测走势图 (多维对标)
        </div>
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            minTickGap={40}
            stroke="#94a3b8"
            fontSize={11}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11} 
            tickFormatter={formatCurrency}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }}/>
          <Line 
            name="双动量策略" 
            type="monotone" 
            dataKey="equity" 
            stroke="#4f46e5" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line 
            name="沪深300指数" 
            type="monotone" 
            dataKey="benchmarkMarket" 
            stroke="#10b981" 
            strokeWidth={1.5} 
            strokeDasharray="4 4"
            dot={false} 
            isAnimationActive={false}
          />
          <Line 
            name="货币基金 (1.5%年化)" 
            type="monotone" 
            dataKey="benchmarkCash" 
            stroke="#94a3b8" 
            strokeWidth={1.5} 
            strokeDasharray="2 2"
            dot={false} 
            isAnimationActive={false}
          />
          <Line 
            name={`标的A: ${name1}`} 
            type="monotone" 
            dataKey="benchmark1" 
            stroke="#ef4444" 
            strokeWidth={1} 
            opacity={0.4}
            dot={false} 
            isAnimationActive={false}
          />
          <Line 
            name={`标的B: ${name2}`} 
            type="monotone" 
            dataKey="benchmark2" 
            stroke="#f59e0b" 
            strokeWidth={1} 
            opacity={0.4}
            dot={false} 
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EquityChart;
