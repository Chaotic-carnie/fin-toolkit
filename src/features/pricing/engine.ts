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
  vanna: number; 
  volga: number; 
};

// --- Solvers ---

const solveBlackScholes = (inputs: any, isDigital = false) => {
  const { S, K, T, r, q, sigma, type, payout } = inputs;
  if (T <= 0) return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S); // Intrinsic value if expired
  
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const isCall = type === 'call';
  const sign = isCall ? 1 : -1;

  if (isDigital) {
    // FIX: Ensure payout is treated as a number, defaulting to 1 only if undefined
    const cash = payout !== undefined ? Number(payout) : 1;
    return cash * Math.exp(-r * T) * N(sign * d2);
  }

  const term1 = S * Math.exp(-q * T) * N(sign * d1);
  const term2 = K * Math.exp(-r * T) * N(sign * d2);
  return sign * (term1 - term2);
};

const solveBinomial = (inputs: any, isAmerican = false) => {
  // FIX: Added default steps = 100 if undefined
  const { S, K, T, r, q, sigma, type } = inputs;
  const steps = inputs.steps || 100; 
  
  if (T <= 0) return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);

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
  const { S, K, T, r, q, sigma, type, seed } = inputs;
  
  // FIX 1: Align default H and BarrierType. 
  // If H > S, default should be 'up-out'. If H < S, 'down-out'.
  // We default to 'up-out' to match config.ts defaults (H=120, S=100).
  const H = inputs.H || (type === 'call' ? S * 1.2 : S * 0.8);
  const barrierType = inputs.barrierType || 'up-out'; // CHANGED from 'down-and-out'

  const paths = inputs.paths || 1000;
  const steps = inputs.steps || 50;

  const dt = T / steps;
  const drift = (r - q - 0.5 * sigma ** 2) * dt;
  const volSqDt = sigma * Math.sqrt(dt);
  const isCall = type === 'call';
  const isUp = barrierType.includes('up');
  const isOut = barrierType.includes('out');

  // FIX 2: Instant Knock-out Check (Time 0)
  // If the starting spot is already violating the barrier, value is 0 immediately.
  if (isUp && S >= H && isOut) return 0;
  if (!isUp && S <= H && isOut) return 0;
  
  const rng = createRNG(seed || 1234);
  let sum = 0;

  for (let i = 0; i < paths; i++) {
    let currentS = S;
    let alive = true; // "alive" means "has not hit the barrier"

    for (let j = 0; j < steps; j++) {
      const prevS = currentS;
      currentS = currentS * Math.exp(drift + volSqDt * randn(rng));

      let hit = false;
      if (isUp && currentS >= H) hit = true;
      if (!isUp && currentS <= H) hit = true;

      // Brownian Bridge Correction
      if (useBridge && !hit) {
        // Probability of hitting barrier between steps
        const p_hit = Math.exp(-2 * Math.log(prevS / H) * Math.log(currentS / H) / (sigma ** 2 * dt));
        if (rng() < p_hit) hit = true;
      }

      if (hit) {
        alive = false;
        break;
      }
    }

    // Payoff Logic
    // If Out-option: Must remain alive to pay.
    // If In-option: Must die (hit barrier) to pay.
    
    if (isOut && !alive) continue; 
    if (!isOut && alive) continue; 

    const payoff = Math.max(0, isCall ? currentS - K : K - currentS);
    sum += payoff;
  }

  return (sum / paths) * Math.exp(-r * T);
};

const solveAsian = (inputs: any, isGeometric = false) => {
  // FIX: Ensure types are destructured from inputs correctly
  const { S, K, T, r, q, sigma, type, seed } = inputs;
  const paths = inputs.paths || 1000;
  const fixings = inputs.fixings || 30;
  const isCall = type === 'call';

  if (isGeometric) {
    // FIX: Standard Geometric Asian Adjustment
    // Effective Volatility: sigma_geo = sigma / sqrt(3)
    // Effective Cost of Carry: b_geo = 0.5 * (r - q - sigma^2/6)
    // Actually, usually priced as BS(S, K, T, r, q_eff, sigma_eff)
    // where q_eff = r - 0.5*(r - q - sigma^2/6).
    
    const sigmaGeo = sigma / Math.sqrt(3);
    const bGeo = 0.5 * (r - q - (sigma ** 2) / 6);
    
    // We can map this to Black-Scholes Formula by adjusting 'q'
    // standard BS uses q in d1 as: (r - q + 0.5*sigma^2)
    // We need d1 = (ln(S/K) + (bGeo + 0.5*sigmaGeo^2)*T) / ...
    
    const d1 = (Math.log(S / K) + (bGeo + 0.5 * sigmaGeo ** 2) * T) / (sigmaGeo * Math.sqrt(T));
    const d2 = d1 - sigmaGeo * Math.sqrt(T);
    
    const sign = isCall ? 1 : -1;
    const term1 = S * Math.exp((bGeo - r) * T) * N(sign * d1);
    const term2 = K * Math.exp(-r * T) * N(sign * d2);
    
    return sign * (term1 - term2);
  }

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
  // Ensure basic inputs exist
  const S = inputs.S || 100;
  const K = inputs.K || 100;
  const T = inputs.T || 1.0;
  const r = inputs.r || 0.05;
  const q = inputs.q || 0;
  const sigma = inputs.sigma || 0.2;
  const type = inputs.option_type || 'call';
  
  const cleaned = { ...inputs, S, K, T, r, q, sigma, type };

  switch (methodKey) {
    case 'black_scholes': 
      // FIX: Check if payout is explicitly in the inputs to trigger Digital pricing
      return solveBlackScholes(cleaned, cleaned.payout !== undefined);
    case 'binomial_crr': return solveBinomial(cleaned, cleaned.key === 'american');
    case 'mc_discrete': return solveMonteCarloBarrier(cleaned, false);
    case 'mc_bridge': return solveMonteCarloBarrier(cleaned, true);
    case 'geometric_closed': return solveAsian(cleaned, true);
    case 'arithmetic_mc': return solveAsian(cleaned, false);
    case 'discounted_value': 
      // Note: This calculates Value (NPV), not Forward Price.
      return (S * Math.exp(-q * T)) - (K * Math.exp(-r * T));
    default: return 0;
  }
};


export const computeResult = async (methodKey: string, instrumentKey: string, inputs: any): Promise<PricingResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(calculatePriceDetails(methodKey, instrumentKey, inputs));
    }, 50);
  });
};

export const calculatePriceDetails = (methodKey: string, instrumentKey: string, inputs: any) => {
    const baseInputs = { ...inputs, key: instrumentKey };
    const price = calculatePrice(methodKey, baseInputs);

    // Finite Difference Bumps
    const dS = inputs.S * 0.01;
    const dT = 1 / 365; 
    const dVol = 0.01;
    const dR = 0.01;

    // 1st Order Bumps
    const p_up = calculatePrice(methodKey, { ...baseInputs, S: inputs.S + dS });
    const p_down = calculatePrice(methodKey, { ...baseInputs, S: inputs.S - dS });
    const p_vol_up = calculatePrice(methodKey, { ...baseInputs, sigma: inputs.sigma + dVol });
    const p_vol_down = calculatePrice(methodKey, { ...baseInputs, sigma: inputs.sigma - dVol });
    const p_time_down = calculatePrice(methodKey, { ...baseInputs, T: inputs.T - dT }); // Renamed for clarity
    const p_rho_up = calculatePrice(methodKey, { ...baseInputs, r: inputs.r + dR });

    // 2nd Order Cross-Bumps (For Vanna & Volga)
    // To find Vanna (dDelta/dVol), we need Delta at bumped Vol levels
    const p_up_vol_up = calculatePrice(methodKey, { ...baseInputs, S: inputs.S + dS, sigma: inputs.sigma + dVol });
    const p_down_vol_up = calculatePrice(methodKey, { ...baseInputs, S: inputs.S - dS, sigma: inputs.sigma + dVol });
    
    const p_up_vol_down = calculatePrice(methodKey, { ...baseInputs, S: inputs.S + dS, sigma: inputs.sigma - dVol });
    const p_down_vol_down = calculatePrice(methodKey, { ...baseInputs, S: inputs.S - dS, sigma: inputs.sigma - dVol });

    // Standard Greeks
    const delta = (p_up - p_down) / (2 * dS);
    const gamma = (p_up - 2 * price + p_down) / (dS ** 2);
    const vega = (p_vol_up - p_vol_down) / (2 * dVol) / 100;
    
    // Theta is usually priced as (Price(T - dT) - Price(T)) / dT
    // Assuming you want it as a daily decay based on your dT = 1/365
    const theta = (p_time_down - price); 
    const rho = (p_rho_up - price) / 100;

    // Higher-Order Greeks via Finite Difference
    // 1. Calculate Delta at Vol Up and Vol Down
    const delta_vol_up = (p_up_vol_up - p_down_vol_up) / (2 * dS);
    const delta_vol_down = (p_up_vol_down - p_down_vol_down) / (2 * dS);
    
    // Vanna: d(Delta)/d(Vol)
    const vanna = (delta_vol_up - delta_vol_down) / (2 * dVol) / 100;

    // Volga: d2(Price)/d(Vol)2
    const volga = (p_vol_up - 2 * price + p_vol_down) / (dVol ** 2) / 10000; // Scaled to match Vega's /100 convention

    return { 
        price, 
        delta, 
        gamma, 
        vega, 
        theta, 
        rho, 
        vanna: isNaN(vanna) ? 0 : vanna, 
        volga: isNaN(volga) ? 0 : volga 
    };
};