// src/features/composer/pricing/rng.ts

/**
 * Simple deterministic RNG (LCG) to make Monte Carlo results reproducible
 * across renders and across environments.
 */
export function createRNG(seed: number) {
  let state = (seed >>> 0) || 123456789;
  return () => {
    // Numerical Recipes LCG
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Box-Muller transform. */
export function randn(rng: () => number) {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
