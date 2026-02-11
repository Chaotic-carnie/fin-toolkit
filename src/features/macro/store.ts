import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MacroShockState = {
  shortRateBps: number;
  longRateBps: number;
  fxShockPct: number;
  horizonDays: number;
};

export type MacroPosition = {
  id: string;
  label: string;
  notional: number;
  bucket: 'short' | 'long';
  duration: number;
  convexity: number;
};

export type FxPosition = {
  id: string;
  label: string;
  notional: number;
  pair: string;
  direction: 'long' | 'short';
};

interface MacroStore {
  hydrated: boolean; // Tracks if store is ready
  setHydrated: (state: boolean) => void;

  shocks: MacroShockState;
  setShocks: (s: Partial<MacroShockState>) => void;
  
  baseData: {
    usdinr: number;
    inr3m: number;
    inr10y: number;
  };
  setBaseData: (d: { usdinr: number; inr3m: number; inr10y: number }) => void;

  fiPositions: MacroPosition[];
  fxPositions: FxPosition[];
  setPortfolio: (dbPositions: any[]) => void;

  totalPnl: number;
  calculateRisk: () => void;
  clearPortfolio: () => void; // New Action
}

export const useMacroStore = create<MacroStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: (state) => set({ hydrated: state }),

      shocks: {
        shortRateBps: 0,
        longRateBps: 0,
        fxShockPct: 0,
        horizonDays: 30,
      },

      baseData: {
        usdinr: 83.5,
        inr3m: 6.8,
        inr10y: 7.1,
      },

      fiPositions: [],
      fxPositions: [],
      totalPnl: 0,

      setShocks: (newShocks) => {
        set((state) => ({ shocks: { ...state.shocks, ...newShocks } }));
        get().calculateRisk();
      },

      setBaseData: (data) => {
        if (!data.usdinr) return;
        set({ baseData: data });
        get().calculateRisk();
      },

      setPortfolio: (dbPositions) => {
        const fiPositions = dbPositions
          .filter((p: any) => p.type === "BOND")
          .map((p: any) => ({
            id: p.id,
            label: p.name,
            notional: Number(p.amount) || 0,
            bucket: p.bucket,
            duration: Number(p.duration) || 0,
            convexity: 0,
          }));

        const fxPositions = dbPositions
          .filter((p: any) => p.type === "FX")
          .map((p: any) => ({
            id: p.id,
            label: p.name,
            notional: Number(p.amount) || 0,
            pair: "USD/INR",
            direction: (Number(p.amount) || 0) >= 0 ? "long" : "short",
          }));

        set({ fiPositions, fxPositions });
        get().calculateRisk();
      },

      clearPortfolio: () => {
        set({ fiPositions: [], fxPositions: [], totalPnl: 0 });
      },

      calculateRisk: () => {
        const { baseData, fiPositions, fxPositions, shocks } = get();

        if (!baseData || !baseData.usdinr || !baseData.inr10y) {
          console.warn("Market data not ready. Skipping calculation.");
          return;
        }

        let total = 0;

        fiPositions.forEach((pos) => {
          const shockBps =
            (pos.bucket === "short"
              ? shocks.shortRateBps
              : shocks.longRateBps) || 0;

          const rateChange = shockBps / 10000;

          const val =
            -1 * (pos.notional || 0) * (pos.duration || 0) * rateChange;

          if (!isNaN(val)) total += val;
        });

        fxPositions.forEach((pos) => {
          const shockDec = (shocks.fxShockPct || 0) / 100;
          const val = (pos.notional || 0) * shockDec;
          if (!isNaN(val)) total += val;
        });

        set({ totalPnl: isNaN(total) ? 0 : total });
      },
    }),
    {
      name: "macro-store",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);