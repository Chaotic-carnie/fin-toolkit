import { PortfolioLeg } from "./schema";
// We now import the universal calculator from the pricing engine
import { calculatePriceDetails } from "@/features/pricing/engine"; 

export type PricingResult = {
  price: number;
  greeks: { delta: number; gamma: number; vega: number; theta: number; rho: number; vanna: number; volga: number; };
};

export type PortfolioMetrics = {
  totalValue: number;
  netGreeks: { delta: number; gamma: number; vega: number; theta: number; rho: number; vanna: number; volga: number; };
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
  vanna: safeNum(g.vanna) * qty,
  volga: safeNum(g.volga) * qty,
});

const addGreeks = (a: any, b: any) => ({
  delta: a.delta + b.delta,
  gamma: a.gamma + b.gamma,
  vega: a.vega + b.vega,
  theta: a.theta + b.theta,
  rho: a.rho + b.rho,
  vanna: (a.vanna || 0) + (b.vanna || 0),
  volga: (a.volga || 0) + (b.volga || 0),
});

// --- MASTER ROUTER (Replaces Duplicate Math) ---
const priceLegInternal = (leg: PortfolioLeg, S: number, T: number, r: number, vol: number): PricingResult => {
    const p = leg.params;
    const type = (p.option_type || "call").toLowerCase() as "call" | "put";
    const K = safeNum(p.strike);
    const q = safeNum(p.dividend_yield, 0); 
    
    // 1. Map Instrument to the Central Engine's Method Keys
    let methodKey = "black_scholes";
    let instrumentKey = "vanilla";

    if (leg.instrument === "american") {
        methodKey = "binomial_crr";
        instrumentKey = "american";
    } else if (leg.instrument === "barrier") {
        methodKey = "mc_discrete";
        instrumentKey = "barrier";
    } else if (leg.instrument === "asian") {
        methodKey = "arithmetic_mc";
        instrumentKey = "asian";
    }

    // 2. Format inputs to match what pricing/engine.ts expects
    const inputs = {
        type,
        S,
        K,
        r,
        q,
        sigma: Math.max(0.0001, vol), // Guard against 0 vol crashes
        T: Math.max(0.00001, T),      // Guard against 0 time division errors
        
        // Exotic parameters mapped dynamically
        H: safeNum(p.barrier, S * 0.9),
        barrierType: p.barrier_type || "down-out",
        steps: 100,
        paths: 500, // Keep path count low for instant portfolio heatmap rendering
        fixings: 252
    };

    // 3. Compute via Central Engine
    const rawResult = calculatePriceDetails(methodKey, instrumentKey, inputs);

    // 4. Adapt flat output to nested { price, greeks: {...} } structure required by Portfolio
    return {
        price: rawResult.price,
        greeks: {
            delta: rawResult.delta,
            gamma: rawResult.gamma,
            vega: rawResult.vega,
            theta: rawResult.theta,
            rho: rawResult.rho,
            vanna: rawResult.vanna,
            volga: rawResult.volga
        }
    };
};

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

export const computePortfolioMetrics = (legs: PortfolioLeg[], globalSpotShock = 0, globalVolShock = 0, daysPassed = 0) => {
  let totalValue = 0;
  let netGreeks = { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0, vanna: 0, volga: 0 };
  const legResults: Record<string, PricingResult> = {};
  let portfolioDelta = 0;
  let portfolioVega = 0;
  let currentSpot = 0;

  const yearsPassed = daysPassed / 365;

  for (const leg of legs) {
    if (!leg.active) continue;
    const p = leg.params;
    
    // FIX: globalSpotShock is a percentage (e.g., 5). Divide by 100.
    const spot = safeNum(p.spot) * (1 + (globalSpotShock / 100));
    const T = Math.max(0, safeNum(p.time_to_expiry) - yearsPassed);
    const r = safeNum(p.risk_free_rate);
    const vol = Math.max(0.0001, safeNum(p.vol) + globalVolShock);
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
  const analysisCurve = computePayoffCurve(legs, currentSpot || 100, daysPassed, globalVolShock); 
  const { maxProfit, maxLoss, breakevens } = analyzePayoff(analysisCurve);

  return { 
      metrics: { totalValue, netGreeks, var95, maxLoss: maxLoss < -1e9 ? null : maxLoss, maxProfit: maxProfit > 1e9 ? null : maxProfit, breakevens }, 
      legResults 
  };
};

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
      
      // 1. Expiry Value (T=0) -> Pass extremely small T to prevent division by zero in Black-Scholes d1
      const resExpiry = priceLegInternal(leg, s, 0.00001, safeNum(p.risk_free_rate), safeNum(p.vol));
      expiryVal += resExpiry.price * qty;

      // 2. Current Value (T=Now + Simulation)
      const T_sim = Math.max(0.00001, safeNum(p.time_to_expiry) - yearsPassed);
      const vol_sim = Math.max(0.0001, safeNum(p.vol) + volShock);
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
              
              // spotChange is a raw decimal from the loop (e.g. -0.15 to +0.15), so this is safe
              const spot = safeNum(p.spot) * (1 + spotChange);
              const vol = Math.max(0.0001, safeNum(p.vol) + volChange);
              
              const res = priceLegInternal(leg, spot, safeNum(p.time_to_expiry), safeNum(p.risk_free_rate), vol);
              scenarioVal += res.price * safeNum(leg.quantity);
          }
          rowData.push({ spotChange, volChange, pnl: scenarioVal });
      }
      grid.push(rowData);
    }
    return { xAxis, yAxis, grid };
};