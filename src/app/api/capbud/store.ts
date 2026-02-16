import { create } from "zustand";
import { CapBudComputeResponse } from "@/app/api/docs/schemas";

interface CapBudState {
  // Core Form State
  projectName: string;
  currency: string;
  discountRate: number;
  convention: "end_of_period" | "mid_year";
  financeRate: number | null;
  reinvestRate: number | null;
  cashflows: number[];
  
  // WACC Helper State
  waccRe: number;
  waccRd: number;
  waccTax: number;
  waccWe: number;
  waccWd: number;
  computedWacc: number | null;

  // Output State
  result: CapBudComputeResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setField: <K extends keyof CapBudState>(field: K, value: CapBudState[K]) => void;
  updateCashflow: (index: number, value: number) => void;
  addYear: () => void;
  removeYear: () => void;
  calculateWacc: () => void;
  applyWaccToDiscount: () => void;
  loadSample: () => void;
  clearResults: () => void;
}

export const useCapBudStore = create<CapBudState>((set, get) => ({
  projectName: "Expansion Project",
  currency: "USD",
  discountRate: 0.1,
  convention: "end_of_period",
  financeRate: null,
  reinvestRate: null,
  cashflows: [-1000, 300, 300, 300, 300, 300],

  waccRe: 0.12,
  waccRd: 0.06,
  waccTax: 0.25,
  waccWe: 0.6,
  waccWd: 0.4,
  computedWacc: null,

  result: null,
  isLoading: false,
  error: null,

  setField: (field, value) => set({ [field]: value }),

  updateCashflow: (index, value) =>
    set((state) => {
      const newCfs = [...state.cashflows];
      newCfs[index] = value;
      return { cashflows: newCfs };
    }),

  addYear: () => set((state) => ({ cashflows: [...state.cashflows, 0] })),

  removeYear: () =>
    set((state) => {
      if (state.cashflows.length <= 2) return state;
      return { cashflows: state.cashflows.slice(0, -1) };
    }),

  calculateWacc: () => {
    const { waccRe, waccRd, waccTax, waccWe, waccWd } = get();
    let we = waccWe;
    let wd = waccWd;
    const sum = we + wd;
    if (sum <= 0) return;
    if (Math.abs(sum - 1) > 1e-6) {
      we = we / sum;
      wd = wd / sum;
    }
    const wacc = we * waccRe + wd * waccRd * (1 - waccTax);
    set({ computedWacc: wacc });
  },

  applyWaccToDiscount: () => {
    const { computedWacc } = get();
    if (computedWacc !== null) {
      // Clean to 4 decimal places for sanity
      set({ discountRate: Number(computedWacc.toFixed(4)) });
    }
  },

  loadSample: () =>
    set({
      projectName: "Expansion Project",
      discountRate: 0.1,
      convention: "end_of_period",
      financeRate: null,
      reinvestRate: null,
      cashflows: [-1000, 300, 300, 300, 300, 300],
      result: null,
      error: null,
    }),

  clearResults: () => set({ result: null, error: null }),
}));