// src/features/composer/utils/number.ts

/**
 * Safely coerce to a finite number.
 * The composer UI deals with many optional numeric fields; this helper ensures
 * the engine never receives NaN.
 */
export function safeNum(val: unknown, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Clamp a number to [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Round to a given step (e.g. 50). */
export function roundToStep(x: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) return x;
  return Math.round(x / step) * step;
}

/**
 * Numerically stable almost-equals.
 */
export function nearlyEqual(a: number, b: number, eps = 1e-9) {
  return Math.abs(a - b) <= eps * (1 + Math.max(Math.abs(a), Math.abs(b)));
}
