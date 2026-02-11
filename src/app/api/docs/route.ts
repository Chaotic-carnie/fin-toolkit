import { NextResponse } from 'next/server';

// ============================================================================
// MODULE 1: PRICER API DEFINITION
// ============================================================================
const PRICER_PATH = {
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
            example: {
              instrument: 'vanilla',
              method: 'black_scholes',
              market: { S: 100, r: 0.05, q: 0, sigma: 0.2 },
              params: { K: 100, T: 1, type: 'call' }
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
};

// ============================================================================
// MODULE 2: PORTFOLIO API DEFINITION
// ============================================================================
const PORTFOLIO_PATH = {
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
                legs: { type: "array", items: { $ref: "#/components/schemas/PortfolioLeg" } },
                simulation: { 
                    type: "object", 
                    properties: { 
                        spotShock: { type: "number" }, 
                        volShock: { type: "number" }, 
                        daysPassed: { type: "number" } 
                    } 
                }
              },
              example: {
                legs: [
                  {
                    id: "demo-leg-1",
                    quantity: 1,
                    instrument: "vanilla",
                    active: true,
                    params: {
                      asset: "BTC",
                      spot: 46000,
                      strike: 48000,
                      vol: 0.65,
                      time_to_expiry: 0.1,
                      risk_free_rate: 0.05,
                      option_type: "call"
                    }
                  }
                ],
                simulation: { volShock: 0, daysPassed: 0 }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Successful analysis",
            content: { "application/json": { schema: { type: "object" } } }
          }
        }
      }
    }
  },
};

// ============================================================================
// MODULE 3: MACRO API DEFINITION (NEW)
// ============================================================================
const MACRO_PATH = {
  '/api/macro/market': {
    get: {
      summary: 'Get Market Snapshot',
      description: 'Returns the latest live rates for USD/INR, 10Y Bond Yield, and 3M T-Bill Yield.',
      tags: ['Macro'],
      responses: {
        '200': {
          description: 'Latest Market Data',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketSnapshot' } } }
        }
      }
    }
  },
  '/api/macro/calendar': {
    get: {
      summary: 'Get Economic Calendar',
      description: 'Returns upcoming high-impact economic events (CPI, GDP, Fed Policy).',
      tags: ['Macro'],
      parameters: [
          { name: 'year', in: 'query', schema: { type: 'integer' }, description: 'Filter events by year (e.g. 2025)' }
      ],
      responses: {
        '200': {
          description: 'List of Events',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/EconomicEvent' } } } }
        }
      }
    }
  },
  '/api/macro/portfolio': {
    get: {
      summary: 'Get Macro Book',
      description: 'Returns all active positions (Bonds and FX Hedges) in the macro book.',
      tags: ['Macro'],
      responses: {
        '200': {
          description: 'Portfolio Positions',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MacroPosition' } } } }
        }
      }
    },
    post: {
      summary: 'Add Macro Position',
      description: 'Books a new trade (Bond or FX) into the risk engine.',
      tags: ['Macro'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'type', 'bucket', 'amount', 'duration'],
              properties: {
                name: { type: 'string', example: '7.26% GS 2033' },
                type: { type: 'string', enum: ['BOND', 'FX'] },
                bucket: { type: 'string', enum: ['short', 'long'] },
                amount: { type: 'number', description: 'Notional Amount' },
                duration: { type: 'number', description: 'Modified Duration' }
              }
            }
          }
        },
      },
      responses: {
        '200': { description: 'Position Added' }
      }
    }
  },
  '/api/macro/portfolio/{id}': {
    delete: {
      summary: 'Close Macro Position',
      description: 'Removes a trade from the active book.',
      tags: ['Macro'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        '200': { description: 'Position Deleted' }
      }
    }
  }
};

// ============================================================================
// MAIN SPECIFICATION
// ============================================================================
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Control Center API',
    version: '1.3.0',
    description: 'High-performance financial analytics engine. Supports Pricing, Portfolio Risk, and Macro Economic Analysis.',
  },
  servers: [{ url: '/', description: 'Current Server' }],
  paths: {
    ...PRICER_PATH,    // Module 1
    ...PORTFOLIO_PATH, // Module 2
    ...MACRO_PATH,     // Module 3 (New)
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
      
      // --- PORTFOLIO SCHEMAS ---
      PortfolioLeg: {
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
              option_type: { type: "string", enum: ["call", "put"] }
            }
          }
        }
      },

      // --- PRICER REQUEST SCHEMAS ---
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
      
      // --- DETAILED SUB-SCHEMAS FOR PRICER ---
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