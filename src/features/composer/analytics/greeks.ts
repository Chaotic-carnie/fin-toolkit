// src/features/composer/analytics/greeks.ts

import type { ComposerLeg, GreekRegion, MarketState, GreekSnapshot } from "../types";
import { portfolioGreeks } from "./payoffCurve";

function regionSpot(spot: number, region: GreekRegion, widthPct: number) {
  const w = widthPct / 100;
  if (region === "downside") return Math.max(1e-9, spot * (1 - w));
  if (region === "upside") return spot * (1 + w);
  return spot;
}

/**
 * Compute greek snapshots at 3 region points (downside / atm / upside).
 */
export function computeGreekSnapshots(opts: {
  legs: ComposerLeg[];
  market: MarketState;
  maturity: number;
  zoneWidthPct: number;
}): GreekSnapshot[] {
  const { legs, market, maturity, zoneWidthPct } = opts;
  const regions: GreekRegion[] = ["downside", "atm", "upside"];

  return regions.map((region) => {
    const spot = regionSpot(market.spot, region, zoneWidthPct);
    const greeks = portfolioGreeks(legs, { ...market, spot }, maturity);
    return { spot, greeks };
  });
}
