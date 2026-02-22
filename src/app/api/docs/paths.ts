// src/app/api/docs/paths.ts

export const pricerPaths = {
  '/api/price': {
    post: {
      summary: 'Price an Instrument',
      description: 'Calculates price and Greeks. The `params` object changes based on the selected `instrument`.',
      tags: ['Pricer'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PricingRequest' },
            examples: {
              Vanilla: {
                summary: 'Vanilla Call (Black-Scholes)',
                value: {
                  instrument: 'vanilla', method: 'black_scholes',
                  market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                  params: { K: 100, T: 1, type: 'call' },
                },
              },
              Barrier: {
                summary: 'Up-and-Out Barrier (Monte Carlo)',
                value: {
                  instrument: 'barrier', method: 'mc_discrete',
                  market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                  params: { K: 100, T: 1, type: 'call', H: 120, barrierType: 'up-out', paths: 50000, steps: 100, seed: 1234 },
                },
              }
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Success',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingResponse' } } },
        },
      },
    },
  },
};

export const portfolioPaths = {
  '/api/analyze': {
    post: {
      summary: 'Calculate Portfolio Risk',
      description: 'Returns Greeks, VaR, and PnL scenarios for a set of option legs.',
      tags: ['Portfolio'],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: 'object',
              properties: {
                legs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      quantity: { type: 'number' },
                      instrument: { type: 'string', enum: ['vanilla', 'digital', 'barrier'] },
                      active: { type: 'boolean' },
                      params: {
                        type: 'object',
                        properties: {
                          asset: { type: 'string' }, spot: { type: 'number' }, strike: { type: 'number' },
                          vol: { type: 'number' }, time_to_expiry: { type: 'number' }, risk_free_rate: { type: 'number' },
                          option_type: { type: 'string', enum: ['call', 'put'] }
                        },
                        required: ['spot', 'strike', 'vol', 'time_to_expiry'],
                      },
                    },
                    required: ['quantity', 'instrument', 'params'],
                  },
                },
                simulation: {
                  type: 'object',
                  properties: { spotShock: { type: 'number', default: 0 }, volShock: { type: 'number', default: 0 }, daysPassed: { type: 'number', default: 0 } },
                },
              },
              required: ['legs'],
            },
          },
        },
      },
      responses: {
        200: { description: 'Successful analysis', content: { "application/json": { schema: { type: 'object' } } } },
      },
    },
  },
};

export const taxPaths = {
  '/api/tax/compute': {
    post: {
      summary: 'Compute Capital Gains',
      description: 'Calculates STCG/LTCG, surcharge, cess, and generates tax-saving scenarios based on Indian Tax Laws.',
      tags: ['Tax'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaxComputeRequest' },
            examples: {
              EquityLTCG: {
                summary: 'Listed Equity (LTCG 112A)',
                value: {
                  asset_type: 'listed_equity_stt', acquired_date: '2023-01-01', sold_date: '2025-01-01',
                  purchase_value: 100000, sale_value: 150000, transfer_expenses: 0, stt_paid: true
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Tax Calculation Result',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxComputeResponse' } } },
        },
      },
    },
  },
};

export const macroPaths = {
  '/api/macro/market': {
    get: {
      summary: 'Get Market Snapshot',
      description: 'Returns the latest market rates and FX data for the macro stress testing engine.',
      tags: ['Macro'],
      responses: {
        '200': {
          description: 'Latest Market Data',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/MarketSnapshot' } }
          }
        }
      }
    }
  },
  '/api/macro/calendar': {
    get: {
      summary: 'Get Economic Calendar',
      description: 'Fetches high-impact economic events for a specific year.',
      tags: ['Macro'],
      parameters: [
        {
          name: 'year',
          in: 'query',
          required: true,
          description: 'The year to fetch events for (e.g. 2026)',
          schema: { type: 'integer', example: 2026 }
        }
      ],
      responses: {
        '200': {
          description: 'Array of Economic Events',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/EconomicEvent' } }
            }
          }
        }
      }
    }
  },
  '/api/macro/portfolio': {
    get: {
      summary: 'Get Macro Portfolio',
      description: 'Retrieves all active positions in the macro stress-testing book.',
      tags: ['Macro'],
      responses: {
        '200': {
          description: 'Array of Macro Positions',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/MacroPosition' } }
            }
          }
        }
      }
    },
    post: {
      summary: 'Add Macro Position',
      description: 'Adds a new cross-asset position to the macro book (Bond, Equity, Option, etc.).',
      tags: ['Macro'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MacroPositionInput' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Position successfully added',
          content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } }
        }
      }
    }
  }
};


export const strategyPaths = {
  '/api/strategy/recommend': {
    post: {
      summary: 'Recommend Options Strategies',
      description: 'Generates, prices, and scores optimal multi-leg option strategies based on market assumptions, directional views, and risk constraints.',
      tags: ['Strategy Builder'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StrategyRecommendRequest' },
            examples: {
              BullishBreakout: {
                summary: 'Bullish +5% Move',
                value: {
                  market: { spot: 100, vol: 0.2, rate: 0.03, dividend: 0, skew: 0.15 },
                  view: { direction: 'bullish', moveMode: 'pct', movePct: 5, horizonDays: 30, volView: 'flat', volShift: 0, event: false },
                  constraints: { maxLoss: null, maxLegs: 4, definedRiskOnly: true, allowMultiExpiry: true, incomeVsConvexity: 0.5 },
                  gen: { method: 'black_scholes', strikeStep: 1, expiryDays: 90, longExpiryDays: 120, widthPct: null }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Top scored strategy candidates',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { type: 'object' } // Detailed Candidate Response
              }
            }
          }
        }
      }
    }
  },
  '/api/strategy/scenario': {
    post: {
      summary: 'Generate Scenario Pack Analysis',
      description: 'Calculates the PnL of a given options structure under various spot, volatility, and interest rate shocks at the target horizon date.',
      tags: ['Strategy Builder'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StrategyScenarioRequest' },
            examples: {
              StandardStress: {
                summary: 'Standard 8-Scenario Stress Test',
                value: {
                  market: { spot: 100, vol: 0.2, rate: 0.03, dividend: 0, skew: 0.15 },
                  view: { direction: 'bullish', moveMode: 'pct', movePct: 5, horizonDays: 30, volView: 'flat', volShift: 0, event: false },
                  net_premium: 2.50,
                  legs: [
                    {
                      quantity: 1,
                      instrument: 'vanilla',
                      active: true,
                      params: { strike: 100, time_to_expiry: 0.25, option_type: 'call', vol: 0.2, risk_free_rate: 0.03 }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Calculated scenarios with PnL',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StrategyScenarioResponse' }
            }
          }
        }
      }
    }
  }
};

export const capbudPaths = {
  '/api/capbud/compute': {
    post: {
      summary: 'Compute Capital Budgeting Metrics',
      description: 'Calculates NPV, IRR, MIRR, Payback periods, and generates sensitivity grids and NPV profiles.',
      tags: ['Capital Budgeting'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CapBudComputeRequest' },
            examples: {
              StandardExpansion: {
                summary: 'Standard 5-Year Expansion',
                value: {
                  project_name: "Expansion Project A",
                  currency: "USD",
                  discount_rate: 0.10,
                  convention: "end_of_period",
                  cashflows: [-1000, 300, 300, 300, 300, 300]
                }
              },
              MidYearWACC: {
                summary: 'Mid-Year Convention with MIRR',
                value: {
                  project_name: "Heavy Machinery Purchase",
                  currency: "USD",
                  discount_rate: 0.12,
                  finance_rate: 0.08,
                  reinvest_rate: 0.10,
                  convention: "mid_year",
                  cashflows: [-50000, 15000, 18000, 22000, 12000]
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Successful computation',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CapBudComputeResponse' }
            }
          }
        },
        '400': {
          description: 'Invalid input (e.g., missing cashflows or discount rate)',
          content: { 'application/json': { schema: { type: 'object' } } }
        },
        '500': {
          description: 'Internal server error during computation',
          content: { 'application/json': { schema: { type: 'object' } } }
        }
      }
    }
  }
};

export const allocationPaths = {
  '/api/allocation/compute': {
    post: {
      summary: 'Compute Kelly Criterion & Risk of Ruin',
      description: 'Calculates optimal position sizing and runs a Monte Carlo simulation for drawdown probabilities.',
      tags: ['Capital Allocation'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AllocationComputeRequest' } }
        }
      },
      responses: {
        '200': {
          description: 'Successful computation',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AllocationComputeResponse' } } }
        }
      }
    }
  }
};

export const marginPaths = {
  '/api/margin/compute': {
    post: {
      summary: 'Compute Reg T Margin',
      description: 'Calculates Initial Margin requirements and ROC for an options strategy.',
      tags: ['Capital Margin'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/MarginComputeRequest' } } }
      },
      responses: {
        '200': {
          description: 'Margin computed',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MarginComputeResponse' } } }
        }
      }
    }
  }
};

export const exposurePaths = {
  '/api/exposure/compute': {
    post: {
      summary: 'Compute Beta-Weighted Exposure',
      description: 'Calculates portfolio directional risk normalized to a benchmark.',
      tags: ['Capital Exposure'],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExposureComputeRequest' } } } },
      responses: { '200': { description: 'Exposure computed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExposureComputeResponse' } } } } }
    }
  }
};