// src/features/strategy/types.ts
import type { PortfolioLeg } from "~/features/portfolio/schema";
import type { Greeks } from "~/features/pricing/types";

export type StrategyKey = 
  | "bull_call_spread" | "bear_put_spread" 
  | "straddle" | "strangle" 
  | "butterfly_call" | "calendar_call";

export interface StrategyMarket {
  spot: number;
  vol: number;
  rate: number;
  dividend: number;
  skew?: number;
}

export interface StrategyView {
  direction: "bullish" | "bearish" | "neutral";
  movePct: number;
  horizonDays: number;
  volView: "up" | "down" | "flat";
  volShift: number;
  event: boolean;
}

export interface StrategyCandidate {
  candidateId: string;
  strategyKey: string;
  name: string;
  fitScore: number;
  rationale: string;
  tags: string[];
  legs: PortfolioLeg[];
  netPremium: number;
  maxProfit: number | null;
  maxLoss: number | null;
  breakevens: number[];
  totalGreeks: Greeks;
  strategyNote?: string;
}

export interface StrategyGeneration {
  strikeStep: number;
  widthPct: number | null;
  expiryDays: number;
  longExpiryDays: number;
  treeSteps: number;
}