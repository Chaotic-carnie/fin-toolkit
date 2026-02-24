// src/features/composer/pricing/bs.ts

import { clamp } from "../utils/number";

/**
 * Standard normal CDF approximation (same polynomial as the main pricing engine).
 */
export function normCdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - prob : prob;
}

export function d1(S: number, K: number, T: number, r: number, q: number, sigma: number) {
  const s = Math.max(1e-12, S);
  const k = Math.max(1e-12, K);
  const vol = Math.max(1e-12, sigma);
  const t = Math.max(1e-12, T);
  return (Math.log(s / k) + (r - q + 0.5 * vol * vol) * t) / (vol * Math.sqrt(t));
}

export function d2(S: number, K: number, T: number, r: number, q: number, sigma: number) {
  return d1(S, K, T, r, q, sigma) - Math.max(1e-12, sigma) * Math.sqrt(Math.max(1e-12, T));
}

/**
 * Gap option (European) analytic pricing under Black-Scholes.
 *
 * Gap call payoff: (S_T - K_pay)^+ * 1_{S_T > K_trigger}
 * (classic "two strike" gap; payoff strike can differ from trigger strike)
 */
export function priceGapOption(params: {
  S: number;
  K_trigger: number;
  K_pay: number;
  T: number;
  r: number;
  q: number;
  sigma: number;
  type: "call" | "put";
}): number {
  const { S, K_trigger, K_pay, T, r, q, sigma, type } = params;
  const isCall = type === "call";

  if (T <= 0) {
    const itm = isCall ? S > K_trigger : S < K_trigger;
    if (!itm) return 0;
    return Math.max(0, isCall ? S - K_pay : K_pay - S);
  }

  const dd1 = d1(S, K_trigger, T, r, q, sigma);
  const dd2 = d2(S, K_trigger, T, r, q, sigma);

  if (isCall) {
    return S * Math.exp(-q * T) * normCdf(dd1) - K_pay * Math.exp(-r * T) * normCdf(dd2);
  }

  // Put version uses N(-d1), N(-d2)
  return K_pay * Math.exp(-r * T) * normCdf(-dd2) - S * Math.exp(-q * T) * normCdf(-dd1);
}

/**
 * Asset-or-nothing binary option analytic pricing under Black-Scholes.
 * Call pays S_T if S_T > K, else 0. Put pays S_T if S_T < K, else 0.
 */
export function priceAssetBinary(params: {
  S: number;
  K: number;
  T: number;
  r: number;
  q: number;
  sigma: number;
  type: "call" | "put";
}): number {
  const { S, K, T, r, q, sigma, type } = params;
  if (T <= 0) {
    const itm = type === "call" ? S > K : S < K;
    return itm ? S : 0;
  }
  const dd1 = d1(S, K, T, r, q, sigma);
  return type === "call" ? S * Math.exp(-q * T) * normCdf(dd1) : S * Math.exp(-q * T) * normCdf(-dd1);
}

/**
 * Clamp volatility/time to avoid numerical explosions in finite differences.
 */
export function sanitizeFiniteDiff(x: number, lo: number, hi: number) {
  return clamp(x, lo, hi);
}
