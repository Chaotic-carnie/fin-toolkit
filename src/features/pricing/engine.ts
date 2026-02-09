// src/features/pricing/engine.ts

// --- RNG Utils ---
// Simple Linear Congruential Generator for seeding
const createRNG = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

// Box-Muller with Seeded RNG
const randn = (rng: () => number) => {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const N = (x: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.39894228040 * Math.exp(-x * x / 2);
  const prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - prob : prob;
};

export type PricingResult = {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
};

// --- Solvers ---

const solveBlackScholes = (inputs: any, isDigital = false) => {
  const { S, K, T, r, q, sigma, type, payout } = inputs;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const isCall = type === 'call';
  const sign = isCall ? 1 : -1;

  if (isDigital) {
    return (payout || 1) * Math.exp(-r * T) * N(sign * d2);
  }

  const term1 = S * Math.exp(-q * T) * N(sign * d1);
  const term2 = K * Math.exp(-r * T) * N(sign * d2);
  return sign * (term1 - term2);
};

const solveBinomial = (inputs: any, isAmerican = false) => {
  const { S, K, T, r, q, sigma, type, steps } = inputs;
  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  const df = Math.exp(-r * dt);
  const isCall = type === 'call';

  let prices = new Float64Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    const spot = S * Math.pow(u, steps - i) * Math.pow(d, i);
    prices[i] = Math.max(0, isCall ? spot - K : K - spot);
  }

  for (let j = steps - 1; j >= 0; j--) {
    for (let i = 0; i <= j; i++) {
      const continuation = df * (p * prices[i] + (1 - p) * prices[i + 1]);
      if (isAmerican) {
        const spot = S * Math.pow(u, j - i) * Math.pow(d, i);
        const exercise = Math.max(0, isCall ? spot - K : K - spot);
        prices[i] = Math.max(continuation, exercise);
      } else {
        prices[i] = continuation;
      }
    }
  }
  return prices[0];
};

const solveMonteCarloBarrier = (inputs: any, useBridge = false) => {
  const { S, K, T, r, q, sigma, type, H, barrierType, paths, steps, seed } = inputs;
  const dt = T / steps;
  const drift = (r - q - 0.5 * sigma ** 2) * dt;
  const volSqDt = sigma * Math.sqrt(dt);
  const isCall = type === 'call';
  const isUp = barrierType.includes('up');
  const isOut = barrierType.includes('out');
  
  // Use Seeded RNG
  const rng = createRNG(seed || 1234);

  let sum = 0;

  for (let i = 0; i < paths; i++) {
    let currentS = S;
    let alive = true;

    for (let j = 0; j < steps; j++) {
      const prevS = currentS;
      currentS = currentS * Math.exp(drift + volSqDt * randn(rng));

      let hit = false;
      if (useBridge) {
        const maxS = Math.max(prevS, currentS);
        const minS = Math.min(prevS, currentS);
        if (isUp && maxS >= H) hit = true;
        else if (!isUp && minS <= H) hit = true;
      } 
      
      if (isUp && currentS >= H) hit = true;
      if (!isUp && currentS <= H) hit = true;

      if (hit) {
        alive = false;
        break;
      }
    }

    if (isOut && !alive) { sum += 0; continue; }

    if (alive) {
      const payoff = Math.max(0, isCall ? currentS - K : K - currentS);
      sum += payoff;
    }
  }

  return (sum / paths) * Math.exp(-r * T);
};

const solveAsian = (inputs: any, isGeometric = false) => {
  const { S, K, T, r, q, sigma, type, paths, fixings, seed } = inputs;
  const isCall = type === 'call';

  if (isGeometric) {
    const adjSigma = sigma / Math.sqrt(3);
    const b = 0.5 * (r - q - 0.5 * sigma ** 2) + 0.5 * adjSigma ** 2;
    const d1 = (Math.log(S / K) + (b + 0.5 * adjSigma ** 2) * T) / (adjSigma * Math.sqrt(T));
    const d2 = d1 - adjSigma * Math.sqrt(T);
    const term1 = S * Math.exp((b - r) * T) * N(isCall ? d1 : -d1);
    const term2 = K * Math.exp(-r * T) * N(isCall ? d2 : -d2);
    return isCall ? term1 - term2 : term2 - term1;
  }

  // Arithmetic MC
  const dt = T / fixings;
  const drift = (r - q - 0.5 * sigma ** 2) * dt;
  const volSqDt = sigma * Math.sqrt(dt);
  const rng = createRNG(seed || 1234);
  let sumPayoff = 0;

  for (let i = 0; i < paths; i++) {
    let currentS = S;
    let avgS = 0;
    for (let j = 0; j < fixings; j++) {
      currentS = currentS * Math.exp(drift + volSqDt * randn(rng));
      avgS += currentS;
    }
    avgS /= fixings;
    sumPayoff += Math.max(0, isCall ? avgS - K : K - avgS);
  }

  return (sumPayoff / paths) * Math.exp(-r * T);
};

const calculatePrice = (methodKey: string, inputs: any) => {
  switch (methodKey) {
    case 'black_scholes': return solveBlackScholes(inputs, inputs.payout !== undefined);
    case 'binomial_crr': return solveBinomial(inputs, inputs.key === 'american');
    case 'mc_discrete': return solveMonteCarloBarrier(inputs, false);
    case 'mc_bridge': return solveMonteCarloBarrier(inputs, true);
    case 'geometric_closed': return solveAsian(inputs, true);
    case 'arithmetic_mc': return solveAsian(inputs, false);
    case 'discounted_value': 
      return (inputs.S * Math.exp(-inputs.q * inputs.T)) - (inputs.K * Math.exp(-inputs.r * inputs.T));
    default: return 0;
  }
};

export const computeResult = async (methodKey: string, instrumentKey: string, inputs: any): Promise<PricingResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const baseInputs = { ...inputs, key: instrumentKey };
      const price = calculatePrice(methodKey, baseInputs);

      // Finite Difference Greeks
      const dS = inputs.S * 0.01;
      const dT = 1 / 365; // 1 Day
      const dVol = 0.01;
      const dR = 0.01;

      const p_up = calculatePrice(methodKey, { ...baseInputs, S: inputs.S + dS });
      const p_down = calculatePrice(methodKey, { ...baseInputs, S: inputs.S - dS });
      
      const p_vol = calculatePrice(methodKey, { ...baseInputs, sigma: inputs.sigma + dVol });
      
      // Theta: Price at (T - 1 day) - Current Price. 
      // Correct interpretation: How much value is lost as one day passes.
      const p_time = calculatePrice(methodKey, { ...baseInputs, T: inputs.T - dT });
      
      const p_rho = calculatePrice(methodKey, { ...baseInputs, r: inputs.r + dR });

      const delta = (p_up - p_down) / (2 * dS);
      const gamma = (p_up - 2 * price + p_down) / (dS ** 2);
      const vega = (p_vol - price) / 100;
      const theta = (p_time - price); 
      const rho = (p_rho - price) / 100;

      resolve({ price, delta, gamma, vega, theta, rho });
    }, 50);
  });
};

export const calculatePriceDetails = (methodKey: string, instrumentKey: string, inputs: any) => {
    const baseInputs = { ...inputs, key: instrumentKey };
    const price = calculatePrice(methodKey, baseInputs);

    // Finite Difference Greeks (Same logic as before)
    const dS = inputs.S * 0.01;
    const dT = 1 / 365; 
    const dVol = 0.01;
    const dR = 0.01;

    const p_up = calculatePrice(methodKey, { ...baseInputs, S: inputs.S + dS });
    const p_down = calculatePrice(methodKey, { ...baseInputs, S: inputs.S - dS });
    const p_vol = calculatePrice(methodKey, { ...baseInputs, sigma: inputs.sigma + dVol });
    const p_time = calculatePrice(methodKey, { ...baseInputs, T: inputs.T - dT });
    const p_rho = calculatePrice(methodKey, { ...baseInputs, r: inputs.r + dR });

    const delta = (p_up - p_down) / (2 * dS);
    const gamma = (p_up - 2 * price + p_down) / (dS ** 2);
    const vega = (p_vol - price) / 100;
    const theta = (p_time - price);
    const rho = (p_rho - price) / 100;

    return { price, delta, gamma, vega, theta, rho };
};