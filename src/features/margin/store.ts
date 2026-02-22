import { create } from "zustand";
import { MarginComputeResponse, MarginLeg } from "@/app/api/docs/schemas";
import { persist } from "zustand/middleware";

interface MarginState {
  // Inputs
  spotPrice: number;
  legs: MarginLeg[];

  // Output State
  result: MarginComputeResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setField: <K extends keyof MarginState>(field: K, value: MarginState[K]) => void; // <-- Added this
  setSpotPrice: (price: number) => void;
  addLeg: () => void;
  updateLeg: (index: number, field: keyof MarginLeg, value: any) => void;
  removeLeg: (index: number) => void;
  loadSample: () => void;
  clearResults: () => void;
}

export const useMarginStore = create<MarginState>()(
  persist(
    (set) => ({
      spotPrice: 450.00,
      legs: [
        { type: "put", action: "sell", quantity: 1, strike: 400, premium: 2.50 }
      ],
      result: null,
      isLoading: false,
      error: null,

      setField: (field, value) => set({ [field]: value }),
      setSpotPrice: (price) => set({ spotPrice: price }),

      addLeg: () => set((state) => ({
        legs: [...state.legs, { type: "call", action: "sell", quantity: 1, strike: state.spotPrice + 10, premium: 1.00 }]
      })),

      updateLeg: (index, field, value) => set((state) => {
        const newLegs = [...state.legs];
        newLegs[index] = { ...newLegs[index], [field]: value };
        return { legs: newLegs };
      }),

      removeLeg: (index) => set((state) => ({
        legs: state.legs.filter((_, i) => i !== index)
      })),

      loadSample: () => set({
        spotPrice: 450.00,
        legs: [
          { type: "put", action: "sell", quantity: 5, strike: 420, premium: 3.20 },
          { type: "call", action: "sell", quantity: 5, strike: 480, premium: 2.80 }
        ],
        result: null,
        error: null,
      }),

      clearResults: () => set({ result: null, error: null, legs: [] })
    }),
    {
      name: "peeyush-margin-storage", // <-- Unique name for localStorage key
      partialize: (state) => ({ 
        spotPrice: state.spotPrice, 
        legs: state.legs 
      }), // ONLY save inputs, don't save the loading state or old results!
    }
  )
);