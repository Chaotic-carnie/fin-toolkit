// src/features/composer/compiler/basis.ts

import type { CurvaturePoint, PayoffSpec } from "../types";
import { evalPayoff } from "./payoff";

/**
 * Discrete static replication of an arbitrary terminal payoff using:
 *
 *   f(S) = a + b*S + \sum_i q_i (S-K_i)^+
 *
 * where q_i are *slope jumps* at the strike grid knots.
 *
 * This is the discrete analogue of the continuous call-replication identity.
 * Intuition (interview-friendly):
 *   - A tight call butterfly approximates a spike in the 2nd derivative of payoff.
 *   - Summing many butterflies (Riemann sum) recreates an arbitrary payoff shape.
 *   - In discrete form, the curvature lives in the *second differences* of f.
 */
export function callStripFromPayoff(opts: {
  strikes: number[];
  payoff: PayoffSpec;
}): {
  // a + b*S
  cash: number;
  forwardQty: number;
  // calls at interior strikes
  callQtyByStrike: { strike: number; qty: number }[];
  // curvature (diagnostic) – basically call weights on a scaled axis
  curvature: CurvaturePoint[];
  // payoff values on knots (useful for diagnostics)
  knotPayoffs: { strike: number; payoff: number }[];
} {
  const K = opts.strikes;
  if (K.length < 3) {
    return { cash: 0, forwardQty: 0, callQtyByStrike: [], curvature: [], knotPayoffs: [] };
  }

  const f = K.map((k) => evalPayoff(opts.payoff, k));
  const knotPayoffs = K.map((k, i) => ({ strike: k, payoff: f[i]! }));

  // Slopes on each interval.
  const slopes: number[] = [];
  for (let i = 0; i < K.length - 1; i++) {
    const dk = K[i + 1]! - K[i]!;
    slopes.push(dk > 0 ? (f[i + 1]! - f[i]!) / dk : 0);
  }

  // Baseline line matches the first segment.
  const b = slopes[0] ?? 0;
  const a = f[0]! - b * K[0]!;

  const callQtyByStrike: { strike: number; qty: number }[] = [];
  const curvature: CurvaturePoint[] = [];

  for (let i = 1; i < K.length - 1; i++) {
    const q = (slopes[i] ?? slopes[slopes.length - 1] ?? 0) - (slopes[i - 1] ?? 0);
    callQtyByStrike.push({ strike: K[i]!, qty: q });

    // For equal grid spacing, q is proportional to the second finite difference.
    // For irregular spacing, it's still the "kink" magnitude (slope jump).
    curvature.push({ strike: K[i]!, weight: q });
  }

  return {
    cash: a,
    forwardQty: b,
    callQtyByStrike,
    curvature,
    knotPayoffs,
  };
}
