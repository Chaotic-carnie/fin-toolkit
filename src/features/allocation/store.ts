import { create } from "zustand";
import { AllocationComputeResponse } from "@/app/api/docs/schemas";

interface AllocationState {
  // Inputs
  winRate: number;        // e.g., 0.55 (55%)
  payoffRatio: number;    // e.g., 1.5 (Risk $1 to make $1.50)
  startingCapital: number;
  ruinDrawdownPct: number;// e.g., 0.20 (20% drawdown = ruin)
  simRuns: number;
  simTrades: number;

  // Output State
  result: AllocationComputeResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setField: <K extends keyof AllocationState>(field: K, value: AllocationState[K]) => void;
  loadSample: () => void;
  clearResults: () => void;
}

export const useAllocationStore = create<AllocationState>((set) => ({
  winRate: 0.55,
  payoffRatio: 1.2,
  startingCapital: 100000,
  ruinDrawdownPct: 0.20,
  simRuns: 1000,
  simTrades: 100,

  result: null,
  isLoading: false,
  error: null,

  setField: (field, value) => set({ [field]: value }),

  loadSample: () => set({
    winRate: 0.55,
    payoffRatio: 1.5,
    startingCapital: 100000,
    ruinDrawdownPct: 0.25,
    simRuns: 1000,
    simTrades: 100,
    result: null,
    error: null,
  }),

  clearResults: () => set({ result: null, error: null })
}));