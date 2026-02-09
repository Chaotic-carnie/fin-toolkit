import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PortfolioLegSchema, PortfolioState, StrategyGroupSchema } from "./schema";
import { z } from "zod";
import { 
  computePortfolioMetrics, 
  PortfolioMetrics, 
  PayoffPoint, 
  computePayoffCurve, 
  HeatmapData, 
  computeHeatmap 
} from "./engine";
import { PricingResult } from "@/features/pricing/schema";

// --- Types ---
type PortfolioLeg = z.infer<typeof PortfolioLegSchema>;
type StrategyGroup = z.infer<typeof StrategyGroupSchema>;

interface PortfolioStoreState extends PortfolioState {
  // Calculated Values
  metrics: PortfolioMetrics | null;
  legResults: Record<string, PricingResult>;
  payoffDiagram: PayoffPoint[];
  heatmap: HeatmapData | null;
  
  // NEW: Simulation State
  simulation: {
    daysPassed: number;
    volShock: number;
    priceShock: number;
  };

  // Actions
  addTrade: (leg: PortfolioLeg) => void;
  updateTrade: (id: string, updates: Partial<PortfolioLeg>) => void;
  removeTrade: (id: string) => void;
  
  // Strategy/Group Actions
  addStrategy: (name: string, legs: PortfolioLeg[], type?: string) => void;
  ungroupStrategy: (groupId: string) => void;
  
  // Simulation Actions
  setGlobalShock: (spot: number, vol: number) => void; // Legacy (can keep or remove)
  setSimulation: (updates: Partial<PortfolioStoreState['simulation']>) => void; // NEW
  refreshComputation: () => void;
  
  // Reset
  clearPortfolio: () => void;
}

// --- Initial State ---
const initialState: PortfolioState = {
  trades: [],
  groups: [],
  settings: {
    baseCurrency: "USD",
    globalSpotShock: 0,
    globalVolShock: 0,
  },
};

export const usePortfolioStore = create<PortfolioStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,
      metrics: null,
      legResults: {},
      payoffDiagram: [],
      heatmap: null,
      simulation: { daysPassed: 0, volShock: 0, priceShock: 0 },

      // --- Actions ---

      addTrade: (leg) => {
        set((state) => ({ trades: [...state.trades, leg] }));
        get().refreshComputation();
      },

      updateTrade: (id, updates) => {
        set((state) => ({
          trades: state.trades.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        get().refreshComputation();
      },

      removeTrade: (id) => {
        set((state) => ({
          trades: state.trades.filter((t) => t.id !== id),
          groups: state.groups.map(g => ({
            ...g,
            legs: g.legs.filter(lId => lId !== id)
          })).filter(g => g.legs.length > 0)
        }));
        get().refreshComputation();
      },

      addStrategy: (name, newLegs, type) => {
        const groupId = crypto.randomUUID();
        const taggedLegs = newLegs.map(l => ({ ...l, groupId }));
        const newGroup: StrategyGroup = {
          id: groupId,
          name,
          strategyType: type,
          legs: taggedLegs.map(l => l.id),
        };

        set((state) => ({
          trades: [...state.trades, ...taggedLegs],
          groups: [...state.groups, newGroup],
        }));
        get().refreshComputation();
      },

      ungroupStrategy: (groupId) => {
        set((state) => ({
            groups: state.groups.filter(g => g.id !== groupId),
            trades: state.trades.map(t => t.groupId === groupId ? { ...t, groupId: undefined } : t)
        }));
      },

      setGlobalShock: (spot, vol) => {
        set((state) => ({
            settings: { ...state.settings, globalSpotShock: spot, globalVolShock: vol }
        }));
        get().refreshComputation();
      },

      // NEW: Set Simulation
      setSimulation: (updates) => {
        set((state) => ({
            simulation: { ...state.simulation, ...updates }
        }));
        get().refreshComputation();
      },

      refreshComputation: () => {
        const state = get();
        if (state.trades.length === 0) {
            set({ metrics: null, legResults: {}, payoffDiagram: [], heatmap: null });
            return;
        }

        // 1. Compute Metrics (Snapshot of "Now" + Shocks)
        const { metrics, legResults } = computePortfolioMetrics(
            state.trades,
            state.simulation.priceShock,
            state.simulation.volShock,
            state.simulation.daysPassed
        );

        // 2. Compute Payoff Curve (Visualizer)
        const firstSpot = state.trades[0]?.params.spot || 100;
        const payoffDiagram = computePayoffCurve(
             state.trades, 
             firstSpot, 
             state.simulation.daysPassed,
             state.simulation.volShock 
        );

        // 3. Compute Heatmap (Matrix)
        const heatmap = computeHeatmap(
            state.trades, 
            firstSpot
        );
        
        // Normalize Heatmap: Show PnL Change relative to Current Total Value
        if (metrics && heatmap) {
             const currentTotalValue = metrics.totalValue;
             heatmap.grid = heatmap.grid.map(row => 
                row.map(cell => ({
                    ...cell,
                    pnl: cell.pnl - currentTotalValue 
                }))
             );
        }

        set({ metrics, legResults, payoffDiagram, heatmap });
      },

      clearPortfolio: () => {
        set({ ...initialState, metrics: null, legResults: {}, payoffDiagram: [], heatmap: null, simulation: { daysPassed: 0, volShock: 0, priceShock: 0 } });
      }
    }),
    {
      name: "portfolio-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trades: state.trades,
        groups: state.groups,
        settings: state.settings,
        simulation: state.simulation, // Persist simulation state too
      }),
      onRehydrateStorage: () => (state) => {
        state?.refreshComputation();
      },
    }
  )
);