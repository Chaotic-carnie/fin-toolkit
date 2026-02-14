// src/app/api/docs/route.ts

import { NextResponse } from 'next/server';
import { pricerPaths, portfolioPaths, taxPaths, macroPaths, strategyPaths } from './paths';
import { pricerSchemas, taxSchemas, macroSchemas, strategySchemas } from './schemas';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Control Center API',
    version: '1.3.0',
    description: 'High-performance financial analytics engine. Supports Black-Scholes, Monte Carlo, Portfolio Risk, and Tax Computations.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Dev' }],
  
  // Merge all imported paths automatically
  paths: {
    ...pricerPaths,
    ...portfolioPaths,
    ...taxPaths,
    ...macroPaths,
    ...strategyPaths,
  },

  components: {
    // Merge all imported schemas automatically
    schemas: {
      ...macroSchemas,
      ...pricerSchemas,
      ...taxSchemas,
      ...strategySchemas,
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}