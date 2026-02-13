import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Control Center API',
    version: '1.2.0',
    description:
      'High-performance financial analytics engine. Supports Black-Scholes, Binomial Trees, and Monte Carlo simulations.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Dev' }],

  paths: {
    // --- 1. THE PRICER (Your Detailed Version) ---
    '/api/price': {
      post: {
        summary: 'Price an Instrument',
        description:
          'Calculates price and Greeks. The `params` object changes based on the selected `instrument`.',
        tags: ['Pricer'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PricingRequest',
              },
              examples: {
                Vanilla: {
                  summary: 'Vanilla Call (Black-Scholes)',
                  value: {
                    instrument: 'vanilla',
                    method: 'black_scholes',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'call' },
                  },
                },
                American: {
                  summary: 'American Put (Binomial)',
                  value: {
                    instrument: 'american',
                    method: 'binomial_crr',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'put', steps: 200 },
                  },
                },
                Barrier: {
                  summary: 'Up-and-Out Barrier (Monte Carlo)',
                  value: {
                    instrument: 'barrier',
                    method: 'mc_discrete',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: {
                      K: 100,
                      T: 1,
                      type: 'call',
                      H: 120,
                      barrierType: 'up-out',
                      paths: 50000,
                      steps: 100,
                      seed: 1234,
                    },
                  },
                },
                Digital: {
                  summary: 'Digital Call (Cash-or-Nothing)',
                  value: {
                    instrument: 'digital',
                    method: 'black_scholes',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'call', payout: 100 },
                  },
                },
                Asian: {
                  summary: 'Asian Arithmetic (Monte Carlo)',
                  value: {
                    instrument: 'asian',
                    method: 'arithmetic_mc',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'call', fixings: 50, paths: 20000 },
                  },
                },
                Forward: {
                  summary: 'Forward Contract',
                  value: {
                    instrument: 'forward',
                    method: 'discounted_value',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 105, T: 1 },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PricingResponse' },
              },
            },
          },
        },
      },
    },

    // --- 2. THE PORTFOLIO (Preserved from previous step so Portfolio Page works) ---
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
                        instrument: {
                          type: 'string',
                          enum: ['vanilla', 'digital', 'barrier'],
                        },
                        active: { type: 'boolean' },
                        params: {
                          type: 'object',
                          properties: {
                            asset: { type: 'string' },
                            spot: { type: 'number' },
                            strike: { type: 'number' },
                            vol: { type: 'number' },
                            time_to_expiry: { type: 'number' },
                            risk_free_rate: { type: 'number' },
                            option_type: {
                              type: 'string',
                              enum: ['call', 'put'],
                            },
                            dividend_yield: { type: 'number' },
                            barrier: { type: 'number' },
                          },
                          required: ['spot', 'strike', 'vol', 'time_to_expiry'],
                        },
                      },
                      required: ['quantity', 'instrument', 'params'],
                    },
                  },
                  simulation: {
                    type: 'object',
                    properties: {
                      spotShock: { type: 'number', default: 0 },
                      volShock: { type: 'number', default: 0 },
                      daysPassed: { type: 'number', default: 0 },
                    },
                  },
                },
                required: ['legs'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Successful analysis',
            content: {
              "application/json": {
                schema: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // --- 3. THE TAX ENGINE (NEW) ---
    '/api/tax/compute': {
      post: {
        summary: 'Compute Capital Gains',
        description:
          'Calculates STCG/LTCG, surcharge, cess, and generates tax-saving scenarios based on Indian Tax Laws.',
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
                    asset_type: 'listed_equity_stt',
                    acquired_date: '2023-01-01',
                    sold_date: '2025-01-01',
                    purchase_value: 100000,
                    sale_value: 150000,
                    transfer_expenses: 0,
                    stt_paid: true,
                    other_112a_ltcg_in_same_fy: 0,
                    basic_exemption_remaining: 0,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tax Calculation Result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaxComputeResponse' },
              },
            },
          },
        },
      },
    },
  },

  components: {
    schemas: {
      // --- MACRO SCHEMAS (NEW) ---
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
          previous: { type: 'string' },
          forecast: { type: 'string' }
        }
      },
      MacroPosition: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['BOND', 'FX'] },
          bucket: { type: 'string', enum: ['short', 'long'] },
          amount: { type: 'number' },
          duration: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },

      // --- SHARED RESPONSE SCHEMA ---
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

      // Polymorphic Request Schema
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

      // --- Detailed Sub-Schemas ---

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
              payout: {
                type: 'number',
                description: 'Cash payout if ITM',
                default: 1.0,
              },
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
              barrierType: {
                type: 'string',
                enum: ['up-out', 'down-out', 'up-in', 'down-in'],
              },
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
          method: {
            type: 'string',
            enum: ['geometric_closed', 'arithmetic_mc'],
          },
          params: {
            type: 'object',
            required: ['K', 'T', 'type'],
            properties: {
              K: { type: 'number' },
              T: { type: 'number' },
              type: { type: 'string', enum: ['call', 'put'] },
              fixings: { type: 'number', description: 'Observation points (MC only)' },
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

      TaxComputeRequest: {
        type: 'object',
        required: ['asset_type', 'acquired_date', 'sold_date', 'purchase_value', 'sale_value'],
        properties: {
          asset_type: {
            type: 'string',
            enum: [
              'listed_equity_stt',
              'listed_security_other',
              'land_building',
              'other_capital_asset',
              'virtual_digital_asset',
            ],
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
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}
