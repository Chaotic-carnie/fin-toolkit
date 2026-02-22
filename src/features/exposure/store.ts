import { create } from "zustand";
import { ExposureComputeResponse, ExposureLeg } from "@/app/api/docs/schemas";

interface ExposureState {
  benchmarkName: string;
  benchmarkPrice: number;
  legs: ExposureLeg[];
  result: ExposureComputeResponse | null;
  isLoading: boolean;
  error: string | null;

  setField: <K extends keyof ExposureState>(field: K, value: ExposureState[K]) => void;
  addLeg: () => void;
  updateLeg: (index: number, field: keyof ExposureLeg, value: any) => void;
  removeLeg: (index: number) => void;
  loadSample: () => void;
  clearResults: () => void;
}

export const useExposureStore = create<ExposureState>((set) => ({
  benchmarkName: "SPY",
  benchmarkPrice: 500.00,
  legs: [
    { symbol: "TSLA", asset_type: "option", quantity: 5, delta: 0.45, spot_price: 200, beta: 2.1 }
  ],
  result: null,
  isLoading: false,
  error: null,

  setField: (field, value) => set({ [field]: value }),

  addLeg: () => set((state) => ({
    legs: [...state.legs, { symbol: "AAPL", asset_type: "stock", quantity: 100, delta: 1.0, spot_price: 180, beta: 1.2 }]
  })),

  updateLeg: (index, field, value) => set((state) => {
    const newLegs = [...state.legs];
    newLegs[index] = { ...newLegs[index], [field]: value };
    return { legs: newLegs };
  }),

  removeLeg: (index) => set((state) => ({ legs: state.legs.filter((_, i) => i !== index) })),

  loadSample: () => set({
    benchmarkName: "SPY",
    benchmarkPrice: 500.00,
    legs: [
      { symbol: "TSLA", asset_type: "option", quantity: 10, delta: 0.50, spot_price: 200, beta: 2.1 }, // Long TSLA Calls
      { symbol: "NVDA", asset_type: "stock", quantity: -200, delta: 1.0, spot_price: 800, beta: 1.8 }, // Short NVDA Shares
      { symbol: "JNJ", asset_type: "option", quantity: -50, delta: -0.30, spot_price: 150, beta: 0.6 } // Short JNJ Puts (Long Delta)
    ],
    result: null,
    error: null,
  }),

  clearResults: () => set({ result: null, error: null, legs: [] })
}));