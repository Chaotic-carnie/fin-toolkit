/**
 * JPMorgan Public Portfolio Tracker (Standalone Feature)
 * -----------------------------------------------------
 *
 * This feature is designed to be dropped into the Peeyush Labs Next.js codebase.
 * It focuses on what can be tracked from public disclosures:
 *  - SEC 13F holdings (security-level long positions disclosed quarterly)
 *  - SEC XBRL "companyfacts" balance-sheet style aggregates (category-level)
 *
 * NOTE: This is NOT JPMorgan's internal trading book.
 * It's a *public-disclosure* tracker useful for scenario/stress labs.
 */

export type Sec13FHolding = {
  /** Stable identifier for UI + scenario overrides */
  id: string;

  issuer: string;
  classTitle: string;
  cusip: string;

  /**
   * 13F 'value' is reported in *thousands of USD*.
   * We store as dollars for consistency across the app.
   */
  valueUsd: number;

  /** Shares / principal amount (if present) */
  shares?: number;
  shareType?: string;

  /** Some 13F rows have PUT/CALL for options */
  putCall?: "PUT" | "CALL" | null;

  investmentDiscretion?: string;

  votingSole?: number;
  votingShared?: number;
  votingNone?: number;

  /**
   * Convenience computed client-side.
   * Not required from server.
   */
  weightPct?: number;
};

export type Sec13FReportMeta = {
  cik: string;
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;

  /** Direct URL to the SEC "information table" file used */
  infoTableUrl: string;

  /** Where we found it (useful for debugging) */
  secIndexJsonUrl: string;
  secSubmissionsUrl: string;
};

export type Sec13FReport = {
  meta: Sec13FReportMeta;
  holdings: Sec13FHolding[];
  totals: {
    holdingsCount: number;
    totalValueUsd: number;
    top10ConcentrationPct: number;
  };
};

export type BalanceSheetCategory = {
  key: string;
  label: string;
  /** USD amount */
  valueUsd: number;
  /** YYYY-MM-DD (end date of the reported period) */
  end: string;
  /** e.g., 10-Q / 10-K */
  form?: string;
};

export type BalanceSheetSnapshot = {
  cik: string;
  end: string;
  categories: BalanceSheetCategory[];
  source: {
    companyFactsUrl: string;
  };
};

export type HoldingsScenario = {
  name: string;

  /** Applied to all holdings unless overridden below */
  globalShockPct: number;

  /** Per-holding override, in % */
  overrides: Record<string, number>;
};

export type ScenarioHoldingRow = {
  id: string;
  issuer: string;
  cusip: string;
  classTitle: string;

  baseValueUsd: number;
  weightPct: number;

  shockPct: number;
  shockedValueUsd: number;
  pnlUsd: number;
};

export type HoldingsScenarioResult = {
  scenario: HoldingsScenario;
  baseValueUsd: number;
  shockedValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  rows: ScenarioHoldingRow[];

  topPnlContributors: ScenarioHoldingRow[];
  worstPnlContributors: ScenarioHoldingRow[];
};

export type CategoryHaircutScenario = {
  name: string;
  /** Key -> haircut pct */
  haircuts: Record<string, number>;
};

export type CategoryScenarioRow = {
  key: string;
  label: string;
  baseValueUsd: number;
  haircutPct: number;
  shockedValueUsd: number;
  pnlUsd: number;
};

export type CategoryScenarioResult = {
  scenario: CategoryHaircutScenario;
  end: string;
  baseTotalUsd: number;
  shockedTotalUsd: number;
  pnlUsd: number;
  pnlPct: number;
  rows: CategoryScenarioRow[];
};


/**
 * Executive "fingerprint" metrics for a 13F holdings set.
 * These make the dashboard instantly readable (30-second scan).
 */
export type HoldingsAnalytics = {
  totalValueUsd: number;
  holdingsCount: number;

  top1: {
    issuer: string;
    cusip: string;
    classTitle: string;
    valueUsd: number;
    weightPct: number;
  } | null;

  top1WeightPct: number;
  top10ConcentrationPct: number;

  /** Herfindahl–Hirschman Index on weights (0..1). Lower => more diversified. */
  hhi: number;

  /** Effective positions ≈ 1 / HHI */
  effectivePositions: number;

  /** Heuristic mega-cap bucket share (see engine.ts keywords) */
  megaCapTechWeightPct: number;
};

export type HoldingsScenarioSummary = {
  baseValueUsd: number;
  shockedValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
};

export type HoldingsStressPresetKey =
  | "RISK_OFF"
  | "CRASH"
  | "TOP10_SQUEEZE"
  | "SINGLE_NAME"
  | "MEGACAP_TECH";

export type HoldingsStressPresetRow = {
  key: HoldingsStressPresetKey;
  label: string;
  description: string;
  scenario: HoldingsScenario;
  summary: HoldingsScenarioSummary;
};
