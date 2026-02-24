// src/features/composer/compiler/adjustGreeks.ts

import type {
  ComposerLeg,
  CompileConfig,
  GreekBand,
  GreekSpec,
  HardConstraints,
  MarketState,
  PriorityLadder,
  PricingResult,
} from "../types";
import { portfolioGreeks, portfolioPV } from "../analytics/payoffCurve";
import { portfolioHorizonValue } from "../analytics/horizon";
import { intrinsicPayoff, priceLeg } from "../pricing/router";
import { uid } from "../utils/uuid";
import { safeNum } from "../utils/number";

// Vector helpers (small, no external deps)
function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

function addScaled(base: number[], v: number[], alpha: number) {
  const out = base.slice();
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) + alpha * (v[i] ?? 0);
  return out;
}

function mse(a: number[], b: number[]) {
  if (a.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return s / a.length;
}

function regionSpot(spot: number, region: string, widthPct: number) {
  const w = widthPct / 100;
  if (region === "downside") return Math.max(1e-9, spot * (1 - w));
  if (region === "upside") return spot * (1 + w);
  return spot;
}

/**
 * Build an objective vector from greek bands.
 * Each band becomes one element in the vector.
 */
function greekVectorFromBands(opts: {
  legs: ComposerLeg[];
  market: MarketState;
  maturity: number;
  bands: GreekBand[];
  zoneWidthPct: number;
}): number[] {
  const { legs, market, maturity, bands, zoneWidthPct } = opts;
  return bands.map((b) => {
    const s = regionSpot(market.spot, b.region, zoneWidthPct);
    const g = portfolioGreeks(legs, { ...market, spot: s }, maturity);
    return (g as any)[b.greek] ?? 0;
  });
}

function greekTargetVector(bands: GreekBand[]): number[] {
  return bands.map((b) => b.target);
}

function greekToleranceVector(bands: GreekBand[]): number[] {
  return bands.map((b) => b.tolerance);
}

function greekWeightVector(bands: GreekBand[]): number[] {
  return bands.map((b) => Math.max(1e-9, b.weight));
}

function greekPenalty(current: number[], target: number[], tol: number[], w: number[]) {
  let s = 0;
  for (let i = 0; i < current.length; i++) {
    const err = Math.max(0, Math.abs((current[i] ?? 0) - (target[i] ?? 0)) - (tol[i] ?? 0));
    s += (w[i] ?? 1) * err * err;
  }
  return s;
}

// --- Adjustment blocks ----------------------------------------------------------

type BlockFactory = (args: {
  market: MarketState;
  maturity: number;
  longMaturity: number;
  spot: number;
}) => { name: string; legs: Omit<ComposerLeg, "id">[] }[];

/**
 * A small library of "Greek shapers".
 *
 * These are intentionally simple and interview-friendly:
 *  - forward: delta adjuster
 *  - straddle: gamma/vega bump
 *  - risk reversal: delta skew without too much gamma
 *  - calendar straddle: vega positive with theta relief
 */
const makeBlocks: BlockFactory = ({ market, maturity, longMaturity, spot }) => {
  const K_atm = spot;
  const K_up = spot * 1.05;
  const K_dn = spot * 0.95;

  const common = {
    asset: market.asset,
    spot,
    vol: market.vol,
    risk_free_rate: market.rate,
    dividend_yield: market.dividend,
  };

  const mkVanilla = (type: "call" | "put", strike: number, T: number) => ({
    instrument: "vanilla" as const,
    quantity: 1,
    active: true,
    params: { ...common, option_type: type, strike, time_to_expiry: T },
  });

  const mkForward = (T: number) => ({
    instrument: "forward" as const,
    quantity: 1,
    active: true,
    params: { ...common, delivery: 0, time_to_expiry: T },
  });

  return [
    {
      name: "Delta Adjuster (Forward)",
      legs: [mkForward(maturity)],
    },
    {
      name: "ATM Straddle (Gamma/Vega)",
      legs: [mkVanilla("call", K_atm, maturity), mkVanilla("put", K_atm, maturity)],
    },
    {
      name: "Risk Reversal (Delta Tilt)",
      legs: [mkVanilla("call", K_up, maturity), { ...mkVanilla("put", K_dn, maturity), quantity: -1 }],
    },
    {
      name: "Calendar Straddle (Vega w/ Theta Relief)",
      legs: [
        // Long long-dated straddle
        mkVanilla("call", K_atm, longMaturity),
        mkVanilla("put", K_atm, longMaturity),
        // Short near-dated straddle
        { ...mkVanilla("call", K_atm, maturity), quantity: -1 },
        { ...mkVanilla("put", K_atm, maturity), quantity: -1 },
      ],
    },
  ];
};

function mergeLegs(legs: ComposerLeg[]): ComposerLeg[] {
  const key = (l: ComposerLeg) => {
    const p = l.params ?? {};
    const strike = safeNum(p.strike ?? p.K, 0);
    const T = safeNum(p.time_to_expiry ?? p.T, 0);
    const type = String(p.option_type ?? p.type ?? "");
    const extra =
      l.instrument === "barrier" ? `${safeNum(p.barrier ?? p.H, 0)}:${String(p.barrier_type ?? p.barrierType ?? "")}` : "";

    return `${l.instrument}|${type}|${strike}|${T}|${extra}`;
  };

  const map = new Map<string, ComposerLeg>();
  for (const l of legs) {
    if (!l.active) continue;
    const k = key(l);
    const prev = map.get(k);
    if (!prev) map.set(k, { ...l });
    else prev.quantity += l.quantity;
  }

  // Remove near-zero.
  return Array.from(map.values()).filter((l) => Math.abs(l.quantity) > 1e-8);
}

function obeyAllowShort(legs: ComposerLeg[], allowShort: boolean) {
  if (allowShort) return true;
  return legs.every((l) => l.quantity >= -1e-12);
}

function obeyMaxLegs(legs: ComposerLeg[], maxLegs?: number) {
  if (!maxLegs) return true;
  return legs.filter((l) => l.active && Math.abs(l.quantity) > 1e-8).length <= maxLegs;
}

function obeyBudget(legs: ComposerLeg[], market: MarketState, maturity: number, c: HardConstraints) {
  const pv = portfolioPV(legs, market, maturity);
  if (c.maxDebit !== undefined && pv > c.maxDebit + 1e-9) return false;
  if (c.maxCreditAbs !== undefined && pv < -c.maxCreditAbs - 1e-9) return false;
  return true;
}

/**
 * Greedy Greek adjustment:
 *
 * - Keeps the current portfolio as the "base".
 * - Iteratively adds a scaled adjustment block that reduces greek penalty.
 * - If payoff is higher priority, we restrict payoff drift.
 */
export function adjustGreeksGreedy(opts: {
  legs: ComposerLeg[];
  market: MarketState;
  payoffKnotSpots: number[]; // strike grid used for payoff target
  payoffTarget: number[]; // target payoff values on knots
  maturity: number;
  greekSpec: GreekSpec;
  constraints: HardConstraints;
  priority: PriorityLadder;
  cfg: CompileConfig;
}): { legs: ComposerLeg[]; greekPenalty: number; notes: string[] } {
  const {
    market,
    payoffKnotSpots,
    payoffTarget,
    maturity,
    greekSpec,
    constraints,
    priority,
    cfg,
  } = opts;

  const notes: string[] = [];

  if (!greekSpec.bands.length) {
    return { legs: opts.legs, greekPenalty: 0, notes };
  }

  const allowShort = constraints.allowShort ?? true;

  const target = greekTargetVector(greekSpec.bands);
  const tol = greekToleranceVector(greekSpec.bands);
  const w = greekWeightVector(greekSpec.bands);

  // Initial objective values.
  let legs = mergeLegs(opts.legs);

  const payoffVec = (L: ComposerLeg[]) =>
    payoffKnotSpots.map((S) => portfolioHorizonValue({ legs: L, market, horizon: maturity, spotAtHorizon: S }));

  const basePayoff = payoffVec(legs);
  const basePayoffMSE = mse(basePayoff, payoffTarget);

  const payoffIsHighPriority = (priority.order[0] ?? "payoff") === "payoff";

  let currentGreek = greekVectorFromBands({ legs, market, maturity, bands: greekSpec.bands, zoneWidthPct: greekSpec.zoneWidthPct });
  let currentPenalty = greekPenalty(currentGreek, target, tol, w);

  // If already within tolerance, nothing to do.
  if (currentPenalty < 1e-10) {
    notes.push("Greeks already within tolerance bands.");
    return { legs, greekPenalty: currentPenalty, notes };
  }

  // Candidate blocks.
  let blocks = makeBlocks({
    market,
    maturity,
    longMaturity: cfg.allowMultiExpiry ? cfg.longMaturity : maturity,
    spot: market.spot,
  });

  // If the user requests defined-risk bias, we drop blocks that contain
  // (a) any forward exposure, or (b) any explicitly short option legs.
  // This is a conservative heuristic: it may remove some valid hedged blocks,
  // but it guarantees we don't introduce naked short optionality.
  if (constraints.requireDefinedRisk) {
    blocks = blocks.filter((b) =>
      b.legs.every((l) => l.instrument !== "forward" && (l.quantity ?? 0) >= -1e-12)
    );
  }

  for (let iter = 0; iter < cfg.maxIterations; iter++) {
    let best: { newLegs: ComposerLeg[]; penalty: number; payoffMSE: number; blockName: string } | null = null;

    // Build the current diff vector where each component uses tolerance bands.
    const diff: number[] = currentGreek.map((v, i) => {
      const t = target[i] ?? 0;
      const band = tol[i] ?? 0;
      const e = t - v;
      // If already within the tolerance band, treat as 0.
      return Math.abs(e) <= band ? 0 : e;
    });

    for (const block of blocks) {
      // Turn block legs into ComposerLeg objects with IDs.
      const blockLegs: ComposerLeg[] = block.legs.map((l) => ({ ...l, id: uid("blk"), name: block.name } as ComposerLeg));

      // Effect per +1 block scale.
      const v = greekVectorFromBands({ legs: blockLegs, market, maturity, bands: greekSpec.bands, zoneWidthPct: greekSpec.zoneWidthPct });
      const vv = dot(v, v);
      if (vv < 1e-12) continue;

      // Projection step.
      const alpha = dot(v, diff) / vv;
      if (!Number.isFinite(alpha) || Math.abs(alpha) < 1e-6) continue;

      // Clip step size to avoid huge jumps.
      const clipped = Math.max(-25, Math.min(25, alpha));

      const candidate = mergeLegs([
        ...legs,
        ...blockLegs.map((l) => ({ ...l, quantity: l.quantity * clipped })),
      ]);

      if (!obeyAllowShort(candidate, allowShort)) continue;
      if (!obeyMaxLegs(candidate, constraints.maxLegs)) continue;
      if (!obeyBudget(candidate, market, maturity, constraints)) continue;

      // Payoff drift check (only if payoff is higher priority than greeks).
      const candPayoff = payoffVec(candidate);
      const candMSE = mse(candPayoff, payoffTarget);
      if (payoffIsHighPriority) {
        const maxAllowed = basePayoffMSE * (1 + cfg.payoffDriftTolerancePct / 100);
        if (candMSE > maxAllowed + 1e-12) continue;
      }

      const candGreek = greekVectorFromBands({ legs: candidate, market, maturity, bands: greekSpec.bands, zoneWidthPct: greekSpec.zoneWidthPct });
      const candPenalty = greekPenalty(candGreek, target, tol, w);

      if (candPenalty < currentPenalty - 1e-9) {
        if (!best || candPenalty < best.penalty) {
          best = { newLegs: candidate, penalty: candPenalty, payoffMSE: candMSE, blockName: block.name };
        }
      }
    }

    if (!best) break;

    legs = best.newLegs;
    currentPenalty = best.penalty;
    currentGreek = greekVectorFromBands({ legs, market, maturity, bands: greekSpec.bands, zoneWidthPct: greekSpec.zoneWidthPct });

    notes.push(`Greek adjust: applied ${best.blockName}`);

    if (currentPenalty < 1e-10) break;
  }

  return { legs, greekPenalty: currentPenalty, notes };
}
