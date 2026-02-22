import { AllocationComputeRequest, AllocationComputeResponse } from "@/app/api/docs/schemas";

export function computeAllocationMetrics(req: AllocationComputeRequest, runId: string): AllocationComputeResponse {
  const p = req.win_rate;
  const q = 1.0 - p;
  const b = req.payoff_ratio;
  
  // 1. Kelly Calculations
  let kellyPct = 0;
  if (b > 0) {
    kellyPct = p - (q / b);
  }
  
  // Guard against negative Kelly (strategy has no mathematical edge)
  kellyPct = Math.max(0, kellyPct);
  const halfKelly = kellyPct / 2.0;

  // 2. Expected Growth Rate (Geometric) using Half-Kelly for safety
  // g = p * ln(1 + f*b) + q * ln(1 - f)
  let expectedGrowth = 0;
  if (halfKelly > 0 && halfKelly < 1) {
    expectedGrowth = (p * Math.log(1 + halfKelly * b)) + (q * Math.log(1 - halfKelly));
  }

  // 3. Monte Carlo Risk of Ruin Simulation
  const runs = req.sim_runs || 1000;
  const trades = req.sim_trades || 100;
  const ruinLevel = req.starting_capital * (1.0 - req.ruin_drawdown_pct);
  
  let ruinedCount = 0;
  const samplePaths: number[][] = [];
  const MAX_SAMPLES_TO_KEEP = 20; // Prevent UI lag

  for (let i = 0; i < runs; i++) {
    let currentCapital = req.starting_capital;
    let isRuined = false;
    const path: number[] = [currentCapital];

    for (let t = 0; t < trades; t++) {
      // Risking Half-Kelly per trade
      const amountAtRisk = currentCapital * halfKelly;
      
      // Math.random() is sufficient for this level of UI simulation
      const won = Math.random() <= p; 
      
      if (won) {
        currentCapital += (amountAtRisk * b);
      } else {
        currentCapital -= amountAtRisk;
      }

      path.push(currentCapital);

      if (currentCapital <= ruinLevel) {
        isRuined = true;
        // Don't break early so we can draw the full painful path in the UI
      }
    }

    if (isRuined) ruinedCount++;

    // Keep a subset of paths for the UI spaghetti chart (mix of winners and losers)
    if (samplePaths.length < MAX_SAMPLES_TO_KEEP) {
      samplePaths.push(path);
    }
  }

  const ruinProb = ruinedCount / runs;

  return {
    run_id: runId,
    kelly_pct: kellyPct,
    half_kelly_pct: halfKelly,
    recommended_alloc_amount: req.starting_capital * halfKelly,
    risk_of_ruin_prob: ruinProb,
    expected_growth_rate: expectedGrowth,
    simulated_paths: samplePaths
  };
}