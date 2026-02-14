import { computePortfolioMetrics } from "~/features/portfolio/engine";
import type { PortfolioLeg } from "~/features/portfolio/schema";
import type { StrategyView, StrategyMarket, StrategyGeneration, StrategyConstraints, StrategyCandidate } from "./types";

const uuid = () => Math.random().toString(36).substring(2, 12);

// Python: normalize_view
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

// Python: _base_strikes
function baseStrikes(spot: number, step: number, widthAbs: number) {
  const round = (x: number) => Math.round(x / step) * step;
  const kAtm = round(spot);
  let kUp = round(spot + widthAbs);
  let kDn = round(Math.max(1e-6, spot - widthAbs));

  if (kUp <= kAtm) kUp = kAtm + step;
  if (kDn >= kAtm) kDn = Math.max(1e-6, kAtm - step);
  return { kAtm, kDn, kUp };
}

// Python: _make_vanilla_leg
function makeVanillaLeg(qty: number, type: "call" | "put", strike: number, tYears: number, m: StrategyMarket): PortfolioLeg {
  // APPLY SKEW GLOBALLY HERE
  const skewFactor = (m as any).skew || 0;
  const skewedVol = getSkewedVol(strike, m.spot, m.vol, skewFactor);

  return {
    id: uuid(), instrument: "vanilla", method: "black_scholes", quantity: qty, active: true,
    params: { 
      option_type: type, 
      strike, 
      time_to_expiry: tYears, 
      spot: m.spot, 
      vol: skewedVol, // <--- Now using the Skewed Volatility!
      risk_free_rate: m.rate, 
      dividend_yield: m.dividend 
    }
  };
}

// Fast Log-Normal PDF for Probability calculations
export function logNormalPDF(x: number, s0: number, t: number, vol: number, r: number, q: number) {
  if (x <= 0 || t <= 0 || vol <= 0) return 0;
  const mu = Math.log(s0) + (r - q - 0.5 * vol * vol) * t;
  const sigma = vol * Math.sqrt(t);
  const z = (Math.log(x) - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
}

export function pnlMetrics(legs: PortfolioLeg[], premium: number, market: StrategyMarket, expectedSpot: number, moveMagPct: number, horizonYears: number) {
  const spotRangePct = Math.max(20, Math.min(80, 2 * moveMagPct + 10));
  const lo = Math.max(1e-6, market.spot * (1 - spotRangePct / 100));
  const hi = market.spot * (1 + spotRangePct / 100);
  const steps = 150; 
  const ds = (hi - lo) / steps;
  
  const pnl: number[] = [];
  const spots: number[] = [];
  let popProb = 0; // Probability of Profit accumulator
  
  for (let i = 0; i <= steps; i++) {
    const s = lo + i * ds;
    spots.push(s);
    let total = 0;
    for (const l of legs) {
      const k = l.params.strike || s;
      if (l.params.option_type === "call") total += l.quantity * Math.max(0, s - k);
      else if (l.params.option_type === "put") total += l.quantity * Math.max(0, k - s);
    }
    const netPnl = total - premium;
    pnl.push(netPnl);

    // Integrate Probability of Profit
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

  let slopeHigh = 0;
  for (const l of legs) {
    if (l.params.option_type === "call") slopeHigh += l.quantity;
  }

  return { 
    maxPnl: slopeHigh > 1e-9 ? null : maxPnl, 
    minPnl, 
    breakevens, 
    pnlExpected,
    pop: Math.min(99.9, Math.max(0.1, popProb * 100)) // Cap between 0.1% and 99.9%
  };
}


// Python: score_candidate
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

// Python: recommend_strategies
export function recommendStrategies(market: StrategyMarket, view: StrategyView, gen: StrategyGeneration, constraints: StrategyConstraints): StrategyCandidate[] {
  const norm = normalizeView(view, market);
  const step = gen.strikeStep || 1;
  
  const sigmaPct = market.vol * Math.sqrt(norm.horizonYears) * 100.0;
  const widthPct = gen.widthPct || Math.min(40, Math.max(2, Math.max(norm.moveMagPct, 0.6 * sigmaPct)));
  const widthAbs = Math.max(step, market.spot * (widthPct / 100));

  const { kAtm, kDn, kUp } = baseStrikes(market.spot, step, widthAbs);
  const tShort = Math.max(1/365, gen.expiryDays / 365);
  const tLong = Math.max(tShort + 1/365, gen.longExpiryDays / 365);

  let keys: string[] = [];
  if (view.direction === "bullish") keys = ["bull_call_spread", "bull_put_spread", "strap", "butterfly_call", ...(constraints.allowMultiExpiry ? ["calendar_call"] : [])];
  else if (view.direction === "bearish") keys = ["bear_put_spread", "bear_call_spread", "strip", "butterfly_put", ...(constraints.allowMultiExpiry ? ["calendar_put"] : [])];
  else keys = ["straddle", "strangle", "butterfly_call", "butterfly_put", ...(constraints.allowMultiExpiry ? ["calendar_call", "calendar_put"] : [])];
  
  if (view.direction !== "neutral" && (view.volView === "up" || view.event || norm.moveMagPct >= 6)) keys.push("straddle", "strangle");
  keys = Array.from(new Set(keys));

  const candidates: StrategyCandidate[] = [];

  for (const key of keys) {
    let legs: PortfolioLeg[] = [];
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
    const maxLossEst = minPnl < 0 ? -minPnl : 0;

    if (constraints.maxLoss !== null && maxLossEst > constraints.maxLoss + 1e-9) continue;

    const { score, rationale } = scoreCandidate(view, constraints.incomeVsConvexity, premium, greeks, pnlExpected, minPnl < 0 ? maxLossEst : null, legs.length);

    const nameMap: any = { bull_call_spread: "Bull call spread", bear_put_spread: "Bear put spread", bull_put_spread: "Bull put spread", bear_call_spread: "Bear call spread", straddle: "Long straddle", strangle: "Long strangle", butterfly_call: "Call butterfly", butterfly_put: "Put butterfly", calendar_call: "Call calendar", calendar_put: "Put calendar", strap: "Strap", strip: "Strip" };

    candidates.push({
      candidate_id: uuid(), strategy_key: key, name: nameMap[key] || key,
      fit_score: score, rationale, tags: [], legs, net_premium: premium,
      max_profit: maxPnl, max_loss: minPnl < 0 ? maxLossEst : null, breakevens, total_greeks: greeks,
      pop : pop
    });
  }

  return candidates.sort((a, b) => b.fit_score - a.fit_score).slice(0, 5);
}

/**
 * Calculates the exact Implied Volatility for a specific strike using a linear skew model.
 * Equity markets typically have negative skew (lower strikes = higher IV).
 */
export function getSkewedVol(strike: number, spot: number, atmVol: number, skewFactor: number) {
  if (!skewFactor || skewFactor === 0) return atmVol;
  
  // Calculate percentage distance from spot
  const distancePct = (strike - spot) / spot;
  
  // Apply linear skew: If distance is negative (Put side), IV goes up. 
  // We cap it so extreme strikes don't get absurd negative or 500% volatilities.
  const skewedVol = atmVol - (distancePct * skewFactor);
  return Math.max(0.0001, Math.min(2.0, skewedVol)); // Cap between 0.01% and 200% IV
}