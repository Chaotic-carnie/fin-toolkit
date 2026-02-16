import { MarginComputeRequest, MarginComputeResponse, MarginLeg } from "@/app/api/docs/schemas";

function calcNakedShortMargin(leg: MarginLeg, spot: number): number {
  const isCall = leg.type === "call";
  const otmAmount = isCall ? Math.max(0, leg.strike - spot) : Math.max(0, spot - leg.strike);
  
  // Rule 1: 20% of underlying spot - OTM amount + Premium
  const rule1 = (0.20 * spot) - otmAmount + leg.premium;
  
  // Rule 2: Minimums (10% of spot for calls, 10% of strike for puts) + Premium
  const rule2 = isCall ? (0.10 * spot) + leg.premium : (0.10 * leg.strike) + leg.premium;

  // Margin is the maximum of Rule 1, Rule 2, or $50 minimum per contract
  return Math.max(rule1, rule2, 0.50) * 100; // Returns requirement PER CONTRACT
}

export function computeMarginMetrics(req: MarginComputeRequest, runId: string): MarginComputeResponse {
  const spot = req.spot_price;
  let totalMargin = 0;
  let netPremium = 0;
  
  // We initialize the margin array to exactly match the input legs array
  const legMargins: number[] = new Array(req.legs.length).fill(0);

  // We extend the schema type locally to track pairing quantities and original index positions
  type TrackedLeg = MarginLeg & { index: number; remainingQty: number };
  
  const calls: { longs: TrackedLeg[], shorts: TrackedLeg[] } = { longs: [], shorts: [] };
  const puts: { longs: TrackedLeg[], shorts: TrackedLeg[] } = { longs: [], shorts: [] };

  // 1. Sort and Track all legs
  req.legs.forEach((leg, idx) => {
    const tracked = { ...leg, index: idx, remainingQty: leg.quantity };
    
    // Calculate global net premium
    netPremium += (leg.action === "sell" ? leg.premium : -leg.premium) * 100 * leg.quantity;
    
    if (leg.type === "call") {
      if (leg.action === "buy") calls.longs.push(tracked);
      else calls.shorts.push(tracked);
    } else {
      if (leg.action === "buy") puts.longs.push(tracked);
      else puts.shorts.push(tracked);
    }
  });

  // Optimize pairing: Pair shorts with the closest defining longs to minimize margin
  calls.longs.sort((a, b) => a.strike - b.strike);
  puts.longs.sort((a, b) => b.strike - a.strike);

  // 2. The Spread Pairing Algorithm
  const processLegs = (shorts: TrackedLeg[], longs: TrackedLeg[], isCall: boolean) => {
    for (const short of shorts) {
      let marginForThisShort = 0;

      // Scan available longs to pair into defined-risk spreads
      for (const long of longs) {
        if (short.remainingQty === 0) break;
        if (long.remainingQty === 0) continue;

        const pairQty = Math.min(short.remainingQty, long.remainingQty);
        
        // Spread risk is the absolute width between the short and long strikes
        let widthRisk = 0;
        if (isCall) {
          widthRisk = Math.max(0, long.strike - short.strike);
        } else {
          widthRisk = Math.max(0, short.strike - long.strike);
        }

        marginForThisShort += widthRisk * 100 * pairQty;
        
        short.remainingQty -= pairQty;
        long.remainingQty -= pairQty;
      }

      // 3. Fallback: Any leftover short quantity that wasn't paired is treated as Naked
      if (short.remainingQty > 0) {
        marginForThisShort += calcNakedShortMargin(short, spot) * short.remainingQty;
        short.remainingQty = 0;
      }

      legMargins[short.index] += marginForThisShort;
      totalMargin += marginForThisShort;
    }

    // 4. Long Options Margin Footprint (Standard Reg T requires 100% of premium paid)
    for (const long of longs) {
       const longMargin = long.premium * 100 * long.quantity; 
       legMargins[long.index] += longMargin;
       totalMargin += longMargin;
    }
  };

  // Run the algorithm for Calls and Puts independently
  processLegs(calls.shorts, calls.longs, true);
  processLegs(puts.shorts, puts.longs, false);

  // Strategy Classification Heuristics
  let classification = "Custom Setup";
  const hasLongs = calls.longs.length > 0 || puts.longs.length > 0;
  const hasShorts = calls.shorts.length > 0 || puts.shorts.length > 0;
  
  if (hasLongs && !hasShorts) classification = "Long Premium (Debit)";
  else if (!hasLongs && hasShorts) classification = "Naked Short (Credit)";
  else if (hasLongs && hasShorts) {
     if (req.legs.length === 4) classification = "Iron Condor / Butterfly";
     else if (req.legs.length === 2) classification = "Vertical Spread";
     else classification = "Complex Covered Spread";
  }

  // Final ROC (Only calculated if the trader takes in a net credit against margin)
  let roc: number | null = null;
  if (netPremium > 0 && totalMargin > 0) {
    roc = netPremium / totalMargin;
  }

  return {
    run_id: runId,
    total_margin_req: totalMargin,
    net_premium: netPremium,
    max_return_on_capital: roc,
    leg_margins: legMargins,
    strategy_classification: classification
  };
}