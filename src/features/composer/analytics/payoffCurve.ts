// src/features/composer/analytics/payoffCurve.ts

import type {
  ComposerLeg,
  MarketState,
  PayoffCurvePoint,
  PayoffSpec,
  PricingResult,
} from "../types";
import { evalPayoff } from "../compiler/payoff";
import { intrinsicPayoff, priceLeg } from "../pricing/router";
import { safeNum } from "../utils/number";
import { portfolioHorizonValue } from "./horizon";

/**
 * Compute portfolio PV (today) as sum(unitPrice * quantity).
 */
export function portfolioPV(legs: ComposerLeg[], market: MarketState, maturity: number): number {
  return legs
    .filter((l) => l.active)
    .reduce((acc, leg) => {
      // PV today uses each leg's own time_to_expiry.
      const unit = priceLeg(leg, market).price;
      return acc + unit * leg.quantity;
    }, 0);
}

/**
 * Compute net Greeks (today) as sum(unitGreek * quantity).
 */
export function portfolioGreeks(legs: ComposerLeg[], market: MarketState, maturity: number): PricingResult["greeks"] {
  return legs
    .filter((l) => l.active)
    .reduce(
      (acc, leg) => {
        const res = priceLeg(leg, market);
        acc.delta += res.greeks.delta * leg.quantity;
        acc.gamma += res.greeks.gamma * leg.quantity;
        acc.vega += res.greeks.vega * leg.quantity;
        acc.theta += res.greeks.theta * leg.quantity;
        acc.rho += res.greeks.rho * leg.quantity;
        acc.vanna += res.greeks.vanna * leg.quantity;
        acc.volga += res.greeks.volga * leg.quantity;
        return acc;
      },
      { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0, vanna: 0, volga: 0 }
    );
}

/**
 * Evaluate terminal payoff (intrinsic) at ST.
 */
export function portfolioIntrinsic(legs: ComposerLeg[], ST: number): number {
  return legs
    .filter((l) => l.active)
    .reduce((acc, leg) => acc + intrinsicPayoff(leg, ST), 0);
}

/**
 * Generate a payoff curve (PnL today vs PnL at expiry) across a spot grid.
 *
 * The payoff-first compiler uses only terminal instruments, so expiryPnL is exact.
 * For path-dependent exotics, expiryPnL is an approximation (0 unless explicitly
 * modelled elsewhere). The UI labels that accordingly.
 */
export function computePayoffCurve(opts: {
  legs: ComposerLeg[];
  market: MarketState;
  maturity: number;
  spotRangePct?: number;
  points?: number;
  payoffSpec?: PayoffSpec;
}): PayoffCurvePoint[] {
  const { legs, market, maturity } = opts;
  const spot = market.spot;
  const rangePct = Math.max(0.05, safeNum(opts.spotRangePct, 0.6));
  const n = Math.max(25, Math.floor(safeNum(opts.points, 81)));

  const lo = Math.max(1e-9, spot * (1 - rangePct));
  const hi = spot * (1 + rangePct);

  // Baseline PV today.
  const basePV = portfolioPV(legs, market, maturity);

  const out: PayoffCurvePoint[] = [];

  for (let i = 0; i < n; i++) {
    const S = lo + (i / (n - 1)) * (hi - lo);

    // Horizon liquidation value (intrinsic for expired legs, PV for longer-dated legs).
    const horizonValue = portfolioHorizonValue({ legs, market, horizon: maturity, spotAtHorizon: S });

    // Current PV by repricing each leg today at the shocked spot.
    const pvNow = legs
      .filter((l) => l.active)
      .reduce((acc, leg) => {
        const unit = priceLeg(leg, { ...market, spot: S }).price;
        return acc + unit * leg.quantity;
      }, 0);

    // Overlay target curve on the same "PnL vs premium" axis.
    const targetPayoff = opts.payoffSpec ? evalPayoff(opts.payoffSpec, S) - basePV : undefined;

    out.push({
      spot: S,
      expiryPnl: horizonValue - basePV,
      currentPnl: pvNow - basePV,
      targetPayoff,
    });
  }

  return out;
}
