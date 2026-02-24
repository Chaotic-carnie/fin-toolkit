// src/features/composer/analytics/horizon.ts

import type { ComposerLeg, MarketState } from "../types";
import { intrinsicPayoff, priceLeg } from "../pricing/router";
import { safeNum } from "../utils/number";

/**
 * Portfolio value at a *future horizon* (years from today) as a function of spot-at-horizon.
 *
 * Why do we need this?
 * - A payoff compiler targets a single maturity T.
 * - Greek shaping may introduce longer-dated legs (e.g. calendars).
 * - A single terminal payoff is still well-defined if we interpret it as
 *   "liquidate the whole portfolio at horizon T".
 *
 * Model assumption:
 * - For legs expiring AFTER the horizon, we approximate their liquidation value
 *   as their model price with remaining time to expiry (T_leg - horizon).
 * - For path-dependent exotics, this ignores path history; we label it as an approximation.
 */
export function portfolioHorizonValue(opts: {
  legs: ComposerLeg[];
  market: MarketState;
  horizon: number;
  spotAtHorizon: number;
}): number {
  const { legs, market, horizon, spotAtHorizon } = opts;
  const S = Math.max(1e-9, spotAtHorizon);

  return legs
    .filter((l) => l.active)
    .reduce((acc, leg) => {
      const p = leg.params ?? {};
      const T_leg = safeNum(p.time_to_expiry ?? p.T, horizon);

      // Expired at or before horizon -> intrinsic settlement.
      if (T_leg <= horizon + 1e-12) {
        return acc + intrinsicPayoff(leg, S);
      }

      // Still alive -> liquidation value at horizon (PV with remaining time).
      const T_rem = Math.max(1e-12, T_leg - horizon);
      const unit = priceLeg(leg, { ...market, spot: S }, T_rem).price;
      return acc + unit * leg.quantity;
    }, 0);
}
