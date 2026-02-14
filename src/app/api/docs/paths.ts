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
  }
};