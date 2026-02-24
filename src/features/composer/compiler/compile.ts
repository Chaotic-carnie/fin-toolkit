// src/features/composer/compiler/compile.ts

import type {
  CompileConfig,
  CompileDiagnostics,
  CompileResult,
  ComposerLeg,
  GreekSpec,
  HardConstraints,
  MarketState,
  PayoffSpec,
  PriorityLadder,
} from "../types";
import { makeStrikeGrid } from "./strikeGrid";
import { callStripFromPayoff } from "./basis";
import { evalPayoff } from "./payoff";
import { uid } from "../utils/uuid";
import { safeNum } from "../utils/number";
import { mergeLegs, capLegCount } from "./simplify";
import { adjustGreeksGreedy } from "./adjustGreeks";
import { computePayoffCurve, portfolioPV } from "../analytics/payoffCurve";
import { computeGreekSnapshots } from "../analytics/greeks";
import { computeHeatmap } from "../analytics/heatmap";
import { portfolioHorizonValue } from "../analytics/horizon";

function defaultDiagnostics(): CompileDiagnostics {
  return {
    premium: 0,
    payoffMSE: 0,
    greekPenalty: 0,
    maxLossApprox: null,
    maxProfitApprox: null,
    warnings: [],
    notes: [],
  };
}

function approxPnLExtrema(payoffCurve: { expiryPnl: number }[]) {
  if (!payoffCurve.length) return { min: null, max: null };
  let min = Infinity;
  let max = -Infinity;
  for (const p of payoffCurve) {
    if (p.expiryPnl < min) min = p.expiryPnl;
    if (p.expiryPnl > max) max = p.expiryPnl;
  }
  return { min, max };
}

/**
 * Main entrypoint:
 * Compiles (payoff, greeks, constraints, priority) -> portfolio + charts.
 */
export function compilePortfolio(opts: {
  market: MarketState;
  payoffSpec: PayoffSpec;
  greekSpec?: GreekSpec;
  constraints: HardConstraints;
  priority: PriorityLadder;
  cfg: CompileConfig;
}): CompileResult {
  const { market, payoffSpec, greekSpec, constraints, priority, cfg } = opts;

  const diagnostics = defaultDiagnostics();

  // --- 1) Strike grid and target payoff on knots
  const strikes = makeStrikeGrid({
    spot: market.spot,
    count: cfg.strikeCount,
    rangePct: cfg.strikeRangePct,
    roundStep: cfg.strikeRound,
  });

  const targetOnKnots = strikes.map((k) => evalPayoff(payoffSpec, k));

  // --- 2) Static replication via call strip (cash + forward + calls)
  const basis = callStripFromPayoff({ strikes, payoff: payoffSpec });

  const commonParams = {
    asset: market.asset,
    spot: market.spot,
    vol: market.vol,
    risk_free_rate: market.rate,
    dividend_yield: market.dividend,
    time_to_expiry: cfg.maturity,
  };

  const legsRaw: ComposerLeg[] = [];

  // Cash (composer primitive): 1 unit priced at 1.
  // Quantity is the cash amount.
  legsRaw.push({
    id: uid("cash"),
    name: "Cash", // shows in leg table
    instrument: "cash",
    quantity: basis.cash,
    active: true,
    params: { ...commonParams },
  });

  // Prepaid forward with delivery 0 replicates S exposure.
  legsRaw.push({
    id: uid("fwd"),
    name: "Forward (prepaid)",
    instrument: "forward",
    quantity: basis.forwardQty,
    active: true,
    params: { ...commonParams, delivery: 0 },
  });

  // Calls at interior strikes.
  for (const c of basis.callQtyByStrike) {
    legsRaw.push({
      id: uid("call"),
      name: `Call @ ${c.strike.toFixed(0)}`,
      instrument: "vanilla",
      quantity: c.qty,
      active: true,
      params: { ...commonParams, option_type: "call", strike: c.strike },
    });
  }

  let legs = mergeLegs(legsRaw);

  // If shorts are disallowed, the payoff compiler can only represent a subset
  // of payoff shapes (roughly: convex payoffs without borrowing).
  // We enforce the hard constraint by clipping negative quantities to zero and
  // warning the user that the result may deviate from the target payoff.
  if (constraints.allowShort === false) {
    const hadShort = legs.some((l) => l.quantity < -1e-12);
    legs = legs.map((l) => ({ ...l, quantity: Math.max(0, l.quantity) }));
    if (hadShort) {
      diagnostics.warnings.push(
        "Short positions are disabled: clipped negative quantities to 0. Payoff replication may be approximate."
      );
    }
  }

  // --- 3) Enforce hard constraints where possible (budget, max legs)

  // Budget handling (priority-aware): if the user sets maxDebit/maxCreditAbs and
  // safety is top priority, we scale the payoff (and portfolio) down to fit.
  // This preserves *shape* but reduces *notional*.
  const pv = portfolioPV(legs, market, cfg.maturity);
  diagnostics.premium = pv;

  const safetyIsTop = (priority.order[0] ?? "safety") === "safety";

  if (safetyIsTop && constraints.maxDebit !== undefined && pv > constraints.maxDebit + 1e-9) {
    const scale = constraints.maxDebit / pv;
    diagnostics.warnings.push(
      `Budget constraint hit: scaled portfolio notional to ${(scale * 100).toFixed(1)}% to fit max debit.`
    );
    legs = legs.map((l) => ({ ...l, quantity: l.quantity * scale }));
    diagnostics.premium = portfolioPV(legs, market, cfg.maturity);
  }

  if (safetyIsTop && constraints.maxCreditAbs !== undefined && pv < -constraints.maxCreditAbs - 1e-9) {
    const scale = constraints.maxCreditAbs / Math.abs(pv);
    diagnostics.warnings.push(
      `Credit constraint hit: scaled portfolio notional to ${(scale * 100).toFixed(1)}% to fit max credit.`
    );
    legs = legs.map((l) => ({ ...l, quantity: l.quantity * scale }));
    diagnostics.premium = portfolioPV(legs, market, cfg.maturity);
  }

  // Max legs: hard cap if provided.
  const cap = capLegCount(legs, constraints.maxLegs);
  legs = cap.legs;
  if (cap.dropped > 0) {
    diagnostics.warnings.push(`Max legs enforced: dropped ${cap.dropped} small legs.`);
  }

  // --- 4) Greek adjustment (greedy blocks), if requested
  if (greekSpec && greekSpec.bands.length > 0) {
    const adj = adjustGreeksGreedy({
      legs,
      market,
      payoffKnotSpots: strikes,
      payoffTarget: targetOnKnots,
      maturity: cfg.maturity,
      greekSpec,
      constraints,
      priority,
      cfg,
    });
    legs = adj.legs;
    diagnostics.notes.push(...adj.notes);
    diagnostics.greekPenalty = adj.greekPenalty;

    // Enforce max legs again after adjustments.
    const cap2 = capLegCount(legs, constraints.maxLegs);
    legs = cap2.legs;
    if (cap2.dropped > 0) {
      diagnostics.warnings.push(`Max legs enforced after Greek fitting: dropped ${cap2.dropped} legs.`);
    }
  }

  // --- 5) Charts & diagnostics
  const payoffCurve = computePayoffCurve({
    legs,
    market,
    maturity: cfg.maturity,
    spotRangePct: cfg.strikeRangePct,
    points: 81,
    payoffSpec,
  });

  // Payoff MSE (based on knot points) – measures replication accuracy.
  const payoffOnKnots = strikes.map((S) => portfolioHorizonValue({ legs, market, horizon: cfg.maturity, spotAtHorizon: S }));
  let mse = 0;
  for (let i = 0; i < strikes.length; i++) {
    const d = (payoffOnKnots[i] ?? 0) - (targetOnKnots[i] ?? 0);
    mse += d * d;
  }
  diagnostics.payoffMSE = strikes.length ? mse / strikes.length : 0;

  const extrema = approxPnLExtrema(payoffCurve);
  diagnostics.maxLossApprox = extrema.min;
  diagnostics.maxProfitApprox = extrema.max;

  const greekSnapshots = computeGreekSnapshots({
    legs,
    market,
    maturity: cfg.maturity,
    zoneWidthPct: greekSpec?.zoneWidthPct ?? 10,
  });

  const heatmap = computeHeatmap({ legs, market, maturity: cfg.maturity });

  return {
    legs,
    diagnostics,
    payoffCurve,
    curvature: basis.curvature,
    greekSnapshots,
    heatmap,
  };
}
