// src/features/macro/engine.ts
import { v4 as uuidv4 } from 'uuid';

export type RateBucket = '3m' | '2y' | '5y' | '10y';

// --- Position Types ---
export interface FixedIncomePosition {
  id: string; label: string; notionalInr: number; modifiedDuration: number; convexity: number; bucket: RateBucket;
}
export interface FxPosition {
  id: string; label: string; notionalUsd: number;
}
export interface EquityPosition {
  id: string; label: string; notionalInr: number; beta: number; 
}
export interface CreditPosition {
  id: string; label: string; notionalInr: number; modifiedDuration: number; spreadDuration: number; bucket: RateBucket;
}
export interface OptionPosition {
  id: string; label: string; notionalInr: number; delta: number; gamma: number; vega: number;
}

export interface MacroShocks {
  rate3mBps: number;
  rate2yBps: number;
  rate5yBps: number;
  rate10yBps: number;
  fxShockPct: number; 
  equityShockPct: number;  
  creditSpreadBps: number; 
  volShockPts: number; // NEW: Volatility (VIX) shock in absolute points
  horizonDays: number;
}

export interface PnLResult { assetId: string; pnl: number; }

// --- Math Core ---

export const calculateBondPnL = (pos: FixedIncomePosition, shocks: MacroShocks): PnLResult => {
  // Map bucket to specific curve point shock
  const shockMap = { '3m': shocks.rate3mBps, '2y': shocks.rate2yBps, '5y': shocks.rate5yBps, '10y': shocks.rate10yBps };
  const dy = (shockMap[pos.bucket] || shocks.rate10yBps) / 10000;
  
  const pctChange = (-pos.modifiedDuration * dy) + (0.5 * pos.convexity * (dy ** 2));
  return { assetId: pos.id, pnl: pos.notionalInr * pctChange };
};

export const calculateFxPnL = (pos: FxPosition, shocks: MacroShocks, baseUsdInr: number, base3mRate: number): PnLResult => {
  const newSpot = baseUsdInr * (1 + (shocks.fxShockPct / 100));
  const spotPnl = pos.notionalUsd * (newSpot - baseUsdInr);
  
  const domesticRate = base3mRate + (shocks.rate3mBps / 100); 
  const spread = (domesticRate - 5.0 /* USD Funding Proxy */) / 100;
  const carryPnl = (pos.notionalUsd * baseUsdInr) * spread * (shocks.horizonDays / 365);
  
  return { assetId: pos.id, pnl: spotPnl + carryPnl };
};

export const calculateEquityPnL = (pos: EquityPosition, shocks: MacroShocks): PnLResult => {
  const pctChange = pos.beta * (shocks.equityShockPct / 100);
  return { assetId: pos.id, pnl: pos.notionalInr * pctChange };
};

export const calculateCreditPnL = (pos: CreditPosition, shocks: MacroShocks): PnLResult => {
  const shockMap = { '3m': shocks.rate3mBps, '2y': shocks.rate2yBps, '5y': shocks.rate5yBps, '10y': shocks.rate10yBps };
  const rateDy = (shockMap[pos.bucket] || shocks.rate10yBps) / 10000;
  const spreadDy = shocks.creditSpreadBps / 10000;
  
  const rateLoss = -pos.modifiedDuration * rateDy;
  const spreadLoss = -pos.spreadDuration * spreadDy;
  return { assetId: pos.id, pnl: pos.notionalInr * (rateLoss + spreadLoss) };
};

// NEW: Non-Linear Pricing (Delta-Gamma-Vega)
export const calculateOptionPnL = (pos: OptionPosition, shocks: MacroShocks): PnLResult => {
  const underlyingPctMove = shocks.equityShockPct / 100; // Assuming equity options for now
  
  const deltaPnL = pos.delta * underlyingPctMove;
  const gammaPnL = 0.5 * pos.gamma * (underlyingPctMove ** 2);
  const vegaPnL = pos.vega * shocks.volShockPts; // Vega is usually PnL per 1pt implied vol move
  
  const pctChange = deltaPnL + gammaPnL + vegaPnL;
  return { assetId: pos.id, pnl: pos.notionalInr * pctChange };
};

export const calculateDiversificationBenefit = (directionalPnLs: number[]): number => {
  const grossSum = directionalPnLs.reduce((acc, val) => acc + Math.abs(val), 0);
  const netSum = Math.abs(directionalPnLs.reduce((acc, val) => acc + val, 0));
  return grossSum - netSum; 
};