// src/features/macro/types.ts

export type MacroScenario = {
  id: string;
  name: string;
  shortRateShockBps: number;
  longRateShockBps: number;
  fxShockPct: number;
  createdAt?: string;
};

export type EconomicEvent = {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: "low" | "medium" | "high";
};

export type PortfolioPosition = {
  id: string;
  label: string;
  notional: number;
  assetType: "bond" | "fx";
};

export type MarketSnapshot = {
  id: string;
  asOf: string;
  shortRate: number;
  longRate: number;
  fxSpot: number;
};
