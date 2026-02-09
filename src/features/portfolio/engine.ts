import { PortfolioLeg } from "./schema";
import { PricingResult } from "@/features/pricing/schema"; 

// --- 1. MATH CORE (Standard Normal Distribution) ---
function N(x: number) {
  var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  var a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  var sign = 1;
  if (x < 0) { sign = -1; x = -x; }
  var t = 1.0 / (1.0 + p * x);
  var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function n(x: number) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// --- 2. EXACT PRICING MODELS ---

const priceVanilla = (type: "call" | "put", S: number, K: number, T: number, r: number, q: number, sigma: number): PricingResult => {
    if (T <= 0) {
        const val = type === "call" ? Math.max(0, S - K) : Math.max(0, K - S);
        return { price: val, greeks: { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 } };
    }
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;
    
    let price = 0, delta = 0, theta = 0, rho = 0;
    const commonGamma = (Math.exp(-q * T) * n(d1)) / (S * sigma * sqrtT);
    const commonVega = S * Math.exp(-q * T) * sqrtT * n(d1) / 100;

    if (type === "call") {
        price = S * Math.exp(-q * T) * N(d1) - K * Math.exp(-r * T) * N(d2);
        delta = Math.exp(-q * T) * N(d1);
        theta = (- (S * sigma * Math.exp(-q * T) * n(d1)) / (2 * sqrtT) - r * K * Math.exp(-r * T) * N(d2) + q * S * Math.exp(-q * T) * N(d1)) / 365;
        rho = (K * T * Math.exp(-r * T) * N(d2)) / 100;
    } else {
        price = K * Math.exp(-r * T) * N(-d2) - S * Math.exp(-q * T) * N(-d1);
        delta = Math.exp(-q * T) * (N(d1) - 1);
        theta = (- (S * sigma * Math.exp(-q * T) * n(d1)) / (2 * sqrtT) + r * K * Math.exp(-r * T) * N(-d2) - q * S * Math.exp(-q * T) * N(-d1)) / 365;
        rho = (-K * T * Math.exp(-r * T) * N(-d2)) / 100;
    }
    return { price, greeks: { delta, gamma: commonGamma, vega: commonVega, theta, rho } };
};

const priceDigital = (type: "call" | "put", S: number, K: number, T: number, r: number, q: number, sigma: number, payout: number = 100): PricingResult => {
    if (T <= 0) {
        const val = type === "call" ? (S > K ? payout : 0) : (S < K ? payout : 0);
        return { price: val, greeks: { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 } };
    }
    const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    let price = 0, delta = 0;
    if (type === "call") {
        price = Math.exp(-r * T) * N(d2) * payout;
        delta = (Math.exp(-r * T) * n(d2) / (S * sigma * Math.sqrt(T))) * payout;
    } else {
        price = Math.exp(-r * T) * N(-d2) * payout;
        delta = -(Math.exp(-r * T) * n(d2) / (S * sigma * Math.sqrt(T))) * payout;
    }
    return { price, greeks: { delta, gamma: 0, vega: 0, theta: 0, rho: 0 } }; 
};

const priceBarrier = (type: "call" | "put", barrierType: "up-in" | "up-out" | "down-in" | "down-out", S: number, K: number, H: number, T: number, r: number, q: number, sigma: number): PricingResult => {
    if (barrierType.includes("out")) {
        if ((barrierType.includes("up") && S >= H) || (barrierType.includes("down") && S <= H)) return { price: 0, greeks: { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 } };
    }
    if (barrierType.includes("in")) {
        if ((barrierType.includes("up") && S >= H) || (barrierType.includes("down") && S <= H)) return priceVanilla(type, S, K, T, r, q, sigma);
    }
    const phi = type === "call" ? 1 : -1;
    const eta = barrierType.includes("down") ? 1 : -1; 
    const mu = (r - q - 0.5 * sigma * sigma) / (sigma * sigma);
    const lambda = Math.sqrt(mu * mu + (2 * r) / (sigma * sigma));
    const X1 = Math.log(S / K) / (sigma * Math.sqrt(T)) + (1 + mu) * sigma * Math.sqrt(T);
    const X2 = Math.log(S / H) / (sigma * Math.sqrt(T)) + (1 + mu) * sigma * Math.sqrt(T);
    const y1 = Math.log(H * H / (S * K)) / (sigma * Math.sqrt(T)) + (1 + mu) * sigma * Math.sqrt(T);
    const y2 = Math.log(H / S) / (sigma * Math.sqrt(T)) + (1 + mu) * sigma * Math.sqrt(T);
    const A = phi * S * Math.exp(-q * T) * N(phi * X1) - phi * K * Math.exp(-r * T) * N(phi * (X1 - sigma * Math.sqrt(T)));
    const B = phi * S * Math.exp(-q * T) * N(phi * X2) - phi * K * Math.exp(-r * T) * N(phi * (X2 - sigma * Math.sqrt(T)));
    const C = phi * S * Math.exp(-q * T) * Math.pow(H / S, 2 * (mu + 1)) * N(eta * y1) - phi * K * Math.exp(-r * T) * Math.pow(H / S, 2 * mu) * N(eta * (y1 - sigma * Math.sqrt(T)));
    const D = phi * S * Math.exp(-q * T) * Math.pow(H / S, 2 * (mu + 1)) * N(eta * y2) - phi * K * Math.exp(-r * T) * Math.pow(H / S, 2 * mu) * N(eta * (y2 - sigma * Math.sqrt(T)));
    const E = 0; const F = 0;
    let price = 0;
    if (type === "call" && barrierType === "down-in") price = K > H ? C + E : A - B + D + E;
    else if (type === "call" && barrierType === "down-out") price = K > H ? A - C + F : B - D + F;
    else if (type === "call" && barrierType === "up-in") price = K > H ? A + E : B - C + D + E;
    else if (type === "call" && barrierType === "up-out") price = K > H ? F : A - B + C - D + F;
    else if (type === "put" && barrierType === "down-in") price = K > H ? B - C + D + E : A + E;
    else if (type === "put" && barrierType === "down-out") price = K > H ? A - B + C - D + F : F;
    else if (type === "put" && barrierType === "up-in") price = K > H ? A - B + D + E : C + E;
    else if (type === "put" && barrierType === "up-out") price = K > H ? B - D + F : A - C + F;
    if (isNaN(price)) return priceVanilla(type, S, K, T, r, q, sigma);
    return { price: Math.max(0, price), greeks: { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 } };
};

// --- 3. MASTER ROUTER ---
const priceLegInternal = (leg: PortfolioLeg, S: number, T: number, r: number, vol: number): PricingResult => {
    const p = leg.params;
    const type = (p.option_type || "call") as "call" | "put";
    const K = safeNum(p.strike);
    const q = safeNum(p.dividend_yield, 0); 
    
    if (leg.instrument === "digital") return priceDigital(type, S, K, T, r, q, vol, safeNum(p.payout, 100));
    if (leg.instrument === "barrier") {
        const bType = (p.barrier_type || "down-out") as any;
        return priceBarrier(type, bType, S, K, safeNum(p.barrier, S*0.9), T, r, q, vol);
    }
    return priceVanilla(type, S, K, T, r, q, vol);
};

// --- TYPES & HELPERS ---
export type PortfolioMetrics = {
  totalValue: number;
  netGreeks: { delta: number; gamma: number; vega: number; theta: number; rho: number; };
  var95: number;
  maxLoss: number | null;
  maxProfit: number | null;
  breakevens: number[];
};

export type PayoffPoint = { spot: number; expiryPnl: number; currentPnl: number; };
export type HeatmapData = { xAxis: number[]; yAxis: number[]; grid: any[][] };

const safeNum = (val: any, defaultVal = 0): number => {
  if (val === null || val === undefined) return defaultVal;
  const n = Number(val);
  return isFinite(n) ? n : defaultVal;
};

const scaleGreeks = (g: any, qty: number) => ({
  delta: safeNum(g.delta) * qty,
  gamma: safeNum(g.gamma) * qty,
  vega: safeNum(g.vega) * qty,
  theta: safeNum(g.theta) * qty,
  rho: safeNum(g.rho) * qty,
});

const addGreeks = (a: any, b: any) => ({
  delta: a.delta + b.delta,
  gamma: a.gamma + b.gamma,
  vega: a.vega + b.vega,
  theta: a.theta + b.theta,
  rho: a.rho + b.rho,
});

const analyzePayoff = (points: PayoffPoint[]) => {
    if (points.length === 0) return { maxProfit: 0, maxLoss: 0, breakevens: [] as number[] };
    let maxProfit = -Infinity;
    let maxLoss = Infinity;
    const breakevens: number[] = [];
    for (let i = 0; i < points.length; i++) {
        const p = points[i].expiryPnl;
        if (p > maxProfit) maxProfit = p;
        if (p < maxLoss) maxLoss = p;
        if (i > 0) {
            const prev = points[i-1].expiryPnl;
            if ((prev < 0 && p >= 0) || (prev > 0 && p <= 0)) {
                const x1 = points[i-1].spot;
                const x2 = points[i].spot;
                const y1 = prev;
                const y2 = p;
                if (Math.abs(y2 - y1) > 1e-9) {
                    const slope = (y2 - y1) / (x2 - x1);
                    breakevens.push(x1 - (y1 / slope));
                }
            }
        }
    }
    return { maxProfit, maxLoss, breakevens };
};

// --- CORE EXPORTS ---

// UPDATE: Added daysPassed and volShock support
export const computePortfolioMetrics = (legs: PortfolioLeg[], globalSpotShock = 0, globalVolShock = 0, daysPassed = 0) => {
  let totalValue = 0;
  let netGreeks = { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  const legResults: Record<string, PricingResult> = {};
  let portfolioDelta = 0;
  let portfolioVega = 0;
  let currentSpot = 0;

  const yearsPassed = daysPassed / 365;

  for (const leg of legs) {
    if (!leg.active) continue;
    const p = leg.params;
    const spot = safeNum(p.spot) * (1 + globalSpotShock);
    // Apply Time Simulation
    const T = Math.max(0, safeNum(p.time_to_expiry) - yearsPassed);
    const r = safeNum(p.risk_free_rate);
    // Apply Vol Simulation
    const vol = Math.max(0.01, safeNum(p.vol) + globalVolShock);
    const qty = safeNum(leg.quantity);
    currentSpot = spot;

    const result = priceLegInternal(leg, spot, T, r, vol);

    const positionValue = result.price * qty;
    const positionGreeks = scaleGreeks(result.greeks, qty);

    totalValue += positionValue;
    netGreeks = addGreeks(netGreeks, positionGreeks);
    legResults[leg.id] = result;

    portfolioDelta += positionGreeks.delta;
    portfolioVega += positionGreeks.vega;
  }

  const var95 = 1.645 * Math.sqrt((portfolioDelta * currentSpot * 0.015)**2 + (portfolioVega * 100 * 0.01)**2);
  const analysisCurve = computePayoffCurve(legs, currentSpot || 100); 
  const { maxProfit, maxLoss, breakevens } = analyzePayoff(analysisCurve);

  return { 
      metrics: { totalValue, netGreeks, var95, maxLoss: maxLoss < -1e9 ? null : maxLoss, maxProfit: maxProfit > 1e9 ? null : maxProfit, breakevens }, 
      legResults 
  };
};

// UPDATE: Added daysPassed and volShock support
export const computePayoffCurve = (legs: PortfolioLeg[], centerSpot: number, daysPassed = 0, volShock = 0): PayoffPoint[] => {
  const points: PayoffPoint[] = [];
  const range = 0.5;
  const steps = 100;
  const start = centerSpot * (1 - range);
  const end = centerSpot * (1 + range);
  const step = (end - start) / steps;
  const yearsPassed = daysPassed / 365;

  let initialCost = 0;
  for (const leg of legs) {
      if (!leg.active) continue;
      const p = leg.params;
      const res = priceLegInternal(leg, safeNum(p.spot), safeNum(p.time_to_expiry), safeNum(p.risk_free_rate), safeNum(p.vol));
      initialCost += res.price * safeNum(leg.quantity);
  }

  for (let s = start; s <= end; s += step) {
    let expiryVal = 0;
    let currentVal = 0;
    for (const leg of legs) {
      if (!leg.active) continue;
      const p = leg.params;
      const qty = safeNum(leg.quantity);
      
      // 1. Expiry Value (T=0)
      const resExpiry = priceLegInternal(leg, s, 0, safeNum(p.risk_free_rate), safeNum(p.vol));
      expiryVal += resExpiry.price * qty;

      // 2. Current Value (T=Now + Simulation)
      const T_sim = Math.max(0, safeNum(p.time_to_expiry) - yearsPassed);
      const vol_sim = Math.max(0.01, safeNum(p.vol) + volShock);
      const resCurrent = priceLegInternal(leg, s, T_sim, safeNum(p.risk_free_rate), vol_sim);
      currentVal += resCurrent.price * qty;
    }
    points.push({ 
        spot: s, 
        expiryPnl: expiryVal - initialCost, 
        currentPnl: currentVal - initialCost
    });
  }
  return points;
};

// Heatmap remains Spot vs Vol (Simulation affects base Vol, but we scan around it)
export const computeHeatmap = (legs: PortfolioLeg[], currentSpot: number): HeatmapData => {
    const steps = 5;
    const spotRange = 0.15;
    const volRange = 0.20;
    const xAxis: number[] = [];
    const yAxis: number[] = [];
    const grid: any[][] = [];
    const spotStep = (spotRange * 2) / (steps - 1);
    const volStep = (volRange * 2) / (steps - 1);
  
    for (let i = 0; i < steps; i++) xAxis.push(-spotRange + i * spotStep);
    for (let j = 0; j < steps; j++) yAxis.push(volRange - j * volStep);
  
    for (let row = 0; row < steps; row++) {
      const volChange = yAxis[row];
      const rowData: any[] = [];
      for (let col = 0; col < steps; col++) {
          const spotChange = xAxis[col];
          let scenarioVal = 0;
          for (const leg of legs) {
              if (!leg.active) continue;
              const p = leg.params;
              const spot = safeNum(p.spot) * (1 + spotChange);
              const vol = Math.max(0.01, safeNum(p.vol) + volChange);
              const res = priceLegInternal(leg, spot, safeNum(p.time_to_expiry), safeNum(p.risk_free_rate), vol);
              scenarioVal += res.price * safeNum(leg.quantity);
          }
          rowData.push({ spotChange, volChange, pnl: scenarioVal });
      }
      grid.push(rowData);
    }
    return { xAxis, yAxis, grid };
};