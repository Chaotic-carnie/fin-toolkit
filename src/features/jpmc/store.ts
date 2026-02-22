import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type {
  BalanceSheetSnapshot,
  CategoryHaircutScenario,
  CategoryScenarioResult,
  HoldingsScenario,
  HoldingsScenarioResult,
  Sec13FReport,
} from "./types";

import {
  applyCategoryHaircuts,
  applyHoldingsScenario,
  computeTop10ConcentrationPct,
  sumHoldingsValueUsd,
  withHoldingsWeights,
} from "./engine";

// --- THE SUPER DEMO DATA (Injected if SEC API fails or returns empty) ---
const SUPER_DEMO_HOLDINGS = [
  { id: "h1", issuer: "MICROSOFT CORP", cusip: "59491810", classTitle: "COM", valueUsd: 145000000000 },
  { id: "h2", issuer: "APPLE INC", cusip: "03783310", classTitle: "COM", valueUsd: 120000000000 },
  { id: "h3", issuer: "NVIDIA CORP", cusip: "67066G10", classTitle: "COM", valueUsd: 95000000000 },
  { id: "h4", issuer: "SPDR S&P 500 ETF TR", cusip: "78462F10", classTitle: "TR UNIT", valueUsd: 85000000000 },
  { id: "h5", issuer: "AMAZON COM INC", cusip: "02313510", classTitle: "COM", valueUsd: 65000000000 },
  { id: "h6", issuer: "META PLATFORMS INC", cusip: "30303M10", classTitle: "CL A", valueUsd: 45000000000 },
  { id: "h7", issuer: "ALPHABET INC", cusip: "02079K30", classTitle: "CAP STK CL A", valueUsd: 40000000000 },
  { id: "h8", issuer: "BERKSHIRE HATHAWAY INC", cusip: "08467070", classTitle: "CL B NEW", valueUsd: 35000000000 },
  { id: "h9", issuer: "ELI LILLY & CO", cusip: "53245710", classTitle: "COM", valueUsd: 28000000000 },
  { id: "h10", issuer: "BROADCOM INC", cusip: "11135F10", classTitle: "COM", valueUsd: 25000000000 },
];

const SUPER_DEMO_BS: BalanceSheetSnapshot = {
  end: "2024-12-31",
  source: { companyFactsUrl: "https://www.sec.gov/edgar/browse/?CIK=19617" },
  categories: [
    { key: "Assets", label: "Total Assets", valueUsd: 3875000000000 },
    { key: "LoansReceivableNet", label: "Loans, Net of Allowance", valueUsd: 1315000000000 },
    { key: "TradingAssets", label: "Trading Assets", valueUsd: 550000000000 },
    { key: "AvailableForSaleSecuritiesDebtSecurities", label: "AFS Securities", valueUsd: 420000000000 },
    { key: "HeldToMaturitySecuritiesDebtSecurities", label: "HTM Securities", valueUsd: 380000000000 },
    { key: "CashAndCashEquivalentsAtCarryingValue", label: "Cash & Equivalents", valueUsd: 520000000000 },
  ]
};

function buildDemo13f(): Sec13FReport {
  const total = sumHoldingsValueUsd(SUPER_DEMO_HOLDINGS as any);
  const holdings = withHoldingsWeights(SUPER_DEMO_HOLDINGS as any, total);
  return {
    meta: { reportDate: "2024-Q4 (Demo)", filingDate: "2025-01-15", form: "13F-HR", infoTableUrl: "", secIndexJsonUrl: "", secSubmissionsUrl: "", cik: "19617", accessionNumber: "" },
    holdings,
    totals: {
      holdingsCount: holdings.length,
      returnedHoldingsCount: holdings.length,
      totalValueUsd: total,
      top10ConcentrationPct: computeTop10ConcentrationPct(holdings),
    },
  };
}
// ------------------------------------------------------------

type LoadingState = { holdings: boolean; balanceSheet: boolean; };

interface JpmcTrackerState {
  holdingsReport: Sec13FReport | null;
  balanceSheet: BalanceSheetSnapshot | null;
  loading: LoadingState;
  error: string | null;
  notice: string | null;
  holdingsSearch: string;
  holdingsMinValueUsd: number;
  holdingsScenario: HoldingsScenario;
  holdingsScenarioResult: HoldingsScenarioResult | null;
  categoryScenario: CategoryHaircutScenario;
  categoryScenarioResult: CategoryScenarioResult | null;

  fetchHoldings: () => Promise<void>;
  fetchBalanceSheet: () => Promise<void>;
  setHoldingsSearch: (v: string) => void;
  setHoldingsMinValueUsd: (v: number) => void;
  setHoldingsScenario: (scenario: HoldingsScenario) => void;
  setGlobalShockPct: (v: number) => void;
  setHoldingOverride: (holdingId: string, shockPct: number) => void;
  removeHoldingOverride: (holdingId: string) => void;
  clearOverrides: () => void;
  runHoldingsScenario: () => void;
  setCategoryHaircut: (key: string, haircutPct: number) => void;
  clearCategoryHaircuts: () => void;
  runCategoryScenario: () => void;
}

const defaultHoldingsScenario: HoldingsScenario = { name: "Global Shock", globalShockPct: -5, overrides: {} };
const defaultCategoryScenario: CategoryHaircutScenario = { name: "Balance Sheet Haircuts", haircuts: {} };

export const useJpmcTrackerStore = create<JpmcTrackerState>()(
  persist(
    (set, get) => ({
      holdingsReport: null,
      balanceSheet: null,
      loading: { holdings: false, balanceSheet: false },
      error: null,
      notice: null,
      holdingsSearch: "",
      holdingsMinValueUsd: 0,
      holdingsScenario: defaultHoldingsScenario,
      holdingsScenarioResult: null,
      categoryScenario: defaultCategoryScenario,
      categoryScenarioResult: null,

      fetchHoldings: async () => {
        try {
          set({ loading: { ...get().loading, holdings: true }, error: null, notice: null });
          const res = await fetch("/api/jpmc/13f", { method: "GET" });
          
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as Sec13FReport;

          // FIX: If the API succeeds but returns an empty array, THROW an error to trigger the demo fallback
          if (!data.holdings || data.holdings.length === 0) {
            throw new Error("SEC API returned empty holdings. Parsing failed or no data available.");
          }

          data.holdings = withHoldingsWeights(data.holdings, data.totals?.totalValueUsd);
          
          set({ holdingsReport: data });
          get().runHoldingsScenario();
        } catch (e) {
          console.warn("JPMC 13F fetch failed/empty; falling back to SUPER DEMO snapshot.", e);
          set({
            holdingsReport: buildDemo13f(),
            notice: "Live SEC 13F feed unavailable. Displaying High-Fidelity Demo Snapshot.",
            error: null,
          });
          get().runHoldingsScenario();
        } finally {
          set({ loading: { ...get().loading, holdings: false } });
        }
      },

      fetchBalanceSheet: async () => {
        try {
          set({ loading: { ...get().loading, balanceSheet: true }, error: null, notice: null });
          const res = await fetch("/api/jpmc/balance-sheet", { method: "GET" });
          
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as BalanceSheetSnapshot;
          
          // FIX: If the API returns an empty categories array, trigger the demo fallback
          if (!data.categories || data.categories.length === 0) {
            throw new Error("SEC API returned empty balance sheet categories.");
          }

          set({ balanceSheet: data });
          get().runCategoryScenario();
        } catch (e) {
          console.warn("JPMC balance sheet fetch failed/empty; falling back to SUPER DEMO.", e);
          set({
            balanceSheet: SUPER_DEMO_BS,
            notice: "Live SEC XBRL feed unavailable. Displaying Demo Balance Sheet.",
            error: null,
          });
          get().runCategoryScenario();
        } finally {
          set({ loading: { ...get().loading, balanceSheet: false } });
        }
      },

      setHoldingsSearch: (v) => set({ holdingsSearch: v }),
      setHoldingsMinValueUsd: (v) => set({ holdingsMinValueUsd: v }),

      setHoldingsScenario: (scenario) => {
        set({ holdingsScenario: scenario });
        get().runHoldingsScenario();
      },

      setGlobalShockPct: (v) => {
        set({ holdingsScenario: { ...get().holdingsScenario, globalShockPct: v } });
        get().runHoldingsScenario();
      },

      setHoldingOverride: (holdingId, shockPct) => {
        const scenario = get().holdingsScenario;
        set({ holdingsScenario: { ...scenario, overrides: { ...scenario.overrides, [holdingId]: shockPct } } });
        get().runHoldingsScenario();
      },

      removeHoldingOverride: (holdingId) => {
        const scenario = get().holdingsScenario;
        const next = { ...scenario.overrides };
        delete next[holdingId];
        set({ holdingsScenario: { ...scenario, overrides: next } });
        get().runHoldingsScenario();
      },

      clearOverrides: () => {
        const scenario = get().holdingsScenario;
        set({ holdingsScenario: { ...scenario, overrides: {} } });
        get().runHoldingsScenario();
      },

      runHoldingsScenario: () => {
        const report = get().holdingsReport;
        if (!report || report.holdings.length === 0) {
          set({ holdingsScenarioResult: null });
          return;
        }
        const result = applyHoldingsScenario(report.holdings, get().holdingsScenario);
        set({ holdingsScenarioResult: result });
      },

      setCategoryHaircut: (key, haircutPct) => {
        const scenario = get().categoryScenario;
        set({ categoryScenario: { ...scenario, haircuts: { ...scenario.haircuts, [key]: haircutPct } } });
        get().runCategoryScenario();
      },

      clearCategoryHaircuts: () => {
        set({ categoryScenario: { ...get().categoryScenario, haircuts: {} } });
        get().runCategoryScenario();
      },

      runCategoryScenario: () => {
        const bs = get().balanceSheet;
        if (!bs || bs.categories.length === 0) {
          set({ categoryScenarioResult: null });
          return;
        }
        const result = applyCategoryHaircuts(bs.categories, bs.end, get().categoryScenario);
        set({ categoryScenarioResult: result });
      },
    }),
    {
      // FIX: Cache Busting! I changed the name to -v2. 
      // This forces the browser to ignore the old empty data.
      name: "jpmc-tracker-storage-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state: any) => ({
        holdingsSearch: state.holdingsSearch,
        holdingsMinValueUsd: state.holdingsMinValueUsd,
        holdingsScenario: state.holdingsScenario,
        categoryScenario: state.categoryScenario,
      }),
    }
  )
);