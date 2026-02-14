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
  // --- NEW: Schema for adding a position via API ---
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

// src/app/api/docs/schemas.ts

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
  }
};