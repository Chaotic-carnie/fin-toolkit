// src/features/composer/pricing/router.ts

import { calculatePriceDetails } from "~/features/pricing/engine";
import type {
  ComposerLeg,
  MarketState,
  PricingResult,
  OptionType,
  ComposerInstrument,
  BarrierType,
} from "../types";
import { safeNum } from "../utils/number";
import {
  priceAssetOrNothing,
  priceCash,
  priceChooserMC,
  priceCompoundMC,
  priceForward,
  priceGap,
  priceLookbackMC,
  priceShoutMC,
} from "./exotics";

function zeroGreeks() {
  return { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0, vanna: 0, volga: 0 };
}

function pickGreeks(out: any) {
  return {
    ...zeroGreeks(),
    delta: safeNum(out.delta),
    gamma: safeNum(out.gamma),
    vega: safeNum(out.vega),
    theta: safeNum(out.theta),
    rho: safeNum(out.rho),
    vanna: safeNum(out.vanna),
    volga: safeNum(out.volga),
  };
}

/**
 * Route a leg to the correct pricing engine.
 *
 * - For instruments supported by the site's central pricing engine, we call
 * calculatePriceDetails(...) directly (fast, consistent).
 * - For composer-only exotics we use analytic or MC models.
 */
export function priceLeg(leg: ComposerLeg, market: MarketState, maturityOverride?: number): PricingResult {
  const p = leg.params ?? {};
  const instrument: ComposerInstrument = leg.instrument;

  const T = Math.max(1e-6, maturityOverride ?? safeNum(p.time_to_expiry, safeNum(p.T, 0.25)));
  
  // FIX: Reversed priority! 
  // We MUST prioritize the `market` argument over the `p` argument.
  // Otherwise, the compiler's hardcoded leg params will block the heatmap's spot/vol shocks.
  const S = Math.max(1e-9, safeNum(market.spot, p.spot));
  const sigma = Math.max(1e-9, safeNum(market.vol, p.vol));
  const r = safeNum(market.rate, p.risk_free_rate);
  const q = safeNum(market.dividend, p.dividend_yield);

  const optionType = (p.option_type || p.type || "call") as OptionType;
  const K = Math.max(1e-9, safeNum(p.strike ?? p.K, S));

  // --- Composer primitives
  if (instrument === "cash") {
    // For a cash leg, quantity is the cash amount.
    return priceCash(1);
  }

  if (instrument === "forward") {
    const delivery = safeNum(p.delivery ?? p.K ?? 0, 0);
    return priceForward({ market: { ...market, spot: S, vol: sigma, rate: r, dividend: q }, maturity: T, delivery });
  }

  // --- Central engine supported instruments
  if (instrument === "vanilla") {
    const out = calculatePriceDetails("black_scholes", "vanilla", {
      type: optionType,
      S,
      K,
      T,
      r,
      q,
      sigma,
    });
    return { price: out.price, greeks: pickGreeks(out) };
  }

  if (instrument === "digital") {
    const payout = safeNum(p.payout, 100);
    const out = calculatePriceDetails("black_scholes", "digital", {
      type: optionType,
      S,
      K,
      T,
      r,
      q,
      sigma,
      payout,
    });
    return { price: out.price, greeks: pickGreeks(out) };
  }

  if (instrument === "barrier") {
    const H = Math.max(1e-9, safeNum(p.barrier ?? p.H, S * 0.9));
    const barrierType = (p.barrier_type || p.barrierType || "down-out") as BarrierType;
    const paths = Math.max(200, Math.floor(safeNum(p.paths, 2500)));
    const steps = Math.max(25, Math.floor(safeNum(p.steps, 80)));
    const out = calculatePriceDetails("mc_bridge", "barrier", {
      type: optionType,
      S,
      K,
      T,
      r,
      q,
      sigma,
      H,
      barrierType,
      paths,
      steps,
      seed: safeNum(p.seed, 12345),
    });
    return { price: out.price, greeks: pickGreeks(out) };
  }

  if (instrument === "american") {
    const steps = Math.max(50, Math.floor(safeNum(p.steps, 200)));
    const out = calculatePriceDetails("binomial_crr", "american", {
      type: optionType,
      S,
      K,
      T,
      r,
      q,
      sigma,
      steps,
    });
    return { price: out.price, greeks: pickGreeks(out) };
  }

  if (instrument === "asian") {
    // Default: geometric closed form if available; fall back to arithmetic MC.
    const method = (p.method || "geometric_closed") as "geometric_closed" | "arithmetic_mc";

    if (method === "geometric_closed") {
      const out = calculatePriceDetails("geometric_closed", "asian", {
        type: optionType,
        S,
        K,
        T,
        r,
        q,
        sigma,
      });
      return { price: out.price, greeks: pickGreeks(out) };
    }

    const paths = Math.max(500, Math.floor(safeNum(p.paths, 4000)));
    const fixings = Math.max(12, Math.floor(safeNum(p.fixings, 252)));
    const out = calculatePriceDetails("arithmetic_mc", "asian", {
      type: optionType,
      S,
      K,
      T,
      r,
      q,
      sigma,
      paths,
      fixings,
      seed: safeNum(p.seed, 12345),
    });
    return { price: out.price, greeks: pickGreeks(out) };
  }

  // --- Composer-only exotics
  if (instrument === "binary_asset") {
    return priceAssetOrNothing({ market: { ...market, spot: S, vol: sigma, rate: r, dividend: q }, maturity: T, type: optionType, K });
  }

  if (instrument === "gap") {
    const K_trigger = Math.max(1e-9, safeNum(p.K_trigger ?? p.trigger ?? K, K));
    const K_pay = Math.max(1e-9, safeNum(p.K_pay ?? p.payStrike ?? K, K));
    return priceGap({ market: { ...market, spot: S, vol: sigma, rate: r, dividend: q }, maturity: T, type: optionType, K_trigger, K_pay });
  }

  if (instrument === "chooser") {
    const chooseTime = safeNum(p.chooseTime, T * 0.5);
    return priceChooserMC({
      market: { ...market, spot: S, vol: sigma, rate: r, dividend: q },
      maturity: T,
      chooseTime,
      strike: K,
      paths: Math.max(300, Math.floor(safeNum(p.paths, 3000))),
      steps: Math.max(25, Math.floor(safeNum(p.steps, 80))),
      seed: Math.floor(safeNum(p.seed, 12345)),
    });
  }

  if (instrument === "compound") {
    const outerTime = safeNum(p.outerTime, T * 0.5);
    const outerType = (p.outerType || optionType) as OptionType;
    const innerType = (p.innerType || optionType) as OptionType;
    const outerStrike = Math.max(0, safeNum(p.outerStrike, 1));
    const innerStrike = Math.max(1e-9, safeNum(p.innerStrike, K));

    return priceCompoundMC({
      market: { ...market, spot: S, vol: sigma, rate: r, dividend: q },
      maturity: T,
      outerTime,
      outerType,
      outerStrike,
      innerType,
      innerStrike,
      paths: Math.max(300, Math.floor(safeNum(p.paths, 3000))),
      steps: Math.max(25, Math.floor(safeNum(p.steps, 80))),
      seed: Math.floor(safeNum(p.seed, 12345)),
    });
  }

  if (instrument === "lookback") {
    return priceLookbackMC({
      market: { ...market, spot: S, vol: sigma, rate: r, dividend: q },
      maturity: T,
      type: optionType,
      strike: K,
      paths: Math.max(300, Math.floor(safeNum(p.paths, 3000))),
      steps: Math.max(25, Math.floor(safeNum(p.steps, 120))),
      seed: Math.floor(safeNum(p.seed, 12345)),
    });
  }

  if (instrument === "shout") {
    const shoutTime = safeNum(p.shoutTime, T * 0.5);
    return priceShoutMC({
      market: { ...market, spot: S, vol: sigma, rate: r, dividend: q },
      maturity: T,
      shoutTime,
      type: optionType,
      strike: K,
      paths: Math.max(300, Math.floor(safeNum(p.paths, 3000))),
      steps: Math.max(25, Math.floor(safeNum(p.steps, 120))),
      seed: Math.floor(safeNum(p.seed, 12345)),
    });
  }

  // Fallback: treat as vanilla.
  const out = calculatePriceDetails("black_scholes", "vanilla", {
    type: optionType,
    S,
    K,
    T,
    r,
    q,
    sigma,
  });
  return { price: out.price, greeks: pickGreeks(out) };
}

/**
 * Intrinsic payoff at maturity for *terminal* instruments.
 *
 * For path-dependent exotics, this returns an approximation based on terminal spot.
 * The composer UI labels these as approximations when used in payoff charts.
 */
export function intrinsicPayoff(leg: ComposerLeg, ST: number): number {
  const p = leg.params ?? {};
  const instrument = leg.instrument;
  const qty = leg.quantity;

  if (!leg.active) return 0;

  if (instrument === "cash") {
    return qty;
  }

  if (instrument === "forward") {
    const K = safeNum(p.delivery ?? p.K ?? 0, 0);
    return qty * (ST - K);
  }

  const type = (p.option_type || p.type || "call") as OptionType;
  const K = Math.max(1e-9, safeNum(p.strike ?? p.K, ST));

  if (instrument === "vanilla") {
    return qty * (type === "call" ? Math.max(0, ST - K) : Math.max(0, K - ST));
  }

  if (instrument === "digital") {
    const payout = safeNum(p.payout, 100);
    const itm = type === "call" ? ST > K : ST < K;
    return qty * (itm ? payout : 0);
  }

  if (instrument === "binary_asset") {
    const itm = type === "call" ? ST > K : ST < K;
    return qty * (itm ? ST : 0);
  }

  if (instrument === "gap") {
    const K_trigger = Math.max(1e-9, safeNum(p.K_trigger ?? p.trigger ?? K, K));
    const K_pay = Math.max(1e-9, safeNum(p.K_pay ?? p.payStrike ?? K, K));
    const itm = type === "call" ? ST > K_trigger : ST < K_trigger;
    if (!itm) return 0;
    return qty * (type === "call" ? Math.max(0, ST - K_pay) : Math.max(0, K_pay - ST));
  }

  // For path-dependent exotics, return 0 (they need MC for expected payoff).
  return 0;
}