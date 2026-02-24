// src/features/composer/pricing/exotics.ts

import { calculatePriceDetails } from "~/features/pricing/engine";
import type { OptionType, ComposerGreeks, PricingResult, MarketState } from "../types";
import { safeNum } from "../utils/number";
import { priceAssetBinary, priceGapOption, sanitizeFiniteDiff } from "./bs";
import { simulateGBM } from "./mc";

// Helper: normalize the pricer output to our Greeks shape.
function toGreeks(raw: any): ComposerGreeks {
  return {
    delta: safeNum(raw.delta),
    gamma: safeNum(raw.gamma),
    vega: safeNum(raw.vega),
    theta: safeNum(raw.theta),
    rho: safeNum(raw.rho),
    vanna: safeNum(raw.vanna),
    volga: safeNum(raw.volga),
  };
}

function zeroGreeks(): ComposerGreeks {
  return { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0, vanna: 0, volga: 0 };
}

// --- Finite Difference wrapper --------------------------------------------------

/**
 * Generic finite-difference Greeks wrapper around a scalar pricing function.
 *
 * This is used for composer-only exotics (gap, chooser, compound, lookback, shout)
 * to keep the implementation compact and robust.
 */
export function finiteDiffGreeks(opts: {
  priceFn: (mkt: MarketState) => number;
  base: MarketState;
}): PricingResult {
  const base = opts.base;

  const S = sanitizeFiniteDiff(base.spot, 1e-6, 1e12);
  const sigma = sanitizeFiniteDiff(base.vol, 1e-6, 5);
  const r = sanitizeFiniteDiff(base.rate, -1, 1);

  const dS = Math.max(1e-4, S * 0.001);
  const dVol = 0.01;
  const dR = 0.01;

  const p0 = opts.priceFn(base);

  const p_up = opts.priceFn({ ...base, spot: S + dS });
  const p_dn = opts.priceFn({ ...base, spot: Math.max(1e-9, S - dS) });

  const p_vol_up = opts.priceFn({ ...base, vol: sigma + dVol });
  const p_vol_dn = opts.priceFn({ ...base, vol: Math.max(1e-9, sigma - dVol) });

  const p_r_up = opts.priceFn({ ...base, rate: r + dR });

  // We cannot alter maturity through MarketState; theta for these exotics is best-effort.
  // We'll set theta to 0 for now and clearly label it in the UI.
  const delta = (p_up - p_dn) / (2 * dS);
  const gamma = (p_up - 2 * p0 + p_dn) / (dS * dS);
  const vega = (p_vol_up - p_vol_dn) / (2 * dVol) / 100;
  const rho = (p_r_up - p0) / 100;

  return {
    price: p0,
    greeks: {
      delta,
      gamma,
      vega,
      theta: 0,
      rho,
      vanna: 0,
      volga: 0,
    },
  };
}

// --- Composer-only exotic pricers ----------------------------------------------

export function priceGap(params: {
  market: MarketState;
  maturity: number;
  type: OptionType;
  K_trigger: number;
  K_pay: number;
}): PricingResult {
  const { market, maturity, type, K_trigger, K_pay } = params;

  const price = priceGapOption({
    S: market.spot,
    K_trigger,
    K_pay,
    T: maturity,
    r: market.rate,
    q: market.dividend,
    sigma: market.vol,
    type,
  });

  // Greeks: use finite differences (analytic also possible, but FD is consistent).
  return finiteDiffGreeks({
    base: market,
    priceFn: (mkt) =>
      priceGapOption({
        S: mkt.spot,
        K_trigger,
        K_pay,
        T: maturity,
        r: mkt.rate,
        q: mkt.dividend,
        sigma: mkt.vol,
        type,
      }),
  });
}

export function priceAssetOrNothing(params: {
  market: MarketState;
  maturity: number;
  type: OptionType;
  K: number;
}): PricingResult {
  const { market, maturity, type, K } = params;

  return finiteDiffGreeks({
    base: market,
    priceFn: (mkt) =>
      priceAssetBinary({
        S: mkt.spot,
        K,
        T: maturity,
        r: mkt.rate,
        q: mkt.dividend,
        sigma: mkt.vol,
        type,
      }),
  });
}

/**
 * Chooser option priced by Monte Carlo:
 * At time tChoose, pick max(Call, Put) on the remaining time to expiry.
 */
export function priceChooserMC(params: {
  market: MarketState;
  maturity: number;
  chooseTime: number; // in years (0 < chooseTime < maturity)
  strike: number;
  typeChoice?: "call_or_put"; // future extension
  paths: number;
  steps: number;
  seed: number;
}): PricingResult {
  const { market, maturity, chooseTime, strike, paths, steps, seed } = params;

  const tChoose = Math.max(1e-6, Math.min(maturity - 1e-6, chooseTime));
  const stepsChoose = Math.max(1, Math.floor((steps * tChoose) / maturity));

  const dtTotal = maturity;

  const priceFn = (mkt: MarketState) => {
    let sum = 0;

    simulateGBM(
      {
        S0: mkt.spot,
        T: maturity,
        r: mkt.rate,
        q: mkt.dividend,
        sigma: mkt.vol,
        steps,
        paths,
        seed,
      },
      (_i, path) => {
        const S_choose = path[stepsChoose] ?? path[path.length - 1]!;
        const remT = maturity - tChoose;

        // Value of call/put at chooser time using BS on remaining time.
        const callVal = calculatePriceDetails("black_scholes", "vanilla", {
          type: "call",
          S: S_choose,
          K: strike,
          T: remT,
          r: mkt.rate,
          q: mkt.dividend,
          sigma: mkt.vol,
        }).price;

        const putVal = calculatePriceDetails("black_scholes", "vanilla", {
          type: "put",
          S: S_choose,
          K: strike,
          T: remT,
          r: mkt.rate,
          q: mkt.dividend,
          sigma: mkt.vol,
        }).price;

        const vChoose = Math.max(callVal, putVal);

        // Discount from chooser time back to today.
        sum += vChoose * Math.exp(-mkt.rate * tChoose);
      }
    );

    return sum / paths;
  };

  return finiteDiffGreeks({ base: market, priceFn });
}

/**
 * Compound option (option-on-option) priced by Monte Carlo.
 * Outer option expires at tOuter (< maturity), underlying option expires at maturity.
 */
export function priceCompoundMC(params: {
  market: MarketState;
  maturity: number;
  outerTime: number;
  outerType: OptionType;
  outerStrike: number; // strike on option value
  innerType: OptionType;
  innerStrike: number; // strike on underlying
  paths: number;
  steps: number;
  seed: number;
}): PricingResult {
  const { market, maturity, outerTime, outerType, outerStrike, innerType, innerStrike, paths, steps, seed } = params;

  const tOuter = Math.max(1e-6, Math.min(maturity - 1e-6, outerTime));
  const stepsOuter = Math.max(1, Math.floor((steps * tOuter) / maturity));

  const priceFn = (mkt: MarketState) => {
    let sum = 0;

    simulateGBM(
      {
        S0: mkt.spot,
        T: maturity,
        r: mkt.rate,
        q: mkt.dividend,
        sigma: mkt.vol,
        steps,
        paths,
        seed,
      },
      (_i, path) => {
        const S_outer = path[stepsOuter] ?? path[path.length - 1]!;
        const remT = maturity - tOuter;

        const innerVal = calculatePriceDetails("black_scholes", "vanilla", {
          type: innerType,
          S: S_outer,
          K: innerStrike,
          T: remT,
          r: mkt.rate,
          q: mkt.dividend,
          sigma: mkt.vol,
        }).price;

        const payoff =
          outerType === "call" ? Math.max(0, innerVal - outerStrike) : Math.max(0, outerStrike - innerVal);

        sum += payoff;
      }
    );

    return (sum / paths) * Math.exp(-mkt.rate * tOuter);
  };

  return finiteDiffGreeks({ base: market, priceFn });
}

/**
 * Fixed-strike lookback (call/put) priced by Monte Carlo.
 * Call payoff = max(max_t S_t - K, 0)
 * Put payoff  = max(K - min_t S_t, 0)
 */
export function priceLookbackMC(params: {
  market: MarketState;
  maturity: number;
  type: OptionType;
  strike: number;
  paths: number;
  steps: number;
  seed: number;
}): PricingResult {
  const { market, maturity, type, strike, paths, steps, seed } = params;

  const priceFn = (mkt: MarketState) => {
    let sum = 0;

    simulateGBM(
      {
        S0: mkt.spot,
        T: maturity,
        r: mkt.rate,
        q: mkt.dividend,
        sigma: mkt.vol,
        steps,
        paths,
        seed,
      },
      (_i, path) => {
        let maxS = -Infinity;
        let minS = Infinity;
        for (let j = 0; j < path.length; j++) {
          const v = path[j]!;
          if (v > maxS) maxS = v;
          if (v < minS) minS = v;
        }
        const payoff = type === "call" ? Math.max(0, maxS - strike) : Math.max(0, strike - minS);
        sum += payoff;
      }
    );

    return (sum / paths) * Math.exp(-mkt.rate * maturity);
  };

  return finiteDiffGreeks({ base: market, priceFn });
}

/**
 * One-shout option (simplified) priced by Monte Carlo.
 * Call payoff = max(S_T - K, S_shout - K, 0)
 * Put  payoff = max(K - S_T, K - S_shout, 0)
 */
export function priceShoutMC(params: {
  market: MarketState;
  maturity: number;
  shoutTime: number;
  type: OptionType;
  strike: number;
  paths: number;
  steps: number;
  seed: number;
}): PricingResult {
  const { market, maturity, shoutTime, type, strike, paths, steps, seed } = params;

  const tShout = Math.max(1e-6, Math.min(maturity - 1e-6, shoutTime));
  const stepsShout = Math.max(1, Math.floor((steps * tShout) / maturity));

  const priceFn = (mkt: MarketState) => {
    let sum = 0;

    simulateGBM(
      {
        S0: mkt.spot,
        T: maturity,
        r: mkt.rate,
        q: mkt.dividend,
        sigma: mkt.vol,
        steps,
        paths,
        seed,
      },
      (_i, path) => {
        const S_shout = path[stepsShout] ?? path[path.length - 1]!;
        const S_T = path[path.length - 1]!;

        const payoff =
          type === "call"
            ? Math.max(0, Math.max(S_T, S_shout) - strike)
            : Math.max(0, strike - Math.min(S_T, S_shout));

        sum += payoff;
      }
    );

    return (sum / paths) * Math.exp(-mkt.rate * maturity);
  };

  return finiteDiffGreeks({ base: market, priceFn });
}

// --- Cash & Forward (composer-only primitives) ---------------------------------

export function priceCash(amount: number): PricingResult {
  return { price: amount, greeks: zeroGreeks() };
}

/**
 * Prepaid forward price under continuous carry:
 *   PV = S*e^{-qT} - K*e^{-rT}
 * Greeks are deterministic.
 */
export function priceForward(params: {
  market: MarketState;
  maturity: number;
  delivery: number;
}): PricingResult {
  const { market, maturity, delivery } = params;
  const S = market.spot;
  const q = market.dividend;
  const r = market.rate;
  const T = maturity;

  const pv = S * Math.exp(-q * T) - delivery * Math.exp(-r * T);

  // Delta is prepaid forward delta.
  const delta = Math.exp(-q * T);
  const rho = delivery * T * Math.exp(-r * T) / 100;

  return {
    price: pv,
    greeks: { ...zeroGreeks(), delta, rho },
  };
}
