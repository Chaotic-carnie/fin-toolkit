import { create } from 'zustand';
import { calculateBondPnL, calculateFxPnL, FixedIncomePosition, FxPosition, MacroShocks } from './engine';

// --- Types ---
export interface BaseData {
  usdinr: number;
  inr3m: number;
  inr10y: number;
}

export interface PortfolioPosition {
  id: string;
  name: string;
  type: string; // 'BOND' | 'FX'
  bucket: string; // 'short' | 'long'
  amount: number; // Decimal in Prisma, number here
  duration: number;
}

interface MacroStore {
  hydrated: boolean;
  baseData: BaseData;
  shocks: MacroShocks;
  
  fiPositions: FixedIncomePosition[];
  fxPositions: FxPosition[];
  
  totalPnl: number;
  
  // Actions matching your Client
  setBaseData: (data: Partial<BaseData>) => void;
  setShocks: (shocks: Partial<MacroShocks>) => void;
  setPortfolio: (positions: PortfolioPosition[]) => void;
  calculateRisk: () => void; // Exposed for manual trigger
  
}

export const useMacroStore = create<MacroStore>((set, get) => ({
  hydrated: false,
  
  baseData: { usdinr: 83.0, inr3m: 6.5, inr10y: 7.2 },
  
  shocks: {
    shortRateBps: 0,
    longRateBps: 0,
    fxShockPct: 0,
    fundingRatePct: 6.5,
    horizonDays: 0,
  },

  fiPositions: [],
  fxPositions: [],
  totalPnl: 0,

  setBaseData: (data) => set((state) => ({ 
    baseData: { ...state.baseData, ...data } 
  })),

  setShocks: (newShocks) => {
    set((state) => ({ shocks: { ...state.shocks, ...newShocks } }));
    get().calculateRisk(); // Auto-calc on shock change
  },

  setPortfolio: (rawPositions) => {
    const fi: FixedIncomePosition[] = rawPositions
      .filter(p => p.type === 'BOND')
      .map(p => ({
        id: p.id,
        label: p.name,
        notionalInr: Number(p.amount),
        modifiedDuration: Number(p.duration),
        convexity: Number(p.convexity || 0), // Map from Prisma decimal to number
        bucket: (p.bucket as 'short' | 'long') || 'long'
      }));

    const fx: FxPosition[] = rawPositions
      .filter(p => p.type === 'FX')
      .map(p => ({
        id: p.id,
        label: p.name,
        notionalUsd: Number(p.amount),
      }));

    set({ fiPositions: fi, fxPositions: fx, hydrated: true });
    get().calculateRisk(); // Auto-calc on portfolio load
  },

  calculateRisk: () => {
    const { fiPositions, fxPositions, shocks, baseData } = get();
    let total = 0;

    // Bond PnL
    fiPositions.forEach(p => {
      const shockBps = p.bucket === 'short' ? shocks.shortRateBps : shocks.longRateBps;
      total += calculateBondPnL(p, shockBps).pnl;
    });

    // FX PnL
    fxPositions.forEach(p => {
      total += calculateFxPnL(p, shocks, baseData.usdinr, baseData.inr3m).pnl;
    });

    set({ totalPnl: total });
  }
}));