import { create } from 'zustand';
import { PortfolioLeg } from '../portfolio/schema';
import { computePortfolioMetrics } from '../portfolio/engine';
import { calculateDeltaHedge } from './engine';

interface StrategyBuilderState {
  draftLegs: PortfolioLeg[];
  metrics: any | null;
  setDraftLegs: (legs: PortfolioLeg[]) => void;
  updateLegStrike: (id: string, newStrike: number) => void;
  applyDeltaHedge: (spot: number) => void;
}

export const useStrategyBuilderStore = create<StrategyBuilderState>((set, get) => ({
  draftLegs: [],
  metrics: null,

  setDraftLegs: (legs) => {
    const { metrics } = computePortfolioMetrics(legs, 0, 0, 0);
    set({ draftLegs: legs, metrics });
  },

  updateLegStrike: (id, newStrike) => {
    const updated = get().draftLegs.map(l => 
      l.id === id ? { ...l, params: { ...l.params, strike: newStrike } } : l
    );
    const { metrics } = computePortfolioMetrics(updated, 0, 0, 0);
    set({ draftLegs: updated, metrics });
  },

  applyDeltaHedge: (spot) => {
    const currentDelta = get().metrics?.netGreeks?.delta || 0;
    if (Math.abs(currentDelta) < 0.001) return;

    const hedge = calculateDeltaHedge(currentDelta, spot);
    const newLegs = [...get().draftLegs, hedge];
    const { metrics } = computePortfolioMetrics(newLegs, 0, 0, 0);
    set({ draftLegs: newLegs, metrics });
  }
}));