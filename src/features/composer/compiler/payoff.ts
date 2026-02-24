// src/features/composer/compiler/payoff.ts

import type { PayoffPoint, PayoffSpec, PayoffTemplate } from "../types";
import { clamp, safeNum } from "../utils/number";

/**
 * Sort and sanitize payoff control points.
 * - Removes NaN points.
 * - Sorts by spot.
 * - Deduplicates by spot (keeps last).
 */
export function normalizePayoffPoints(points: PayoffPoint[]): PayoffPoint[] {
  const cleaned = points
    .map((p) => ({ spot: safeNum(p.spot), payoff: safeNum(p.payoff) }))
    .filter((p) => Number.isFinite(p.spot) && Number.isFinite(p.payoff) && p.spot > 0);

  cleaned.sort((a, b) => a.spot - b.spot);

  const dedup: PayoffPoint[] = [];
  for (const p of cleaned) {
    const last = dedup[dedup.length - 1];
    if (!last || Math.abs(last.spot - p.spot) > 1e-12) dedup.push(p);
    else dedup[dedup.length - 1] = p;
  }

  // Ensure at least 2 points for interpolation.
  if (dedup.length < 2) {
    // Default: flat zero payoff.
    return [
      { spot: 0.5, payoff: 0 },
      { spot: 1.5, payoff: 0 },
    ];
  }

  return dedup;
}

/**
 * Piecewise linear interpolation of a payoff curve.
 * Extrapolates linearly outside the point range.
 */
export function payoffFromPoints(pointsIn: PayoffPoint[], S: number): number {
  const points = normalizePayoffPoints(pointsIn);
  const x = Math.max(1e-12, S);

  if (x <= points[0]!.spot) {
    const p0 = points[0]!;
    const p1 = points[1]!;
    const m = (p1.payoff - p0.payoff) / (p1.spot - p0.spot);
    return p0.payoff + m * (x - p0.spot);
  }

  if (x >= points[points.length - 1]!.spot) {
    const pN1 = points[points.length - 2]!;
    const pN = points[points.length - 1]!;
    const m = (pN.payoff - pN1.payoff) / (pN.spot - pN1.spot);
    return pN.payoff + m * (x - pN.spot);
  }

  // Find interval.
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (x >= a.spot && x <= b.spot) {
      const t = (x - a.spot) / (b.spot - a.spot);
      return a.payoff + t * (b.payoff - a.payoff);
    }
  }

  // Should never happen.
  return 0;
}

function templateSpike(params: Record<string, number>, S: number): number {
  const center = safeNum(params.center, 100);
  const width = Math.max(1e-9, safeNum(params.width, 10));
  const height = safeNum(params.height, 100);

  const left = center - width;
  const right = center + width;
  if (S <= left || S >= right) return 0;

  if (S <= center) {
    const t = (S - left) / (center - left);
    return height * t;
  }
  const t = (right - S) / (right - center);
  return height * t;
}

function templateDigitalStep(params: Record<string, number>, S: number): number {
  const strike = safeNum(params.strike, 100);
  const payout = safeNum(params.payout, 100);
  return S >= strike ? payout : 0;
}

function templateCappedCall(params: Record<string, number>, S: number): number {
  const strike = safeNum(params.strike, 100);
  const cap = Math.max(0, safeNum(params.cap, 50));
  return clamp(S - strike, 0, cap);
}

function templateCappedPut(params: Record<string, number>, S: number): number {
  const strike = safeNum(params.strike, 100);
  const cap = Math.max(0, safeNum(params.cap, 50));
  return clamp(strike - S, 0, cap);
}

function templateCorridor(params: Record<string, number>, S: number): number {
  // Corridor: 0 outside [lo, hi], constant inside.
  const lo = safeNum(params.lo, 90);
  const hi = safeNum(params.hi, 110);
  const payout = safeNum(params.payout, 50);
  return S >= lo && S <= hi ? payout : 0;
}

/**
 * Evaluate a payoff template at spot S.
 */
export function payoffFromTemplate(tpl: PayoffTemplate, S: number): number {
  switch (tpl.key) {
    case "spike":
      return templateSpike(tpl.params, S);
    case "digital_step":
      return templateDigitalStep(tpl.params, S);
    case "capped_call":
      return templateCappedCall(tpl.params, S);
    case "capped_put":
      return templateCappedPut(tpl.params, S);
    case "corridor":
      return templateCorridor(tpl.params, S);
    case "custom_points":
    default:
      return 0;
  }
}

/**
 * Unified payoff evaluation.
 */
export function evalPayoff(spec: PayoffSpec, S: number): number {
  const scale = Number.isFinite(spec.scale) ? spec.scale : 1;

  if (spec.points && spec.points.length > 0) {
    return scale * payoffFromPoints(spec.points, S);
  }

  if (spec.template) {
    if (spec.template.key === "custom_points") {
      // If template is custom_points but points are missing, return 0.
      return 0;
    }
    return scale * payoffFromTemplate(spec.template, S);
  }

  return 0;
}
