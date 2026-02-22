// src/app/api/docs/schemas.ts

export const macroSchemas = {
  MarketSnapshot: {
    type: 'object',
    properties: {
      usdinr: { type: 'number', example: 83.50 },
      inr10y: { type: 'number', example: 7.18 },
      inr3m: { type: 'number', example: 6.85 },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  EconomicEvent: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      date: { type: 'string', format: 'date-time' },
      event: { type: 'string', example: 'US CPI Data' },
      impact: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
      actual: { type: 'string', example: '2.8%' },
      consensus: { type: 'string', example: '2.9%' }
    }
  },
  MacroPosition: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      type: { type: 'string', enum: ['BOND', 'FX', 'EQUITY', 'CREDIT', 'OPTION'] },
      bucket: { type: 'string', enum: ['3m', '2y', '5y', '10y'] },
      amount: { type: 'number' },
      duration: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },
  MacroPositionInput: {
    type: 'object',
    required: ['name', 'type', 'amount'],
    properties: {
      name: { type: 'string', example: 'SPY ETF' },
      type: { type: 'string', enum: ['BOND', 'FX', 'EQUITY', 'CREDIT', 'OPTION'] },
      bucket: { type: 'string', enum: ['3m', '2y', '5y', '10y'] },
      amount: { type: 'number', example: 1000000 },
      duration: { type: 'number', default: 0 },
      convexity: { type: 'number', default: 0 },
      spreadDuration: { type: 'number', default: 0 },
      beta: { type: 'number', default: 1 },
      delta: { type: 'number', default: 0 },
      gamma: { type: 'number', default: 0 },
      vega: { type: 'number', default: 0 },
    }
  }
};

export const pricerSchemas = {
  PricingResponse: {
    type: 'object',
    properties: {
      price: { type: 'number' },
      delta: { type: 'number' },
      gamma: { type: 'number' },
      vega: { type: 'number' },
      theta: { type: 'number' },
      rho: { type: 'number' },
      latency: { type: 'number' },
    },
  },
  PricingRequest: {
    type: 'object',
    required: ['market', 'instrument', 'method'],
    properties: {
      market: {
        type: 'object',
        properties: {
          S: { type: 'number', example: 100 },
          r: { type: 'number', example: 0.05 },
          q: { type: 'number', example: 0 },
          sigma: { type: 'number', example: 0.2 },
        },
      },
      instrument: {
        type: 'string',
        enum: ['vanilla', 'american', 'digital', 'barrier', 'asian', 'forward'],
      },
    },
    discriminator: {
      propertyName: 'instrument',
      mapping: {
        vanilla: '#/components/schemas/VanillaParams',
        american: '#/components/schemas/AmericanParams',
        digital: '#/components/schemas/DigitalParams',
        barrier: '#/components/schemas/BarrierParams',
        asian: '#/components/schemas/AsianParams',
        forward: '#/components/schemas/ForwardParams',
      },
    },
    oneOf: [
      { $ref: '#/components/schemas/VanillaParams' },
      { $ref: '#/components/schemas/AmericanParams' },
      { $ref: '#/components/schemas/DigitalParams' },
      { $ref: '#/components/schemas/BarrierParams' },
      { $ref: '#/components/schemas/AsianParams' },
      { $ref: '#/components/schemas/ForwardParams' },
    ],
  },
  VanillaParams: {
    type: 'object',
    title: 'Vanilla Option',
    properties: {
      instrument: { type: 'string', enum: ['vanilla'] },
      method: { type: 'string', enum: ['black_scholes', 'binomial_crr'] },
      params: {
        type: 'object',
        required: ['K', 'T', 'type'],
        properties: {
          K: { type: 'number', description: 'Strike Price' },
          T: { type: 'number', description: 'Time to Expiry (years)' },
          type: { type: 'string', enum: ['call', 'put'] },
          steps: { type: 'number', description: 'Steps (Binomial only)' },
        },
      },
    },
  },
  AmericanParams: {
    type: 'object',
    title: 'American Option',
    properties: {
      instrument: { type: 'string', enum: ['american'] },
      method: { type: 'string', enum: ['binomial_crr'] },
      params: {
        type: 'object',
        required: ['K', 'T', 'type', 'steps'],
        properties: {
          K: { type: 'number', description: 'Strike Price' },
          T: { type: 'number', description: 'Time to Expiry (years)' },
          type: { type: 'string', enum: ['call', 'put'] },
          steps: { type: 'number', description: 'Tree Steps', default: 200 },
        },
      },
    },
  },
  DigitalParams: {
    type: 'object',
    title: 'Digital Option',
    properties: {
      instrument: { type: 'string', enum: ['digital'] },
      method: { type: 'string', enum: ['black_scholes'] },
      params: {
        type: 'object',
        required: ['K', 'T', 'type', 'payout'],
        properties: {
          K: { type: 'number', description: 'Strike Price' },
          T: { type: 'number', description: 'Time to Expiry (years)' },
          type: { type: 'string', enum: ['call', 'put'] },
          payout: { type: 'number', description: 'Cash payout if ITM', default: 1.0 },
        },
      },
    },
  },
  BarrierParams: {
    type: 'object',
    title: 'Barrier Option',
    properties: {
      instrument: { type: 'string', enum: ['barrier'] },
      method: { type: 'string', enum: ['mc_discrete', 'mc_bridge'] },
      params: {
        type: 'object',
        required: ['K', 'T', 'type', 'H', 'barrierType'],
        properties: {
          K: { type: 'number' },
          T: { type: 'number' },
          type: { type: 'string', enum: ['call', 'put'] },
          H: { type: 'number', description: 'Barrier Level' },
          barrierType: { type: 'string', enum: ['up-out', 'down-out', 'up-in', 'down-in'] },
          paths: { type: 'number', default: 20000 },
          steps: { type: 'number', default: 100 },
          seed: { type: 'number', description: 'RNG Seed' },
        },
      },
    },
  },
  AsianParams: {
    type: 'object',
    title: 'Asian Option',
    properties: {
      instrument: { type: 'string', enum: ['asian'] },
      method: { type: 'string', enum: ['geometric_closed', 'arithmetic_mc'] },
      params: {
        type: 'object',
        required: ['K', 'T', 'type'],
        properties: {
          K: { type: 'number' },
          T: { type: 'number' },
          type: { type: 'string', enum: ['call', 'put'] },
          fixings: { type: 'number', description: 'Observation points' },
          paths: { type: 'number' },
          seed: { type: 'number' },
        },
      },
    },
  },
  ForwardParams: {
    type: 'object',
    title: 'Forward Contract',
    properties: {
      instrument: { type: 'string', enum: ['forward'] },
      method: { type: 'string', enum: ['discounted_value'] },
      params: {
        type: 'object',
        required: ['K', 'T'],
        properties: {
          K: { type: 'number', description: 'Delivery Price' },
          T: { type: 'number', description: 'Time to Expiry (years)' },
        },
      },
    },
  },
};

export const taxSchemas = {
  TaxComputeRequest: {
    type: 'object',
    required: ['asset_type', 'acquired_date', 'sold_date', 'purchase_value', 'sale_value'],
    properties: {
      asset_type: {
        type: 'string',
        enum: ['listed_equity_stt', 'listed_security_other', 'land_building', 'other_capital_asset', 'virtual_digital_asset'],
      },
      acquired_date: { type: 'string', format: 'date' },
      sold_date: { type: 'string', format: 'date' },
      purchase_value: { type: 'number' },
      sale_value: { type: 'number' },
      transfer_expenses: { type: 'number', default: 0 },
      stt_paid: { type: 'boolean', default: true },
      fmv_31jan2018: { type: 'number' },
      other_112a_ltcg_in_same_fy: { type: 'number', default: 0 },
      basic_exemption_remaining: { type: 'number', default: 0 },
      marginal_rate: { type: 'number', default: 0.3 },
      surcharge_rate: { type: 'number', default: 0 },
      cess_rate: { type: 'number', default: 0.04 },
      improvement_cost: { type: 'number', default: 0 },
      resident_individual_or_huf: { type: 'boolean', default: true },
    },
  },
  TaxComputeResponse: {
    type: 'object',
    properties: {
      classification: { type: 'string' },
      holding_days: { type: 'number' },
      holding_period_rule: { type: 'string' },
      gain: { type: 'number' },
      taxable_gain: { type: 'number' },
      base_rate: { type: 'number' },
      base_tax: { type: 'number' },
      surcharge: { type: 'number' },
      cess: { type: 'number' },
      total_tax: { type: 'number' },
      post_tax_proceeds: { type: 'number' },
      methodology: { type: 'string' },
      notes: { type: 'array', items: { type: 'string' } },
      earliest_ltcg_date: { type: 'string', nullable: true },
      tax_saving_if_wait: { type: 'number', nullable: true },
      scenario_rows: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            sale_value: { type: 'number' },
            gain: { type: 'number' },
            total_tax: { type: 'number' },
            post_tax_proceeds: { type: 'number' },
          },
        },
      },
    },
  },
};

export const strategySchemas = {
  StrategyMarketInput: {
    type: 'object',
    properties: {
      spot: { type: 'number', example: 100 },
      vol: { type: 'number', example: 0.20 },
      rate: { type: 'number', example: 0.03 },
      dividend: { type: 'number', example: 0.0 },
      skew: { type: 'number', example: 0.15 }
    },
    required: ['spot', 'vol']
  },
  StrategyViewInput: {
    type: 'object',
    properties: {
      direction: { type: 'string', enum: ['bullish', 'bearish', 'neutral'], example: 'bullish' },
      moveMode: { type: 'string', enum: ['pct', 'target'], example: 'pct' },
      movePct: { type: 'number', example: 5 },
      targetPrice: { type: 'number', nullable: true },
      horizonDays: { type: 'number', example: 30 },
      volView: { type: 'string', enum: ['flat', 'up', 'down'], example: 'flat' },
      volShift: { type: 'number', example: 0.0 },
      event: { type: 'boolean', example: false }
    },
    required: ['direction', 'horizonDays']
  },
  StrategyConstraintsInput: {
    type: 'object',
    properties: {
      maxLoss: { type: 'number', nullable: true, example: null },
      maxLegs: { type: 'integer', example: 4 },
      definedRiskOnly: { type: 'boolean', example: true },
      allowMultiExpiry: { type: 'boolean', example: true },
      incomeVsConvexity: { type: 'number', example: 0.5 }
    }
  },
  StrategyGenInput: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['black_scholes', 'binomial_crr'], example: 'black_scholes' },
      strikeStep: { type: 'number', example: 1 },
      expiryDays: { type: 'number', example: 90 },
      longExpiryDays: { type: 'number', example: 120 },
      widthPct: { type: 'number', nullable: true }
    }
  },
  StrategyRecommendRequest: {
    type: 'object',
    properties: {
      market: { $ref: '#/components/schemas/StrategyMarketInput' },
      view: { $ref: '#/components/schemas/StrategyViewInput' },
      constraints: { $ref: '#/components/schemas/StrategyConstraintsInput' },
      gen: { $ref: '#/components/schemas/StrategyGenInput' }
    },
    required: ['market', 'view', 'constraints', 'gen']
  },
  StrategyScenarioRequest: {
    type: 'object',
    properties: {
      market: { $ref: '#/components/schemas/StrategyMarketInput' },
      view: { $ref: '#/components/schemas/StrategyViewInput' },
      legs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            quantity: { type: 'number', description: 'Positive for long, negative for short' },
            instrument: { type: 'string', example: 'vanilla' },
            active: { type: 'boolean', default: true },
            params: {
              type: 'object',
              properties: {
                strike: { type: 'number' },
                time_to_expiry: { type: 'number' },
                option_type: { type: 'string', enum: ['call', 'put'] },
                vol: { type: 'number' },
                risk_free_rate: { type: 'number' }
              },
              required: ['strike', 'time_to_expiry', 'option_type', 'vol']
            }
          }
        }
      },
      net_premium: { type: 'number', description: 'The initial cost/credit of the strategy' }
    },
    required: ['market', 'view', 'legs', 'net_premium']
  },
  StrategyScenarioResponse: {
    type: 'object',
    properties: {
      scenarios: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', example: 'Spot +5%' },
            ds: { type: 'number', description: 'Spot shock %' },
            dv: { type: 'number', description: 'Vol shock (absolute)' },
            dr: { type: 'number', description: 'Rate shock (basis points)' },
            totalValue: { type: 'number', description: 'Total portfolio value post-shock' },
            pnl: { type: 'number', description: 'PnL relative to initial net premium' }
          }
        }
      }
    }
  }
};

// --- CAPBUD SCHEMAS ---
export const CapBudCashflowTableSchema = {
  type: "object",
  properties: {
    years: { type: "array", items: { type: "integer" } },
    cashflows: { type: "array", items: { type: "number" } },
    discounted_cashflows: { type: "array", items: { type: "number" } },
    cumulative_cashflows: { type: "array", items: { type: "number" } },
    cumulative_discounted_cashflows: { type: "array", items: { type: "number" } },
  },
  required: ["years", "cashflows", "discounted_cashflows", "cumulative_cashflows", "cumulative_discounted_cashflows"]
} as const;

export const CapBudProfileSchema = {
  type: "object",
  properties: {
    rates: { type: "array", items: { type: "number" } },
    npvs: { type: "array", items: { type: "number" } },
  },
  required: ["rates", "npvs"]
} as const;

export const CapBudSensitivitySchema = {
  type: "object",
  properties: {
    rate_shifts: { type: "array", items: { type: "number" } },
    scale_shifts: { type: "array", items: { type: "number" } },
    npv_grid: { type: "array", items: { type: "array", items: { type: "number" } } },
  },
  required: ["rate_shifts", "scale_shifts", "npv_grid"]
} as const;

export const CapBudComputeRequestSchema = {
  type: "object",
  properties: {
    project_name: { type: "string", default: "Project" },
    currency: { type: "string", default: "USD" },
    discount_rate: { type: "number" },
    cashflows: { type: "array", items: { type: "number" } },
    finance_rate: { type: "number", nullable: true },
    reinvest_rate: { type: "number", nullable: true },
    convention: { type: "string", enum: ["end_of_period", "mid_year"], default: "end_of_period" }
  },
  required: ["discount_rate", "cashflows"]
} as const;

export const CapBudComputeResponseSchema = {
  type: "object",
  properties: {
    run_id: { type: "string" },
    project_name: { type: "string" },
    currency: { type: "string" },
    discount_rate: { type: "number" },
    convention: { type: "string" },
    npv: { type: "number" },
    irr: { type: "number", nullable: true },
    irr_candidates: { type: "array", items: { type: "number" } },
    irr_warning: { type: "string", nullable: true },
    mirr: { type: "number", nullable: true },
    profitability_index: { type: "number", nullable: true },
    payback_period: { type: "number", nullable: true },
    discounted_payback_period: { type: "number", nullable: true },
    cashflow_table: {
      type: "object",
      properties: {
        years: { type: "array", items: { type: "number" } },
        cashflows: { type: "array", items: { type: "number" } },
        discounted_cashflows: { type: "array", items: { type: "number" } },
        cumulative_cashflows: { type: "array", items: { type: "number" } },
        cumulative_discounted_cashflows: { type: "array", items: { type: "number" } }
      }
    },
    npv_profile: {
      type: "object",
      properties: {
        rates: { type: "array", items: { type: "number" } },
        npvs: { type: "array", items: { type: "number" } }
      }
    },
    sensitivity: {
      type: "object",
      properties: {
        rate_shifts: { type: "array", items: { type: "number" } },
        scale_shifts: { type: "array", items: { type: "number" } },
        npv_grid: { type: "array", items: { type: "array", items: { type: "number" } } }
      }
    },
    decision: { type: "string" },
    notes: { type: "array", items: { type: "string" } }
  }
} as const;

// Strict TS Interfaces
export interface CapBudComputeRequest {
  project_name?: string;
  currency?: string;
  discount_rate: number;
  cashflows: number[];
  finance_rate?: number | null;
  reinvest_rate?: number | null;
  convention?: "end_of_period" | "mid_year";
}

export interface CapBudComputeResponse {
  run_id: string;
  project_name: string;
  currency: string;
  discount_rate: number;
  convention: string;
  npv: number;
  irr: number | null;
  irr_candidates: number[];
  irr_warning: string | null;
  mirr: number | null;
  profitability_index: number | null;
  payback_period: number | null;
  discounted_payback_period: number | null;
  cashflow_table: {
    years: number[];
    cashflows: number[];
    discounted_cashflows: number[];
    cumulative_cashflows: number[];
    cumulative_discounted_cashflows: number[];
  };
  npv_profile: { rates: number[]; npvs: number[] };
  sensitivity: { rate_shifts: number[]; scale_shifts: number[]; npv_grid: number[][] };
  decision: string;
  notes: string[];
}

// --- ALLOCATION & POSITION SIZING SCHEMAS ---

export const AllocationComputeRequestSchema = {
  type: "object",
  properties: {
    win_rate: { type: "number", description: "Probability of win (0 to 1)" },
    payoff_ratio: { type: "number", description: "Average Win / Average Loss" },
    starting_capital: { type: "number" },
    ruin_drawdown_pct: { type: "number", description: "Drawdown % considered 'ruin' (e.g., 0.20 for 20%)" },
    sim_runs: { type: "integer", default: 1000 },
    sim_trades: { type: "integer", default: 100 }
  },
  required: ["win_rate", "payoff_ratio", "starting_capital", "ruin_drawdown_pct"]
} as const;

export const AllocationComputeResponseSchema = {
  type: "object",
  properties: {
    run_id: { type: "string" },
    kelly_pct: { type: "number" },
    half_kelly_pct: { type: "number" },
    recommended_alloc_amount: { type: "number" },
    risk_of_ruin_prob: { type: "number" },
    expected_growth_rate: { type: "number" },
    simulated_paths: { 
      type: "array", 
      items: { type: "array", items: { type: "number" } },
      description: "Downsampled equity curves for Recharts"
    }
  },
  required: [
    "run_id", "kelly_pct", "half_kelly_pct", "recommended_alloc_amount", 
    "risk_of_ruin_prob", "expected_growth_rate", "simulated_paths"
  ]
} as const;

// Strict TS Interfaces
export interface AllocationComputeRequest {
  win_rate: number;
  payoff_ratio: number;
  starting_capital: number;
  ruin_drawdown_pct: number;
  sim_runs?: number;
  sim_trades?: number;
}

export interface AllocationComputeResponse {
  run_id: string;
  kelly_pct: number;
  half_kelly_pct: number;
  recommended_alloc_amount: number;
  risk_of_ruin_prob: number;
  expected_growth_rate: number;
  simulated_paths: number[][];
}

// --- MARGIN & BUYING POWER SCHEMAS ---
export const MarginLegSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["call", "put"] },
    action: { type: "string", enum: ["buy", "sell"] },
    quantity: { type: "number" },
    strike: { type: "number" },
    premium: { type: "number" },
  },
  required: ["type", "action", "quantity", "strike", "premium"]
} as const;

export const MarginComputeRequestSchema = {
  type: "object",
  properties: {
    spot_price: { type: "number" },
    legs: { type: "array", items: MarginLegSchema },
  },
  required: ["spot_price", "legs"]
} as const;

export const MarginComputeResponseSchema = {
  type: "object",
  properties: {
    run_id: { type: "string" },
    total_margin_req: { type: "number" },
    net_premium: { type: "number" }, // Positive = Credit, Negative = Debit
    max_return_on_capital: { type: "number", nullable: true },
    leg_margins: { type: "array", items: { type: "number" } },
    strategy_classification: { type: "string" }
  },
  required: ["run_id", "total_margin_req", "net_premium", "max_return_on_capital", "leg_margins", "strategy_classification"]
} as const;

// Strict TS Interfaces
export interface MarginLeg {
  type: "call" | "put";
  action: "buy" | "sell";
  quantity: number;
  strike: number;
  premium: number;
}

export interface MarginComputeRequest {
  spot_price: number;
  legs: MarginLeg[];
}

export interface MarginComputeResponse {
  run_id: string;
  total_margin_req: number;
  net_premium: number;
  max_return_on_capital: number | null;
  leg_margins: number[];
  strategy_classification: string;
}

// --- BETA EXPOSURE SCHEMAS ---
export const ExposureLegSchema = {
  type: "object",
  properties: {
    symbol: { type: "string" },
    asset_type: { type: "string", enum: ["stock", "option"] },
    quantity: { type: "number", description: "Negative for short positions" },
    delta: { type: "number", description: "Per-share delta (e.g., 0.50 for ATM call, 1.0 for stock)" },
    spot_price: { type: "number" },
    beta: { type: "number", description: "Beta relative to the benchmark" },
  },
  required: ["symbol", "asset_type", "quantity", "delta", "spot_price", "beta"]
} as const;

export const ExposureComputeRequestSchema = {
  type: "object",
  properties: {
    benchmark_name: { type: "string", default: "SPY" },
    benchmark_price: { type: "number" },
    legs: { type: "array", items: ExposureLegSchema },
  },
  required: ["benchmark_price", "legs"]
} as const;

export const ExposureComputeResponseSchema = {
  type: "object",
  properties: {
    run_id: { type: "string" },
    net_beta_delta: { type: "number" },
    net_dollar_exposure: { type: "number" },
    leg_exposures: { 
      type: "array", 
      items: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          raw_delta: { type: "number" },
          beta_weighted_delta: { type: "number" }
        }
      }
    }
  },
  required: ["run_id", "net_beta_delta", "net_dollar_exposure", "leg_exposures"]
} as const;

// Strict TS Interfaces
export interface ExposureLeg {
  symbol: string;
  asset_type: "stock" | "option";
  quantity: number; 
  delta: number;
  spot_price: number;
  beta: number;
}

export interface ExposureComputeRequest {
  benchmark_name?: string;
  benchmark_price: number;
  legs: ExposureLeg[];
}

export interface ExposureComputeResponse {
  run_id: string;
  net_beta_delta: number;
  net_dollar_exposure: number;
  leg_exposures: { symbol: string; raw_delta: number; beta_weighted_delta: number; }[];
}