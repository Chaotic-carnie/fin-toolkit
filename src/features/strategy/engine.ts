import { computePortfolioMetrics } from "~/features/portfolio/engine";
import type { PortfolioLeg } from "~/features/portfolio/schema";
import type { StrategyView, StrategyMarket, StrategyGeneration, StrategyConstraints, StrategyCandidate } from "./types";

const uuid = () => Math.random().toString(36).substring(2, 12);

// --- 1. VIEW NORMALIZATION ---
export function normalizeView(view: StrategyView, market: StrategyMarket) {
  let signedMovePct = 0;
  let expectedSpot = market.spot;

  if (view.targetPrice !== null && view.targetPrice !== undefined) {
    signedMovePct = (view.targetPrice / market.spot - 1.0) * 100.0;
    expectedSpot = view.targetPrice;
  } else {
    const rawMove = view.movePct || 0;
    if (view.direction === "bullish") signedMovePct = Math.abs(rawMove);
    else if (view.direction === "bearish") signedMovePct = -Math.abs(rawMove);
    expectedSpot = market.spot * (1.0 + signedMovePct / 100.0);
  }

  const horizonYears = Math.max(1.0 / 365.0, view.horizonDays / 365.0);
  let signedVolShift = view.volView === "up" ? view.volShift : view.volView === "down" ? -view.volShift : 0;
  if (market.vol + signedVolShift <= 0) signedVolShift = Math.max(-market.vol + 1e-6, signedVolShift);

  return { signedMovePct, moveMagPct: Math.abs(signedMovePct), expectedSpot, horizonYears, signedVolShift };
}

// --- 2. STRIKE GENERATION ---
function baseStrikes(spot: number, step: number, widthAbs: number) {
  const round = (x: number) => Math.round(x / step) * step;
  const kAtm = round(spot);
  let kUp = round(spot + widthAbs);
  let kDn = round(Math.max(1e-6, spot - widthAbs));

  // FIX: Ensure strikes are strictly distinct to avoid "Zero Width" spreads
  if (kUp <= kAtm) kUp = kAtm + step;
  if (kDn >= kAtm) kDn = Math.max(1e-6, kAtm - step);
  return { kAtm, kDn, kUp };
}

// --- 3. LEG FACTORY ---
function makeVanillaLeg(qty: number, type: "call" | "put", strike: number, tYears: number, m: StrategyMarket): PortfolioLeg {
  const skewFactor = (m as any).skew || 0;
  const skewedVol = getSkewedVol(strike, m.spot, m.vol, skewFactor);

  return {
    id: uuid(), instrument: "vanilla", method: "black_scholes", quantity: qty, active: true,
    params: { 
      option_type: type, 
      strike, 
      time_to_expiry: tYears, 
      spot: m.spot, 
      vol: skewedVol, 
      risk_free_rate: m.rate, 
      dividend_yield: m.dividend 
    }
  };
}

// --- 4. MATH UTILS ---
export function logNormalPDF(x: number, s0: number, t: number, vol: number, r: number, q: number) {
  if (x <= 0 || t <= 0 || vol <= 0) return 0;
  const mu = Math.log(s0) + (r - q - 0.5 * vol * vol) * t;
  const sigma = vol * Math.sqrt(t);
  const z = (Math.log(x) - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
}

// --- 5. PnL METRICS ENGINE ---
export function pnlMetrics(legs: PortfolioLeg[], premium: number, market: StrategyMarket, expectedSpot: number, moveMagPct: number, horizonYears: number) {
  // FIX: Ensure range covers extreme moves to catch "Max Loss" plateaus correctly
  const spotRangePct = Math.max(30, Math.min(100, 2.5 * moveMagPct + 15)); 
  const lo = Math.max(1e-6, market.spot * (1 - spotRangePct / 100));
  const hi = market.spot * (1 + spotRangePct / 100);
  const steps = 200; // Increased resolution
  const ds = (hi - lo) / steps;
  
  const pnl: number[] = [];
  const spots: number[] = [];
  let popProb = 0; 
  
  for (let i = 0; i <= steps; i++) {
    const s = lo + i * ds;
    spots.push(s);
    let total = 0;
    
    // Calculate Intrinsic Value at Expiry
    for (const l of legs) {
      const k = l.params.strike || s;
      if (l.params.option_type === "call") total += l.quantity * Math.max(0, s - k);
      else if (l.params.option_type === "put") total += l.quantity * Math.max(0, k - s);
    }
    
    // Net PnL = (Value at Expiry) - (Initial Cost)
    // Note: If premium is positive (Debit), we subtract it. If negative (Credit), we subtract a negative (add it).
    const netPnl = total - premium;
    pnl.push(netPnl);

    if (netPnl > 0) {
      const pdf = logNormalPDF(s, market.spot, horizonYears, market.vol, market.rate, market.dividend);
      popProb += pdf * ds;
    }
  }

  const maxPnl = Math.max(...pnl);
  const minPnl = Math.min(...pnl);

  const breakevens: number[] = [];
  for (let i = 1; i < pnl.length; i++) {
    const a = pnl[i - 1], b = pnl[i];
    if ((a < 0 && b > 0) || (a > 0 && b < 0) || a === 0) {
      if (a === 0) breakevens.push(spots[i - 1]);
      else {
        const t = -a / (b - a);
        breakevens.push(spots[i - 1] + t * (spots[i] - spots[i - 1]));
      }
    }
  }

  let pnlExpected = pnl[0];
  for (let i = 1; i < spots.length; i++) {
    if (spots[i] >= expectedSpot) {
      const t = (expectedSpot - spots[i - 1]) / (spots[i] - spots[i - 1]);
      pnlExpected = pnl[i - 1] + t * (pnl[i] - pnl[i - 1]);
      break;
    }
  }

  // FIX: Check for BOTH Uncapped Calls and Uncapped Puts to set "Unlimited" loss/profit correctly
  let slopeHigh = 0; // Slope as spot -> Infinity
  let slopeLow = 0;  // Slope as spot -> 0
  
  for (const l of legs) {
    if (l.params.option_type === "call") slopeHigh += l.quantity;
    if (l.params.option_type === "put") slopeLow -= l.quantity; // Short put = positive slope risk downwards
  }

  return { 
    maxPnl: slopeHigh > 1e-9 ? null : maxPnl, 
    // FIX: If slopeLow is negative (e.g. naked put), loss increases as spot drops. 
    // Usually defined as null (unlimited) or we can cap it at strike price. 
    // For standard display, if we are short puts, max loss is essentially strike - credit.
    // We treat it as null if it's purely exposed.
    minPnl: (slopeLow < -1e-9 || slopeHigh < -1e-9) ? null : minPnl, 
    breakevens, 
    pnlExpected,
    pop: Math.min(99.9, Math.max(0.1, popProb * 100))
  };
}

// --- 6. SCORING ---
function scoreCandidate(view: StrategyView, pref: number, premium: number, greeks: any, pnlExpected: number, maxLossEst: number | null, legsCount: number) {
  let score = 50.0;
  const { delta, gamma, vega, theta } = greeks;

  if (view.direction === "bullish") score += 20.0 * Math.tanh(delta / 0.5);
  else if (view.direction === "bearish") score += 20.0 * Math.tanh(-delta / 0.5);
  else score += 10.0 - 20.0 * Math.min(1.0, Math.abs(delta) / 0.3);

  if (view.volView === "up") score += 10.0 * Math.tanh(vega / 35.0);
  else if (view.volView === "down") score += 10.0 * Math.tanh(-vega / 35.0);
  else score += 5.0 - 5.0 * Math.min(1.0, Math.abs(vega) / 45.0);

  const denom = maxLossEst && maxLossEst > 1e-9 ? maxLossEst : Math.max(1.0, Math.abs(premium));
  score += 15.0 * Math.max(-1.0, Math.min(1.0, pnlExpected / denom));

  if (pref < 0.45) {
    if (premium < 0) score += 6.0;
    if (theta > 0) score += 2.0;
  } else if (pref > 0.55) {
    if (premium > 0) score += 4.0;
    if (gamma > 0) score += 2.0;
    if (vega > 0) score += 2.0;
  }

  if (legsCount <= 2) score += 4.0;
  else if (legsCount === 3) score += 2.0;
  if (view.event) {
    if (gamma > 0) score += 2.0;
    if (vega > 0) score += 2.0;
  }

  const reasons = [];
  if (view.direction === "bullish" && delta > 0.05) reasons.push("positive Δ");
  if (view.direction === "bearish" && delta < -0.05) reasons.push("negative Δ");
  if (view.direction === "neutral" && Math.abs(delta) < 0.08) reasons.push("near-neutral Δ");
  if (view.volView === "up" && vega > 0) reasons.push("positive ν");
  if (view.volView === "down" && vega < 0) reasons.push("negative ν");
  reasons.push(premium < 0 ? "net credit" : "net debit");
  if (maxLossEst !== null) reasons.push("defined risk");
  if (pnlExpected > 0) reasons.push("positive PnL at target");

  return { score: Math.max(0, Math.min(100, Math.round(score))), rationale: reasons.join(", ") || "ranked by risk and expected payoff" };
}

// --- 7. STRATEGY GENERATOR ---
// --- 7. STRATEGY GENERATOR (UPDATED for VARIATIONS) ---
export function recommendStrategies(market: StrategyMarket, view: StrategyView, gen: StrategyGeneration, constraints: StrategyConstraints): StrategyCandidate[] {
  const norm = normalizeView(view, market);
  const step = gen.strikeStep || 1;
  
  const sigmaPct = market.vol * Math.sqrt(norm.horizonYears) * 100.0;
  // Base width calculated from volatility
  const baseWidthPct = gen.widthPct || Math.min(40, Math.max(2, Math.max(norm.moveMagPct, 0.6 * sigmaPct)));
  
  // GENERATE VARIATIONS: Standard Width vs. Wide Width (1.5x)
  // This ensures we get more than just 1 candidate per type.
  const widthVariations = [1.0, 1.5]; 

  const candidates: StrategyCandidate[] = [];

  // Determine base strategy types
  let keys: string[] = [];
  if (view.direction === "bullish") keys = ["bull_call_spread", "bull_put_spread", "strap", "butterfly_call", ...(constraints.allowMultiExpiry ? ["calendar_call"] : [])];
  else if (view.direction === "bearish") keys = ["bear_put_spread", "bear_call_spread", "strip", "butterfly_put", ...(constraints.allowMultiExpiry ? ["calendar_put"] : [])];
  else keys = ["straddle", "strangle", "butterfly_call", "butterfly_put", ...(constraints.allowMultiExpiry ? ["calendar_call", "calendar_put"] : [])];
  
  if (view.direction !== "neutral" && (view.volView === "up" || view.event || norm.moveMagPct >= 6)) keys.push("straddle", "strangle");
  keys = Array.from(new Set(keys));

  const tShort = Math.max(1/365, gen.expiryDays / 365);
  const tLong = Math.max(tShort + 1/365, gen.longExpiryDays / 365);

  // --- MAIN LOOP ---
  for (const widthMult of widthVariations) {
    const currentWidthPct = baseWidthPct * widthMult;
    const widthAbs = Math.max(step, market.spot * (currentWidthPct / 100));
    
    // Recalculate strikes for this width
    const { kAtm, kDn, kUp } = baseStrikes(market.spot, step, widthAbs);

    for (const key of keys) {
      // Prevent duplicates: Some strategies (like Straddle) don't use width, so don't run them twice
      if (widthMult > 1.0 && ["straddle", "strap", "strip"].includes(key)) continue;

      let legs: PortfolioLeg[] = [];
      
      // ... (Keep your existing Leg Generation Logic exactly as is) ...
      // Paste your "if (key === 'bull_call_spread')..." blocks here
      if (key === "bull_call_spread") legs = [makeVanillaLeg(1, "call", kAtm, tShort, market), makeVanillaLeg(-1, "call", kUp, tShort, market)];
      if (key === "bear_put_spread") legs = [makeVanillaLeg(1, "put", kAtm, tShort, market), makeVanillaLeg(-1, "put", kDn, tShort, market)];
      if (key === "bull_put_spread") legs = [makeVanillaLeg(-1, "put", kAtm, tShort, market), makeVanillaLeg(1, "put", kDn, tShort, market)];
      if (key === "bear_call_spread") legs = [makeVanillaLeg(-1, "call", kAtm, tShort, market), makeVanillaLeg(1, "call", kUp, tShort, market)];
      if (key === "straddle") legs = [makeVanillaLeg(1, "call", kAtm, tShort, market), makeVanillaLeg(1, "put", kAtm, tShort, market)];
      if (key === "strangle") legs = [makeVanillaLeg(1, "put", kDn, tShort, market), makeVanillaLeg(1, "call", kUp, tShort, market)];
      if (key === "calendar_call") legs = [makeVanillaLeg(-1, "call", kAtm, tShort, market), makeVanillaLeg(1, "call", kAtm, tLong, market)];
      if (key === "calendar_put") legs = [makeVanillaLeg(-1, "put", kAtm, tShort, market), makeVanillaLeg(1, "put", kAtm, tLong, market)];
      if (key === "strap") legs = [makeVanillaLeg(2, "call", kAtm, tShort, market), makeVanillaLeg(1, "put", kAtm, tShort, market)];
      if (key === "strip") legs = [makeVanillaLeg(1, "call", kAtm, tShort, market), makeVanillaLeg(2, "put", kAtm, tShort, market)];
      
      // Butterflies use 3 strikes, so width matters a lot here
      if (key === "butterfly_call" || key === "butterfly_put") {
        const type = key === "butterfly_call" ? "call" : "put";
        const round = (x: number) => Math.round(x / step) * step;
        const k2 = round(norm.expectedSpot);
        let k1 = round(Math.max(1e-6, k2 - widthAbs));
        let k3 = round(k2 + widthAbs);
        if (k1 <= 0) k1 = step;
        if (!(k1 < k2 && k2 < k3)) legs = [makeVanillaLeg(1, type, kDn, tShort, market), makeVanillaLeg(-2, type, kAtm, tShort, market), makeVanillaLeg(1, type, kUp, tShort, market)];
        else legs = [makeVanillaLeg(1, type, k1, tShort, market), makeVanillaLeg(-2, type, k2, tShort, market), makeVanillaLeg(1, type, k3, tShort, market)];
      }

      if (legs.length > constraints.maxLegs) continue;
      const { metrics } = computePortfolioMetrics(legs, 0, 0, 0);
      if (!metrics) continue;

      const premium = metrics.totalValue;
      const greeks = metrics.netGreeks;
      
      const { minPnl, maxPnl, breakevens, pnlExpected, pop } = pnlMetrics(legs, premium, market, norm.expectedSpot, norm.moveMagPct, norm.horizonYears);
      const maxLossEst = minPnl !== null && minPnl < 0 ? Math.abs(minPnl) : null;

      if (constraints.maxLoss !== null && maxLossEst !== null && maxLossEst > constraints.maxLoss + 1e-9) continue;
      if (constraints.definedRiskOnly && maxLossEst === null) continue;

      const { score, rationale } = scoreCandidate(view, constraints.incomeVsConvexity, premium, greeks, pnlExpected, maxLossEst, legs.length);

      const nameMap: any = { bull_call_spread: "Bull Call Spread", bear_put_spread: "Bear Put Spread", bull_put_spread: "Bull Put Spread", bear_call_spread: "Bear Call Spread", straddle: "Long Straddle", strangle: "Long Strangle", butterfly_call: "Call Butterfly", butterfly_put: "Put Butterfly", calendar_call: "Call Calendar", calendar_put: "Put Calendar", strap: "Strap", strip: "Strip" };

      // Distinct Name for Wide Variations
      let displayName = nameMap[key] || key;
      if (widthMult > 1.2) displayName += " (Wide)";

      candidates.push({
        candidate_id: uuid(), strategy_key: key, name: displayName,
        fit_score: score, rationale, tags: [], legs, net_premium: premium,
        max_profit: maxPnl, max_loss: maxLossEst, breakevens, total_greeks: greeks,
        pop : pop
      });
    }
  }

  // Return Top 5 Unique Candidates
  return candidates.sort((a, b) => b.fit_score - a.fit_score).slice(0, 5);
}

export function getSkewedVol(strike: number, spot: number, atmVol: number, skewFactor: number) {
  if (!skewFactor || skewFactor === 0) return atmVol;
  const distancePct = (strike - spot) / spot;
  const skewedVol = atmVol - (distancePct * skewFactor);
  return Math.max(0.0001, Math.min(2.0, skewedVol)); 
}