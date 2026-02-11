import { v4 as uuidv4 } from 'uuid';

// --- Types ---

export type RateBucket = 'short' | 'long';

export interface FixedIncomePosition {
  id: string;
  label: string;
  notionalInr: number;
  modifiedDuration: number;
  convexity: number;
  bucket: RateBucket;
}

export interface FxPosition {
  id: string;
  label: string;
  notionalUsd: number; // +Long USD / -Short USD
}

export interface MacroShocks {
  shortRateBps: number;
  longRateBps: number;
  fxShockPct: number; // e.g. 5.0 = 5% devaluation of INR (USD goes UP)
  fundingRatePct: number; // For carry calculation
  horizonDays: number;
}

export interface PnLResult {
  assetId: string;
  pnl: number;
  details: Record<string, number | string>;
}

// --- Math Core ---

/**
 * Calculates Bond Price Change using Duration + Convexity approximation.
 * ΔP/P ≈ -D * Δy + 0.5 * C * (Δy)^2
 */
export const calculateBondPnL = (
  pos: FixedIncomePosition, 
  shockBps: number
): PnLResult => {
  const dy = shockBps / 10000; // Convert bps to decimal
  const pctChange = (-pos.modifiedDuration * dy) + (0.5 * pos.convexity * (dy ** 2));
  const pnl = pos.notionalInr * pctChange;

  return {
    assetId: pos.id,
    pnl,
    details: {
      shockBps,
      pctChange: pctChange * 100,
      dv01: pos.notionalInr * pos.modifiedDuration * 0.0001,
    }
  };
};

/**
 * Calculates FX PnL including Spot Move + Carry Proxy.
 * Total = Spot PnL + (Domestic Rate - Funding Rate) * Time
 */
export const calculateFxPnL = (
  pos: FxPosition,
  shocks: MacroShocks,
  baseUsdInr: number,
  base3mRate: number // Current 3M Domestic Rate
): PnLResult => {
  // 1. Spot PnL
  const spotShock = shocks.fxShockPct / 100;
  const newSpot = baseUsdInr * (1 + spotShock);
  const spotPnl = pos.notionalUsd * (newSpot - baseUsdInr);

  // 2. Carry PnL
  // We assume the Short Rate shock affects the domestic yield immediately
  const domesticRate = base3mRate + (shocks.shortRateBps / 100); 
  const spread = (domesticRate - shocks.fundingRatePct) / 100;
  const t = shocks.horizonDays / 365;
  
  // Carry is earned on the Notional in INR terms
  // (Simplified proxy: usually carry is on the swap points, but this is a good approximation)
  const carryPnl = (pos.notionalUsd * baseUsdInr) * spread * t;

  return {
    assetId: pos.id,
    pnl: spotPnl + carryPnl,
    details: {
      spotPnl,
      carryPnl,
      newSpot,
      effectiveDomesticRate: domesticRate
    }
  };
};

/**
 * The "Grid" Generator
 * Vectorized calculation for heatmaps.
 */
export const generateRiskGrid = (
  fiPositions: FixedIncomePosition[],
  fxPositions: FxPosition[],
  baseUsdInr: number,
  base3mRate: number,
  xShocks: number[], // e.g. FX Shocks
  yShocks: number[]  // e.g. Rate Shocks
) => {
  return yShocks.map(y => {
    return xShocks.map(x => {
      // Create a temporary shock object for this cell
      const cellShocks: MacroShocks = {
        shortRateBps: y, // Assuming Y axis is rates
        longRateBps: y,
        fxShockPct: x,   // Assuming X axis is FX
        fundingRatePct: 0, 
        horizonDays: 0 // Instantaneous shock for grids
      };

      let totalPnl = 0;
      fiPositions.forEach(p => totalPnl += calculateBondPnL(p, y).pnl);
      fxPositions.forEach(p => totalPnl += calculateFxPnL(p, cellShocks, baseUsdInr, base3mRate).pnl);
      
      return totalPnl;
    });
  });
};