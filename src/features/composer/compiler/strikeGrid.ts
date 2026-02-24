// src/features/composer/compiler/strikeGrid.ts

import { clamp, roundToStep } from "../utils/number";

/**
 * Generate an increasing strike grid around spot.
 *
 * - count is coerced to >= 3 and odd (so spot can sit in the middle).
 * - strikes are optionally rounded to `roundStep`.
 * - duplicates (from rounding) are removed while preserving monotonicity.
 */
export function makeStrikeGrid(opts: {
  spot: number;
  count: number;
  rangePct: number;
  roundStep?: number;
}): number[] {
  const spot = Math.max(1e-9, opts.spot);
  const rawCount = Math.max(3, Math.floor(opts.count));
  const count = rawCount % 2 === 0 ? rawCount + 1 : rawCount;

  const rangePct = clamp(opts.rangePct, 0.05, 0.95);
  const lo = Math.max(1e-9, spot * (1 - rangePct));
  const hi = spot * (1 + rangePct);
  const step = (hi - lo) / (count - 1);

  const strikes: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = lo + i * step;
    const r = opts.roundStep ? roundToStep(x, opts.roundStep) : x;
    strikes.push(r);
  }

  // Enforce strict monotone increase after rounding.
  const cleaned: number[] = [];
  for (const k of strikes) {
    if (cleaned.length === 0 || k > cleaned[cleaned.length - 1]! + 1e-12) {
      cleaned.push(k);
    }
  }

  // If rounding collapses the grid too much, fall back to unrounded.
  if (cleaned.length < Math.max(5, Math.floor(count / 2))) {
    return Array.from({ length: count }, (_, i) => lo + i * step);
  }

  return cleaned;
}
