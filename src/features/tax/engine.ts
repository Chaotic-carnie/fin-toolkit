import { addMonths, differenceInDays, isAfter, parseISO, format } from 'date-fns';
import { TaxComputeRequest, TaxComputeResponse, TaxCore } from './types';

// --- STATUTORY CONSTANTS ---
const EFFECTIVE_DATE_REFORM = new Date('2024-07-23');
const EQUITY_GRANDFATHERING_CUTOFF = new Date('2018-02-01');

// Full CII Table from Source
const CII_BY_FY_START: Record<number, number> = {
  2001: 100, 2002: 105, 2003: 109, 2004: 113, 2005: 117, 
  2006: 122, 2007: 129, 2008: 137, 2009: 148, 2010: 167, 
  2011: 184, 2012: 200, 2013: 220, 2014: 240, 2015: 254, 
  2016: 264, 2017: 272, 2018: 280, 2019: 289, 2020: 301, 
  2021: 317, 2022: 331, 2023: 348, 2024: 363, 2025: 376,
};

// --- HELPERS ---
const getFYStart = (d: Date): number => d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;

const getCIIForDate = (d: Date): number | undefined => CII_BY_FY_START[getFYStart(d)];

// Exact port of _is_long_term
const isLongTerm = (acq: Date, sold: Date, monthsThreshold: number): boolean => 
  isAfter(sold, addMonths(acq, monthsThreshold));

const grandfatheredCost112A = (actual: number, fmv: number, sale: number): number => 
  Math.max(actual, Math.min(fmv, sale));

// --- CORE LOGIC ---
const computeCore = (req: TaxComputeRequest, saleOverride?: number): TaxCore => {
  const saleValue = saleOverride ?? req.sale_value;
  const purchaseValue = req.purchase_value;
  const expenses = req.transfer_expenses || 0;
  const sold = parseISO(req.sold_date);
  const acquired = parseISO(req.acquired_date);
  const holdingDays = differenceInDays(sold, acquired);
  const notes: string[] = [];
  
  const getSlabRate = () => req.marginal_rate ?? 0.30;

  // 1. Virtual Digital Asset (115BBH)
  if (req.asset_type === "virtual_digital_asset") {
    return {
      classification: "VDA (115BBH)",
      holding_days: holdingDays,
      holding_period_rule: "Special rate; holding period not used",
      taxable_gain: Math.max(0, saleValue - purchaseValue),
      base_rate: 0.30,
      methodology: "Section 115BBH: 30% tax on gains; no deductions other than cost.",
      notes: ["Transfer expenses are not deducted for VDA."]
    };
  }

  // 2. Deemed STCG (50AA)
  if (["specified_mutual_fund_50aa", "market_linked_debenture_50aa", "unlisted_bond_debenture_50aa"].includes(req.asset_type)) {
    const gain = saleValue - purchaseValue - expenses;
    return {
      classification: "Deemed STCG (50AA)",
      holding_days: holdingDays,
      holding_period_rule: "Always short-term under section 50AA",
      taxable_gain: Math.max(0, gain),
      base_rate: getSlabRate(),
      methodology: "Section 50AA: gains deemed STCG; taxed at slab rate.",
      notes
    };
  }

  // 3. Listed Equity (111A / 112A)
  if (req.asset_type === "listed_equity_stt") {
    if (!req.stt_paid) {
      notes.push("STT not marked as paid; falling back to general rules.");
      // In a real recursions we would re-run, but for strict port we treat as general asset logic below
    } else {
      const isLT = isLongTerm(acquired, sold, 12);
      let costBasis = purchaseValue;

      if (acquired < EQUITY_GRANDFATHERING_CUTOFF && req.fmv_31jan2018) {
        costBasis = grandfatheredCost112A(purchaseValue, req.fmv_31jan2018, saleValue);
        notes.push("112A grandfathering applied.");
      }

      const gain = saleValue - costBasis - expenses;

      if (!isLT) {
        return {
          classification: "STCG (111A)",
          holding_days: holdingDays,
          holding_period_rule: "Held <= 12 months",
          taxable_gain: Math.max(0, gain),
          base_rate: sold < EFFECTIVE_DATE_REFORM ? 0.15 : 0.20,
          methodology: "Section 111A: STT-paid equity.",
          notes,
          earliest_ltcg_date: format(addMonths(acquired, 12), 'yyyy-MM-dd')
        };
      } else {
        const exemption = sold < EFFECTIVE_DATE_REFORM ? 100000 : 125000;
        const remaining = Math.max(0, exemption - (req.other_112a_ltcg_in_same_fy || 0));
        let taxable = Math.max(0, Math.max(0, gain) - remaining);
        if (req.basic_exemption_remaining) taxable = Math.max(0, taxable - req.basic_exemption_remaining);

        return {
          classification: "LTCG (112A)",
          holding_days: holdingDays,
          holding_period_rule: "Held > 12 months",
          taxable_gain: taxable,
          base_rate: sold < EFFECTIVE_DATE_REFORM ? 0.10 : 0.125,
          methodology: "Section 112A: STT-paid equity.",
          notes
        };
      }
    }
  }

  // 4. Land & Building (With Indexation Comparison)
  if (req.asset_type === "land_building") {
    const isLT = isLongTerm(acquired, sold, 24);
    const gain = saleValue - purchaseValue - (req.improvement_cost || 0) - expenses;

    if (!isLT) {
      return {
        classification: "STCG (slab)",
        holding_days: holdingDays,
        holding_period_rule: "Held <= 24 months",
        taxable_gain: Math.max(0, gain),
        base_rate: getSlabRate(),
        methodology: "Immovable property STCG taxed at slab rate.",
        notes,
        earliest_ltcg_date: format(addMonths(acquired, 24), 'yyyy-MM-dd')
      };
    }

    // Post-reform Comparison Logic
    if (sold >= EFFECTIVE_DATE_REFORM) {
       const taxNew = Math.max(0, gain) * 0.125;
       const useComparison = req.resident_individual_or_huf && acquired < EFFECTIVE_DATE_REFORM;
       
       if (useComparison) {
         const ciiAcq = getCIIForDate(acquired);
         const ciiSale = getCIIForDate(sold);
         const impDate = req.improvement_date ? parseISO(req.improvement_date) : acquired;
         const ciiImp = getCIIForDate(impDate);

         if (ciiAcq && ciiSale && ciiImp) {
            const indexedCost = purchaseValue * (ciiSale / ciiAcq);
            const indexedImp = (req.improvement_cost || 0) * (ciiSale / ciiImp);
            const gainOld = saleValue - indexedCost - indexedImp - expenses;
            const taxOld = Math.max(0, gainOld) * 0.20;

            if (taxOld < taxNew) {
               return {
                  classification: "LTCG (112)",
                  holding_days: holdingDays,
                  holding_period_rule: "Held > 24 months",
                  taxable_gain: Math.max(0, gainOld),
                  base_rate: 0.20,
                  methodology: "Section 112 proviso: 20% with indexation used.",
                  notes: [...notes, "Applied grandfathering comparison."]
               };
            }
         }
       }
    }
    
    // Default Land LTCG
    return {
      classification: "LTCG (112)",
      holding_days: holdingDays,
      holding_period_rule: "Held > 24 months",
      taxable_gain: Math.max(0, gain),
      base_rate: sold < EFFECTIVE_DATE_REFORM ? 0.20 : 0.125,
      methodology: "Section 112: Land/Building.",
      notes
    };
  }

  // 5. Default / Other Capital Asset
  const isLT = isLongTerm(acquired, sold, 24);
  return {
    classification: isLT ? "LTCG (112)" : "STCG (slab)",
    holding_days: holdingDays,
    holding_period_rule: `Held ${isLT ? '>' : '<='} 24 months`,
    taxable_gain: Math.max(0, saleValue - purchaseValue - expenses),
    base_rate: isLT ? (sold < EFFECTIVE_DATE_REFORM ? 0.20 : 0.125) : getSlabRate(),
    methodology: "General capital asset rules.",
    notes
  };
};

export const runTaxCompute = (req: TaxComputeRequest): TaxComputeResponse => {
  const core = computeCore(req);
  const bt = core.taxable_gain * core.base_rate;
  const sur = bt * (req.surcharge_rate || 0);
  const cess = (bt + sur) * (req.cess_rate || 0.04);
  const total = bt + sur + cess;

  // Planner Logic
  let taxIfWait = null;
  let savings = null;
  if (core.earliest_ltcg_date) {
    const cF = computeCore({ ...req, sold_date: core.earliest_ltcg_date });
    const bF = cF.taxable_gain * cF.base_rate;
    const tF = bF + (bF * (req.surcharge_rate || 0)) + ((bF + bF * (req.surcharge_rate || 0)) * (req.cess_rate || 0.04));
    taxIfWait = tF;
    savings = Math.max(0, total - tF);
  }

  return {
    ...core,
    run_id: Math.random().toString(36).substring(7),
    asset_type: req.asset_type,
    gain: req.sale_value - req.purchase_value - (req.transfer_expenses || 0),
    base_tax: bt,
    surcharge: sur,
    cess,
    total_tax: total,
    post_tax_proceeds: req.sale_value - total,
    scenario_rows: [-0.1, -0.05, 0, 0.05, 0.1].map(s => {
      const sv = req.sale_value * (1 + s);
      const c = computeCore(req, sv);
      const b = c.taxable_gain * c.base_rate;
      const t = b + (b * (req.surcharge_rate || 0)) + ((b + b * (req.surcharge_rate || 0)) * (req.cess_rate || 0.04));
      return { label: `${(s > 0 ? '+' : '')}${(s * 100).toFixed(0)}%`, sale_value: sv, gain: sv - req.purchase_value, total_tax: t, post_tax_proceeds: sv - t };
    }),
    tax_if_sold_on_earliest_ltcg_date: taxIfWait,
    tax_saving_if_wait: savings
  };
};