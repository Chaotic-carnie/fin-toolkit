// src/features/macro/store.ts
import { create } from 'zustand';
import { 
  calculateBondPnL, calculateFxPnL, calculateEquityPnL, calculateCreditPnL, calculateOptionPnL, calculateDiversificationBenefit,
  FixedIncomePosition, FxPosition, EquityPosition, CreditPosition, OptionPosition, MacroShocks, BaseData 
} from './engine';

export interface PortfolioPosition {
  id: string; name: string; type: string; bucket: string; 
  amount: number; duration: number; convexity?: number; beta?: number; spreadDuration?: number;
  delta?: number; gamma?: number; vega?: number; // Options fields
}

interface MacroStore {
  hydrated: boolean;
  baseData: BaseData;
  shocks: MacroShocks;
  
  fiPositions: FixedIncomePosition[];
  fxPositions: FxPosition[];
  eqPositions: EquityPosition[];
  crPositions: CreditPosition[];
  optPositions: OptionPosition[];
  
  totalPnl: number;
  diversificationBenefit: number;
  
  setBaseData: (data: Partial<BaseData>) => void;
  setShocks: (shocks: Partial<MacroShocks>) => void;
  setPortfolio: (positions: PortfolioPosition[]) => void;
}

// Helper to calc synchronously
const computeRisk = (state: any) => {
  const pnlBuckets: number[] = [0, 0, 0, 0, 0];
  state.fiPositions.forEach((p: any) => pnlBuckets[0] += calculateBondPnL(p, state.shocks).pnl);
  state.fxPositions.forEach((p: any) => pnlBuckets[1] += calculateFxPnL(p, state.shocks, state.baseData.usdinr, state.baseData.inr3m).pnl);
  state.eqPositions.forEach((p: any) => pnlBuckets[2] += calculateEquityPnL(p, state.shocks).pnl);
  state.crPositions.forEach((p: any) => pnlBuckets[3] += calculateCreditPnL(p, state.shocks).pnl);
  state.optPositions.forEach((p: any) => pnlBuckets[4] += calculateOptionPnL(p, state.shocks).pnl);

  return {
    totalPnl: pnlBuckets.reduce((a, b) => a + b, 0),
    diversificationBenefit: calculateDiversificationBenefit(pnlBuckets)
  };
};

export const useMacroStore = create<MacroStore>((set) => ({
  hydrated: false,
  baseData: { usdinr: 83.0, inr3m: 6.5, inr10y: 7.2 },
  shocks: { rate3mBps: 0, rate2yBps: 0, rate5yBps: 0, rate10yBps: 0, fxShockPct: 0, equityShockPct: 0, creditSpreadBps: 0, volShockPts: 0, horizonDays: 0 },
  
  fiPositions: [], fxPositions: [], eqPositions: [], crPositions: [], optPositions: [],
  totalPnl: 0, diversificationBenefit: 0,

  // Synchronous State Updates (No more setTimeout)
  setBaseData: (data) => set((s) => {
    const newState = { ...s, baseData: { ...s.baseData, ...data } };
    return { ...newState, ...computeRisk(newState) };
  }),
  
  setShocks: (newShocks) => set((s) => {
    const newState = { ...s, shocks: { ...s.shocks, ...newShocks } };
    return { ...newState, ...computeRisk(newState) };
  }),

  setPortfolio: (raw) => set((s) => {
    const newState = {
      ...s,
      hydrated: true,
      fiPositions: raw.filter(p => p.type === 'BOND').map(p => ({ id: p.id, label: p.name, notionalInr: Number(p.amount), modifiedDuration: Number(p.duration), convexity: Number(p.convexity || 0), bucket: (p.bucket as '3m'|'2y'|'5y'|'10y') || '10y' })),
      fxPositions: raw.filter(p => p.type === 'FX').map(p => ({ id: p.id, label: p.name, notionalUsd: Number(p.amount) })),
      eqPositions: raw.filter(p => p.type === 'EQUITY').map(p => ({ id: p.id, label: p.name, notionalInr: Number(p.amount), beta: Number(p.beta || 1) })),
      crPositions: raw.filter(p => p.type === 'CREDIT').map(p => ({ id: p.id, label: p.name, notionalInr: Number(p.amount), modifiedDuration: Number(p.duration), spreadDuration: Number(p.spreadDuration || p.duration), bucket: (p.bucket as '3m'|'2y'|'5y'|'10y') || '5y' })),
      optPositions: raw.filter(p => p.type === 'OPTION').map(p => ({ id: p.id, label: p.name, notionalInr: Number(p.amount), delta: Number(p.delta || 0), gamma: Number(p.gamma || 0), vega: Number(p.vega || 0) }))
    };
    return { ...newState, ...computeRisk(newState) };
  })
}));