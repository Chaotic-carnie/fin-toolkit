// src/features/composer/analytics/heatmap.ts

import type { ComposerLeg, MarketState } from "../types";
import { portfolioPV } from "./payoffCurve";
import { priceLeg } from "../pricing/router";

/**
 * Scenario heatmap (Spot Shock x Vol Shock) showing PnL change relative to today.
 */
export function computeHeatmap(opts: {
  legs: ComposerLeg[];
  market: MarketState;
  maturity: number;
  spotShocks?: number[]; // in pct, e.g. [-0.2, -0.1, 0, 0.1, 0.2]
  volShocks?: number[]; // absolute sigma shock, e.g. [-0.1, 0, 0.1]
}): {
  xAxis: number[];
  yAxis: number[];
  grid: { spotShock: number; volShock: number; pnl: number }[][];
} {
  const { legs, market, maturity } = opts;

  const xAxis = opts.spotShocks ?? [-0.3, -0.15, 0, 0.15, 0.3];
  const yAxis = opts.volShocks ?? [-0.15, -0.05, 0, 0.05, 0.15];

  const basePV = portfolioPV(legs, market, maturity);

  const grid = yAxis.map((volShock) =>
    xAxis.map((spotShock) => {
      const shockedMarket: MarketState = {
        ...market,
        spot: market.spot * (1 + spotShock),
        vol: Math.max(1e-9, market.vol + volShock),
      };

      const pv = legs
        .filter((l) => l.active)
        .reduce((acc, leg) => {
          const unit = priceLeg(leg, shockedMarket).price;
          return acc + unit * leg.quantity;
        }, 0);

      return {
        spotShock,
        volShock,
        pnl: pv - basePV,
      };
    })
  );

  return { xAxis, yAxis, grid };
}
