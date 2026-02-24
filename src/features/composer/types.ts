// src/features/composer/types.ts
// -----------------------------------------------------------------------------
// Portfolio Composer (Payoff Compiler)
// -----------------------------------------------------------------------------
// This module adds a *drop-in* portfolio structuring workbench that can:
//   1) Compile an arbitrary terminal payoff into a static options portfolio
//      using a discrete version of the call-replication identity.
//   2) Optionally nudge the portfolio to match qualitative Greek behavior
//      (delta/gamma/vega/theta) using a greedy "adjustment blocks" library.
//   3) Provide a strategy-first template builder (spreads, butterflies, calendars)
//      and an exotic leg builder (barrier/asian/american + synthetic exotics).
//
// The code is intentionally "module-local" (no global store changes required).
// You can render <PortfolioComposer /> anywhere, or use the /composer route.

export type OptionType = "call" | "put";
export type BarrierType = "up-in" | "up-out" | "down-in" | "down-out";

// The existing site already supports several instruments in the central pricer.
// We extend the leg universe locally (composer-only) to include a few extra
// exotics via Monte Carlo (chooser / compound / lookback / shout).
export type ComposerInstrument =
  | "cash" // constant payoff (composer-only)
  | "forward" // prepaid forward (composer-only, but maps to pricer forward)
  | "vanilla"
  | "digital" // cash-or-nothing
  | "binary_asset" // asset-or-nothing (composer-only analytic)
  | "barrier"
  | "american"
  | "asian"
  | "gap" // two-strike gap option (analytic)
  | "chooser" // Monte Carlo
  | "compound" // Monte Carlo (option-on-option)
  | "lookback" // Monte Carlo
  | "shout"; // Monte Carlo

export type GreekKey = "delta" | "gamma" | "vega" | "theta" | "rho" | "vanna" | "volga";

export type ComposerGreeks = Record<GreekKey, number>;

export type PricingResult = {
  price: number;
  greeks: ComposerGreeks;
};

export type MarketState = {
  asset: string;
  spot: number;
  vol: number; // decimal (e.g. 0.2)
  rate: number; // decimal (e.g. 0.05)
  dividend: number; // decimal (q)
};

// --- Payoff Spec ----------------------------------------------------------------

// The payoff builder supports either:
//  - A piecewise-linear curve defined by control points
//  - A template (spike, capped call, digital step, etc.)
export type PayoffPoint = {
  spot: number;
  payoff: number;
};

export type PayoffTemplateKey =
  | "custom_points"
  | "spike"
  | "digital_step"
  | "capped_call"
  | "capped_put"
  | "corridor";

export type PayoffTemplate = {
  key: PayoffTemplateKey;
  // Template parameters are numeric and validated on use.
  params: Record<string, number>;
};

export type PayoffSpec = {
  // Scale multiplies the entire payoff curve (and therefore the entire portfolio).
  // This is how we resolve "shape vs budget" contradictions cleanly.
  scale: number;

  // Exactly one of these must be provided.
  points?: PayoffPoint[];
  template?: PayoffTemplate;
};

// --- Greek Spec -----------------------------------------------------------------

export type GreekRegion = "downside" | "atm" | "upside";

// Greek targets are set *qualitatively* via a value + tolerance in 3 regions.
// Values are portfolio-level (sum across legs), in the pricer's native units.
export type GreekBand = {
  greek: GreekKey;
  region: GreekRegion;
  target: number;
  tolerance: number;
  weight: number; // relative objective weight
};

export type GreekSpec = {
  // Zone width in pct (e.g. 10 means "downside" = spot*0.9, "upside" = spot*1.1).
  zoneWidthPct: number;
  bands: GreekBand[];
};

// --- Constraints & Priority ------------------------------------------------------

export type HardConstraints = {
  // Budget constraints are on portfolio premium (present value).
  // maxDebit = maximum allowed premium paid (>=0)
  // maxCreditAbs = maximum allowed premium received in absolute value
  maxDebit?: number;
  maxCreditAbs?: number;

  // Portfolio complexity cap.
  maxLegs?: number;

  // Position constraints.
  allowShort?: boolean;

  // If true, tries to avoid *unbounded* tail risk (naked short options).
  // The composer will prefer defined-risk blocks (spreads/butterflies).
  requireDefinedRisk?: boolean;
};

export type PriorityKey = "safety" | "payoff" | "greeks" | "simplicity";

export type PriorityLadder = {
  // Higher index = lower priority.
  order: PriorityKey[];
};

// --- Compiler Config -------------------------------------------------------------

export type CompileConfig = {
  // Terminal payoff maturity in years.
  maturity: number;

  // Strike grid used for payoff replication.
  strikeCount: number;
  strikeRangePct: number; // e.g. 0.6 means [0.4*spot .. 1.6*spot]
  strikeRound?: number; // optional rounding step (e.g. 50)

  // If true, the Greek-adjustment library can use a second expiry.
  allowMultiExpiry: boolean;
  longMaturity: number;

  // Greedy Greek adjustment settings.
  maxIterations: number;
  payoffDriftTolerancePct: number; // max allowed increase in payoff MSE when payoff is higher priority

  // Monte Carlo settings (for exotic legs and for expected payoff curves).
  mcPaths: number;
  mcSteps: number;
  mcSeed: number;
};

export type PayoffCurvePoint = {
  spot: number;
  // Portfolio PnL
  expiryPnl: number;
  currentPnl: number;
  // Optional target payoff overlay
  targetPayoff?: number;
};

export type CurvaturePoint = {
  strike: number;
  weight: number;
};

export type GreekSnapshot = {
  spot: number;
  greeks: ComposerGreeks;
};

export type CompileDiagnostics = {
  premium: number;
  payoffMSE: number;
  greekPenalty: number;
  maxLossApprox: number | null;
  maxProfitApprox: number | null;
  warnings: string[];
  notes: string[];
};

export type CompileResult = {
  legs: ComposerLeg[];
  diagnostics: CompileDiagnostics;
  payoffCurve: PayoffCurvePoint[];
  curvature: CurvaturePoint[];
  greekSnapshots: GreekSnapshot[];
  heatmap: {
    xAxis: number[];
    yAxis: number[];
    grid: { spotShock: number; volShock: number; pnl: number }[][];
  };
};

// --- Leg Model ------------------------------------------------------------------

// NOTE: We keep params flexible (record) because the site has both
// user-facing schemas (portfolio/schema.ts) and a strict pricer schema.
// The composer routes each leg to an appropriate pricer with validation.
export type ComposerLeg = {
  id: string;
  name?: string;
  instrument: ComposerInstrument;
  quantity: number;
  active: boolean;
  params: Record<string, any>;
};
