import { z } from "zod";

// --- RNG Utils ---
const createRNG = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

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

// --- STRICT VALIDATION HELPER ---
// This throws a fatal error if any required parameter is missing or invalid.
const requireNumber = (val: any, name: string): number => {
  if (val === undefined || val === null || val === '') {
    throw new Error(`CRITICAL ENGINE ERROR: Missing required parameter '${name}'`);
  }
  const num = Number(val);
  if (Number.isNaN(num)) {
    throw new Error(`CRITICAL ENGINE ERROR: Parameter '${name}' must be a valid number. Received: ${val}`);
  }
  return num;
};


// --- Solvers (No Defaults Allowed) ---

const solveBlackScholes = (inputs: any, isDigital = false) => {
  const { S, K, T, r, q, sigma, type, payout } = inputs;
  const isCall = type === 'call';
  const sign = isCall ? 1 : -1;

  if (T <= 0) {
    if (isDigital) return isCall ? (S > K ? payout : 0) : (S < K ? payout : 0);
    return isCall ? Math.max(0, S - K) : Math.max(0, K - S); 
  }
  
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  if (isDigital) {
    return payout * Math.exp(-r * T) * N(sign * d2);
  }

  const term1 = S * Math.exp(-q * T) * N(sign * d1);
  const term2 = K * Math.exp(-r * T) * N(sign * d2);
  return sign * (term1 - term2);
};

const solveBinomial = (inputs: any, isAmerican = false) => {
  const { S, K, T, r, q, sigma, type, steps } = inputs;
  const isCall = type === 'call';
  
  if (T <= 0) return isCall ? Math.max(0, S - K) : Math.max(0, K - S);

  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  const df = Math.exp(-r * dt);

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
  const { S, K, T, r, q, sigma, type, seed, H, barrierType, paths, steps } = inputs;
  
  const dt = T / steps;
  const drift = (r - q - 0.5 * sigma ** 2) * dt;
  const volSqDt = sigma * Math.sqrt(dt);
  const isCall = type === 'call';
  const isUp = barrierType.includes('up');
  const isOut = barrierType.includes('out');

  if (isUp && S >= H && isOut) return 0;
  if (!isUp && S <= H && isOut) return 0;
  
  const rng = createRNG(seed || 1234); // Seed remains optional
  let sum = 0;

  for (let i = 0; i < paths; i++) {
    let currentS = S;
    let alive = true; 

    for (let j = 0; j < steps; j++) {
      const prevS = currentS;
      currentS = currentS * Math.exp(drift + volSqDt * randn(rng));

      let hit = false;
      if (isUp && currentS >= H) hit = true;
      if (!isUp && currentS <= H) hit = true;

      if (useBridge && !hit) {
        const p_hit = Math.exp(-2 * Math.log(prevS / H) * Math.log(currentS / H) / (sigma ** 2 * dt));
        if (rng() < p_hit) hit = true;
      }

      if (hit) {
        alive = false;
        if (isOut) break; 
      }
    }

    if (isOut && !alive) continue; 
    if (!isOut && alive) continue; 

    const payoff = Math.max(0, isCall ? currentS - K : K - currentS);
    sum += payoff;
  }

  return (sum / paths) * Math.exp(-r * T);
};

const solveAsian = (inputs: any, isGeometric = false) => {
  const { S, K, T, r, q, sigma, type, seed, paths, fixings } = inputs;
  const isCall = type === 'call';

  if (isGeometric) {
    const sigmaGeo = sigma / Math.sqrt(3);
    const bGeo = 0.5 * (r - q - (sigma ** 2) / 6);
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

// --- CORE ROUTER & VALIDATOR ---
const calculatePrice = (methodKey: string, inputs: any) => {
  const instrumentKey = inputs.key;

  // 1. STRICT REQUIREMENT FOR CORE MARKET PARAMS
  const S = requireNumber(inputs.S, 'Spot Price (S)');
  const K = requireNumber(inputs.K, 'Strike Price (K)');
  const T = requireNumber(inputs.T, 'Time to Expiry (T)');
  const r = requireNumber(inputs.r, 'Risk-Free Rate (r)');
  const q = requireNumber(inputs.q, 'Dividend Yield (q)');
  const sigma = requireNumber(inputs.sigma, 'Volatility (sigma)');
  
  // 2. STRICT OPTION TYPE VALIDATION
  let type = 'call';
  if (instrumentKey !== 'forward') {
    const rawType = inputs.type || inputs.option_type;
    if (!rawType || (rawType.toLowerCase() !== 'call' && rawType.toLowerCase() !== 'put')) {
      throw new Error("CRITICAL ENGINE ERROR: Option 'type' must be 'call' or 'put'");
    }
    type = rawType.toLowerCase();
  }
  
  const cleaned: any = { ...inputs, S, K, T, r, q, sigma, type };

  // 3. STRICT INSTRUMENT/METHOD VALIDATION
  if (instrumentKey === 'digital') {
    cleaned.payout = requireNumber(inputs.payout, 'Cash Payout');
  }
  if (instrumentKey === 'barrier') {
    cleaned.H = requireNumber(inputs.H, 'Barrier Level (H)');
    if (!inputs.barrierType) throw new Error("CRITICAL ENGINE ERROR: Missing 'barrierType'");
  }
  if (methodKey === 'binomial_crr') {
    cleaned.steps = requireNumber(inputs.steps, 'Tree Steps');
  }
  if (methodKey.includes('mc')) {
    cleaned.paths = requireNumber(inputs.paths, 'Monte Carlo Paths');
    if (methodKey !== 'arithmetic_mc') {
      cleaned.steps = requireNumber(inputs.steps, 'Simulation Steps');
    }
  }
  if (instrumentKey === 'asian' && methodKey === 'arithmetic_mc') {
    cleaned.fixings = requireNumber(inputs.fixings, 'Asian Fixings');
  }

  // 4. ROUTE TO SOLVER
  switch (methodKey) {
    case 'black_scholes': return solveBlackScholes(cleaned, instrumentKey === 'digital');
    case 'binomial_crr': return solveBinomial(cleaned, instrumentKey === 'american');
    case 'mc_discrete': return solveMonteCarloBarrier(cleaned, false);
    case 'mc_bridge': return solveMonteCarloBarrier(cleaned, true);
    case 'geometric_closed': return solveAsian(cleaned, true);
    case 'arithmetic_mc': return solveAsian(cleaned, false);
    case 'discounted_value': return (S * Math.exp(-q * T)) - (K * Math.exp(-r * T));
    default: throw new Error(`CRITICAL ENGINE ERROR: Unknown pricing method '${methodKey}'`);
  }
};


export const computeResult = async (methodKey: string, instrumentKey: string, inputs: any): Promise<PricingResult> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(calculatePriceDetails(methodKey, instrumentKey, inputs));
      } catch (e) {
        reject(e); // Properly bubble up the strict validation errors
      }
    }, 50);
  });
};

export const calculatePriceDetails = (methodKey: string, instrumentKey: string, inputs: any) => {
    const baseInputs = { ...inputs, key: instrumentKey };
    
    // Base Price (If any input is missing, it will throw fatally right here)
    const price = calculatePrice(methodKey, baseInputs);

    // Finite Difference Precision
    const dS = baseInputs.S * 0.001; 
    const dT = 1 / 365; 
    const dVol = 0.01;
    const dR = 0.01;

    const p_up = calculatePrice(methodKey, { ...baseInputs, S: baseInputs.S + dS });
    const p_down = calculatePrice(methodKey, { ...baseInputs, S: baseInputs.S - dS });
    const p_vol_up = calculatePrice(methodKey, { ...baseInputs, sigma: baseInputs.sigma + dVol });
    const p_vol_down = calculatePrice(methodKey, { ...baseInputs, sigma: baseInputs.sigma - dVol });
    const p_time_down = calculatePrice(methodKey, { ...baseInputs, T: baseInputs.T - dT }); 
    const p_rho_up = calculatePrice(methodKey, { ...baseInputs, r: baseInputs.r + dR });

    const p_up_vol_up = calculatePrice(methodKey, { ...baseInputs, S: baseInputs.S + dS, sigma: baseInputs.sigma + dVol });
    const p_down_vol_up = calculatePrice(methodKey, { ...baseInputs, S: baseInputs.S - dS, sigma: baseInputs.sigma + dVol });
    const p_up_vol_down = calculatePrice(methodKey, { ...baseInputs, S: baseInputs.S + dS, sigma: baseInputs.sigma - dVol });
    const p_down_vol_down = calculatePrice(methodKey, { ...baseInputs, S: baseInputs.S - dS, sigma: baseInputs.sigma - dVol });

    const delta = (p_up - p_down) / (2 * dS);
    const gamma = (p_up - 2 * price + p_down) / (dS ** 2);
    const vega = (p_vol_up - p_vol_down) / (2 * dVol) / 100;
    
    const theta = (p_time_down - price); 
    const rho = (p_rho_up - price) / 100;

    const delta_vol_up = (p_up_vol_up - p_down_vol_up) / (2 * dS);
    const delta_vol_down = (p_up_vol_down - p_down_vol_down) / (2 * dS);
    
    const vanna = (delta_vol_up - delta_vol_down) / (2 * dVol) / 100;
    const volga = (p_vol_up - 2 * price + p_vol_down) / (dVol ** 2) / 10000; 

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

// --- ZOD SCHEMAS ---
export const InstrumentTypeSchema = z.enum(["vanilla", "digital", "barrier", "american", "asian", "forward"]);
export const OptionTypeSchema = z.enum(["call", "put"]);
export const MethodSchema = z.enum(["black_scholes", "binomial_crr", "mc_discrete", "mc_bridge", "arithmetic_mc", "geometric_closed", "discounted_value"]);
export const BarrierTypeSchema = z.enum(["up-in", "up-out", "down-in", "down-out"]);

export const MarketStateSchema = z.object({
  S: z.number().positive(),
  r: z.number(),
  q: z.number().default(0),
  sigma: z.number().positive(),
});

// THE FIX: Use z.record to guarantee Zod NEVER strips custom parameters 
// like 'payout', 'H', or 'steps' before they reach the engine.
export const PricingParamsSchema = z.record(z.string(), z.any());

export const PricingRequestSchema = z.object({
  market: MarketStateSchema,
  instrument: InstrumentTypeSchema,
  method: MethodSchema,
  params: PricingParamsSchema,
});

export const GreeksSchema = z.object({
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),
  rho: z.number(),
});

export const PricingResultSchema = z.object({
  price: z.number(),
  greeks: GreeksSchema,
  latency: z.number().optional(), 
});