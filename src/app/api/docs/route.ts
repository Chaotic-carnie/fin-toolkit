// src/app/api/docs/route.ts

import { NextRequest, NextResponse } from 'next/server';

// 1. Import all your path groupings
import { 
  pricerPaths, 
  portfolioPaths, 
  taxPaths, 
  macroPaths, 
  strategyPaths, 
  capbudPaths,
  allocationPaths, 
  marginPaths,     
  exposurePaths    
} from './paths';

// 2. Import your grouped schemas AND your individually exported schemas
import { 
  pricerSchemas, 
  taxSchemas, 
  macroSchemas, 
  strategySchemas,
  CapBudComputeRequestSchema,
  CapBudComputeResponseSchema,
  AllocationComputeRequestSchema,
  AllocationComputeResponseSchema,
  MarginComputeRequestSchema,
  MarginComputeResponseSchema,
  ExposureComputeRequestSchema,
  ExposureComputeResponseSchema
} from './schemas';

export async function GET(req: NextRequest) {
  // Dynamically grab the domain (e.g. "http://localhost:3000" or "https://fin-toolkit.com")
  const baseUrl = req.nextUrl.origin;

  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Control Center API',
      version: '1.3.0',
      description: 'High-performance financial analytics engine. Supports Black-Scholes, Monte Carlo, Portfolio Risk, Tax Computations, and Capital Budgeting.',
    },
    
    // Automatically applies localhost or production domain to curl commands
    servers: [
      { 
        url: baseUrl, 
        description: baseUrl.includes('localhost') ? 'Local Development' : 'Production Environment' 
      }
    ],
    
    paths: {
      ...pricerPaths,
      ...portfolioPaths,
      ...taxPaths,
      ...macroPaths,
      ...strategyPaths,
      ...capbudPaths,
      ...allocationPaths,
      ...marginPaths,
      ...exposurePaths,
    },

    components: {
      schemas: {
        ...macroSchemas,
        ...pricerSchemas,
        ...taxSchemas,
        ...strategySchemas,
        
        // Map the individually exported schemas to match the exact names used in your $refs
        CapBudComputeRequest: CapBudComputeRequestSchema,
        CapBudComputeResponse: CapBudComputeResponseSchema,
        AllocationComputeRequest: AllocationComputeRequestSchema,
        AllocationComputeResponse: AllocationComputeResponseSchema,
        MarginComputeRequest: MarginComputeRequestSchema,
        MarginComputeResponse: MarginComputeResponseSchema,
        ExposureComputeRequest: ExposureComputeRequestSchema,
        ExposureComputeResponse: ExposureComputeResponseSchema,
      },
    },
  };

  return NextResponse.json(openApiSpec);
}