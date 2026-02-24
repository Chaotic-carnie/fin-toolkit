// src/features/composer/pricing/mc.ts

import { createRNG, randn } from "./rng";

export type MCParams = {
  S0: number;
  T: number;
  r: number;
  q: number;
  sigma: number;
  steps: number;
  paths: number;
  seed: number;
};

/**
 * Simulate GBM paths and call a per-path callback.
 *
 * This avoids storing a giant (paths x steps) matrix in memory.
 */
export function simulateGBM(
  params: MCParams,
  onPath: (pathIndex: number, spots: Float64Array) => void
) {
  const { S0, T, r, q, sigma, steps, paths, seed } = params;
  const dt = T / steps;
  const drift = (r - q - 0.5 * sigma * sigma) * dt;
  const vol = sigma * Math.sqrt(dt);

  const rng = createRNG(seed);

  // We re-use a single array to reduce GC. The callback must copy if it wants persistence.
  const spots = new Float64Array(steps + 1);

  for (let i = 0; i < paths; i++) {
    let S = S0;
    spots[0] = S;

    for (let j = 1; j <= steps; j++) {
      S = S * Math.exp(drift + vol * randn(rng));
      spots[j] = S;
    }

    onPath(i, spots);
  }
}
