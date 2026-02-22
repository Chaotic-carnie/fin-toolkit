import { ExposureComputeRequest, ExposureComputeResponse } from "@/app/api/docs/schemas";

export function computeExposureMetrics(req: ExposureComputeRequest, runId: string): ExposureComputeResponse {
  let netBetaDelta = 0;
  const legExposures: ExposureComputeResponse["leg_exposures"] = [];

  for (const leg of req.legs) {
    const multiplier = leg.asset_type === "option" ? 100 : 1;
    const positionDelta = leg.delta * leg.quantity * multiplier;
    
    // Formula: Delta * (Spot / Benchmark) * Beta
    const betaWeightedDelta = positionDelta * (leg.spot_price / req.benchmark_price) * leg.beta;
    
    netBetaDelta += betaWeightedDelta;

    legExposures.push({
      symbol: leg.symbol.toUpperCase(),
      raw_delta: positionDelta,
      beta_weighted_delta: betaWeightedDelta
    });
  }

  return {
    run_id: runId,
    net_beta_delta: netBetaDelta,
    net_dollar_exposure: netBetaDelta * req.benchmark_price, // The actual $ at risk per 1 point move in SPY
    leg_exposures: legExposures
  };
}