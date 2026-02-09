import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Control Center API',
    version: '1.2.0',
    description: 'High-performance financial analytics engine. Supports Black-Scholes, Binomial Trees, and Monte Carlo simulations.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Dev' }],
  paths: {
    // --- 1. THE PRICER (Your Detailed Version) ---
    '/api/price': {
      post: {
        summary: 'Price an Instrument',
        description: 'Calculates price and Greeks. The `params` object changes based on the selected `instrument`.',
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
                    params: { K: 100, T: 1, type: 'call' }
                  }
                },
                American: {
                  summary: 'American Put (Binomial)',
                  value: {
                    instrument: 'american',
                    method: 'binomial_crr',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'put', steps: 200 }
                  }
                },
                Barrier: {
                  summary: 'Up-and-Out Barrier (Monte Carlo)',
                  value: {
                    instrument: 'barrier',
                    method: 'mc_discrete',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'call', H: 120, barrierType: 'up-out', paths: 50000, steps: 100, seed: 1234 }
                  }
                },
                Digital: {
                  summary: 'Digital Call (Cash-or-Nothing)',
                  value: {
                    instrument: 'digital',
                    method: 'black_scholes',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'call', payout: 100 }
                  }
                },
                Asian: {
                  summary: 'Asian Arithmetic (Monte Carlo)',
                  value: {
                    instrument: 'asian',
                    method: 'arithmetic_mc',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 100, T: 1, type: 'call', fixings: 50, paths: 20000 }
                  }
                },
                Forward: {
                  summary: 'Forward Contract',
                  value: {
                    instrument: 'forward',
                    method: 'discounted_value',
                    market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
                    params: { K: 105, T: 1 }
                  }
                }
              }
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
                type: "object",
                properties: {
                  legs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        quantity: { type: "number" },
                        instrument: { type: "string", enum: ["vanilla", "digital", "barrier"] },
                        active: { type: "boolean" },
                        params: {
                          type: "object",
                          properties: {
                            asset: { type: "string" },
                            spot: { type: "number" },
                            strike: { type: "number" },
                            vol: { type: "number" },
                            time_to_expiry: { type: "number" },
                            risk_free_rate: { type: "number" },
                            option_type: { type: "string", enum: ["call", "put"] },
                            dividend_yield: { type: "number" },
                            barrier: { type: "number" }
                          },
                          required: ["spot", "strike", "vol", "time_to_expiry"]
                        }
                      },
                      required: ["quantity", "instrument", "params"]
                    }
                  },
                  simulation: {
                    type: "object",
                    properties: {
                      spotShock: { type: "number", default: 0 },
                      volShock: { type: "number", default: 0 },
                      daysPassed: { type: "number", default: 0 }
                    }
                  }
                },
                required: ["legs"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Successful analysis",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    timestamp: { type: "string" },
                    data: { type: "object" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
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
            }
          },
          instrument: {
            type: 'string',
            enum: ['vanilla', 'american', 'digital', 'barrier', 'asian', 'forward']
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
          }
        },
        oneOf: [
          { $ref: '#/components/schemas/VanillaParams' },
          { $ref: '#/components/schemas/AmericanParams' },
          { $ref: '#/components/schemas/DigitalParams' },
          { $ref: '#/components/schemas/BarrierParams' },
          { $ref: '#/components/schemas/AsianParams' },
          { $ref: '#/components/schemas/ForwardParams' },
        ]
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
              steps: { type: 'number', description: 'Steps (Binomial only)' }
            }
          }
        }
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
              steps: { type: 'number', description: 'Tree Steps', default: 200 }
            }
          }
        }
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
              payout: { type: 'number', description: 'Cash payout if ITM', default: 1.0 }
            }
          }
        }
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
              seed: { type: 'number', description: 'RNG Seed' }
            }
          }
        }
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
              fixings: { type: 'number', description: 'Observation points (MC only)' },
              paths: { type: 'number' },
              seed: { type: 'number' }
            }
          }
        }
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
              T: { type: 'number', description: 'Time to Expiry (years)' }
            }
          }
        }
      }
    }
  }
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}