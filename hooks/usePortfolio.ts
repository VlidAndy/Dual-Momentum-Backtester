
import { useState, useEffect, useMemo } from 'react';
import { RealOperation, FundData } from '../types';

export const usePortfolio = (realOps: RealOperation[], fundA: any, fundB: any, rawData: FundData[]) => {
  return useMemo(() => {
    const pos: Record<string, { amount: number, cost: number, lastBuyDate: string }> = {};
    let totalFees = 0;
    let realizedPL = 0;
    
    const sortedOps = [...realOps].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedOps.forEach(op => {
      if (!pos[op.code]) pos[op.code] = { amount: 0, cost: 0, lastBuyDate: op.date };
      
      if (op.type === 'BUY') {
        const currentTotalCostValue = pos[op.code].amount * pos[op.code].cost;
        const newBuyValue = op.amount * op.price;
        pos[op.code].amount += op.amount;
        pos[op.code].cost = (currentTotalCostValue + newBuyValue) / (pos[op.code].amount || 1);
        pos[op.code].lastBuyDate = op.date;
      } else {
        const d1 = new Date(pos[op.code].lastBuyDate);
        const d2 = new Date(op.date);
        const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
        const sellFeeRate = diffDays < 7 ? 0.015 : 0.0; 
        const grossProceeds = op.amount * op.price;
        const fee = grossProceeds * sellFeeRate;
        
        totalFees += fee;
        realizedPL += (grossProceeds - fee - op.amount * pos[op.code].cost);
        pos[op.code].amount -= op.amount;
      }
    });

    const activePositions = Object.entries(pos)
      .filter(([_, p]) => p.amount > 0.1)
      .map(([code, p]) => {
        const currentPrice = code === fundA.code ? rawData[rawData.length - 1]?.nav1 : rawData[rawData.length - 1]?.nav2;
        const profit = currentPrice ? (currentPrice - p.cost) * p.amount : 0;
        const profitPct = currentPrice ? (currentPrice / p.cost - 1) * 100 : 0;
        return {
          code,
          name: code === fundA.code ? fundA.name : fundB.name,
          amount: p.amount,
          cost: p.cost,
          profit,
          profitPct,
          lastBuyDate: p.lastBuyDate // 导出最后买入日期
        };
      });

    return { pos, totalFees, realizedPL, activePositions };
  }, [realOps, fundA, fundB, rawData]);
};
