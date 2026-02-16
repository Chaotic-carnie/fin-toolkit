import { CapBudComputeRequest, CapBudComputeResponse } from "@/app/api/docs/schemas";
import { AllocationComputeRequest, AllocationComputeResponse } from "@/app/api/docs/schemas";

function computeNPV(cashflows: number[], r: number, midYear: boolean = false): number {
  if (r <= -1.0) throw new Error("Discount rate must be > -1");
  let total = 0.0;
  for (let t = 0; t < cashflows.length; t++) {
    if (t === 0) {
      total += cashflows[t];
      continue;
    }
    const exp = midYear ? t - 0.5 : t;
    total += cashflows[t] / Math.pow(1.0 + r, exp);
  }
  return total;
}

function countSignChanges(cashflows: number[]): number {
  const cleaned = cashflows.filter(cf => Math.abs(cf) >= 1e-12).map(cf => cf > 0 ? 1 : -1);
  if (cleaned.length < 2) return 0;
  let changes = 0;
  for (let i = 0; i < cleaned.length - 1; i++) {
    if (cleaned[i] !== cleaned[i + 1]) changes++;
  }
  return changes;
}

function findIRRCandidates(cashflows: number[], midYear: boolean): number[] {
  const candidates: number[] = [];
  const starts = [-0.5, 0.0, 0.1, 0.3, 0.5, 1.0]; // Sweep common rate areas

  for (const start of starts) {
    let r0 = start;
    let r1 = start + 0.05;
    
    // Safety check for initial seeds just in case
    if (r0 <= -1.0 || r1 <= -1.0) continue;

    let npv0 = computeNPV(cashflows, r0, midYear);
    let npv1 = computeNPV(cashflows, r1, midYear);
    let r2 = 0;
    let converged = false;

    for (let iter = 0; iter < 100; iter++) {
      // Prevent division by zero
      if (Math.abs(npv1 - npv0) < 1e-12) break; 
      
      // Calculate next guess
      r2 = r1 - npv1 * ((r1 - r0) / (npv1 - npv0));

      // --- THE FIX: Divergence Protection ---
      // If the Secant method jumps into an invalid discount rate, abort this sweep
      if (r2 <= -0.999) {
        break; 
      }

      const npv2 = computeNPV(cashflows, r2, midYear);

      // Check for convergence (NPV practically zero)
      if (Math.abs(npv2) < 1e-7) {
        converged = true;
        break;
      }
      
      // Shift variables for next iteration
      r0 = r1; npv0 = npv1;
      r1 = r2; npv1 = npv2;
    }

    if (converged) {
      // De-dupe candidates (roots can be near-identical)
      if (!candidates.some(c => Math.abs(c - r2) < 1e-6)) {
        candidates.push(r2);
      }
    }
  }
  return candidates.sort((a, b) => a - b);
}

function computeMIRR(cashflows: number[], financeRate: number, reinvestRate: number): number | null {
  const n = cashflows.length - 1;
  if (n <= 0) return null;

  let pvNeg = 0.0;
  let fvPos = 0.0;
  for (let t = 0; t <= n; t++) {
    const cf = cashflows[t];
    if (cf < 0) pvNeg += cf / Math.pow(1.0 + financeRate, t);
    else if (cf > 0) fvPos += cf * Math.pow(1.0 + reinvestRate, n - t);
  }

  if (Math.abs(pvNeg) < 1e-18 || Math.abs(fvPos) < 1e-18) return null;
  try {
    return Math.pow(fvPos / -pvNeg, 1.0 / n) - 1.0;
  } catch {
    return null;
  }
}

function computePayback(cashflows: number[]): number | null {
  let cum = 0.0;
  for (let t = 0; t < cashflows.length; t++) {
    const prev = cum;
    cum += cashflows[t];
    if (cum >= 0) {
      if (t === 0) return 0.0;
      if (Math.abs(cashflows[t]) < 1e-18) return t;
      const frac = -prev / cashflows[t];
      return (t - 1) + frac;
    }
  }
  return null;
}

export function computeCapBudMetrics(req: CapBudComputeRequest, runId: string): CapBudComputeResponse {
  const midYear = req.convention === "mid_year";
  const r = req.discount_rate;
  const cashflows = req.cashflows;
  const notes: string[] = [];

  if (midYear) notes.push("Mid-year convention: t>=1 cashflows discounted at (t-0.5) years.");

  const npvVal = computeNPV(cashflows, r, midYear);
  const sc = countSignChanges(cashflows);
  const irrCandidates = findIRRCandidates(cashflows, midYear);
  
  let irrVal: number | null = null;
  let irrWarning: string | null = null;

  if (sc > 1) irrWarning = "Non-conventional cashflows (multiple sign changes): IRR may be non-unique.";
  
  if (irrCandidates.length > 0) {
    irrVal = irrCandidates.reduce((best, curr) => 
      Math.abs(computeNPV(cashflows, curr, midYear)) < Math.abs(computeNPV(cashflows, best, midYear)) ? curr : best
    );
    if (irrCandidates.length > 1 && !irrWarning) irrWarning = "Multiple IRR candidates detected; showing closest-to-zero NPV root.";
  } else {
    if (sc === 0) irrWarning = "IRR undefined: cashflows do not change sign.";
    else if (sc >= 1) irrWarning = "No real IRR found in (r > -100%).";
  }
  if (irrWarning) notes.push(irrWarning);

  const financeRate = req.finance_rate !== undefined && req.finance_rate !== null ? req.finance_rate : r;
  const reinvestRate = req.reinvest_rate !== undefined && req.reinvest_rate !== null ? req.reinvest_rate : r;
  const mirrVal = computeMIRR(cashflows, financeRate, reinvestRate);

  let piVal: number | null = null;
  if (cashflows[0] < 0) {
    const pvFuture = computeNPV([0.0, ...cashflows.slice(1)], r, midYear);
    piVal = Math.abs(cashflows[0]) > 1e-18 ? pvFuture / -cashflows[0] : null;
  } else {
    notes.push("Profitability Index is shown only when the initial cashflow (t=0) is negative.");
  }

  const discountedCfs = cashflows.map((cf, t) => {
    if (t === 0) return cf;
    const exp = midYear ? t - 0.5 : t;
    return cf / Math.pow(1.0 + r, exp);
  });

  const payback = computePayback(cashflows);
  const discPayback = computePayback(discountedCfs);

  let cum = 0, cumDisc = 0;
  const cumCfs = cashflows.map(cf => (cum += cf, cum));
  const cumDiscCfs = discountedCfs.map(cf => (cumDisc += cf, cumDisc));

  const maxR = Math.max(0.30, Math.min(1.0, Math.abs(r) > 1e-9 ? Math.abs(r) * 2.0 : 0.30));
  const steps = Math.round(maxR * 100);
  const profileRates = Array.from({ length: steps + 1 }, (_, i) => i / 100.0);
  const profileNpvs = profileRates.map(rr => computeNPV(cashflows, rr, midYear));

  const rateShifts = [-0.02, -0.01, 0.0, 0.01, 0.02];
  const scaleShifts = [-0.10, 0.0, 0.10];
  const grid: number[][] = [];

  for (const sft of scaleShifts) {
    const scale = 1.0 + sft;
    const scaled = [cashflows[0], ...cashflows.slice(1).map(cf => cf * scale)];
    const row = rateShifts.map(dr => {
      const rr = Math.max(-0.99, r + dr);
      return computeNPV(scaled, rr, midYear);
    });
    grid.push(row);
  }

  let decision = "INDIFFERENT: NPV is approximately zero at the hurdle rate.";
  if (npvVal > 1e-4) decision = "ACCEPT: NPV is positive at the hurdle rate.";
  else if (npvVal < -1e-4) decision = "REJECT: NPV is negative at the hurdle rate.";
  if (irrVal !== null) decision += ` IRR ≈ ${(irrVal * 100).toFixed(2)}% vs hurdle ${(r * 100).toFixed(2)}%.`;

  return {
    run_id: runId,
    project_name: req.project_name || "Project",
    currency: req.currency || "USD",
    discount_rate: r,
    convention: req.convention || "end_of_period",
    npv: npvVal,
    irr: irrVal,
    irr_candidates: irrCandidates,
    irr_warning: irrWarning,
    mirr: mirrVal,
    profitability_index: piVal,
    payback_period: payback,
    discounted_payback_period: discPayback,
    cashflow_table: {
      years: cashflows.map((_, i) => i),
      cashflows: cashflows,
      discounted_cashflows: discountedCfs,
      cumulative_cashflows: cumCfs,
      cumulative_discounted_cashflows: cumDiscCfs,
    },
    npv_profile: { rates: profileRates, npvs: profileNpvs },
    sensitivity: { rate_shifts: rateShifts, scale_shifts: scaleShifts, npv_grid: grid },
    decision,
    notes,
  };
}