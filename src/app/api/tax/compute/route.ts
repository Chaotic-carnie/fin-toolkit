// src/app/api/tax/compute/route.ts

import { NextResponse } from 'next/server';
import { runTaxCompute } from '@/features/tax/engine';
import { TaxComputeRequest } from '@/features/tax/types';
import { isBefore, parseISO, startOfDay } from 'date-fns';

// Legal boundary for the current engine logic
const EFFECTIVE_DATE = startOfDay(new Date('2024-07-23'));

export async function POST(request: Request) {
  try {
    const body: TaxComputeRequest = await request.json();

    // 1. STACK BOUNDARY CHECK: Ensure the date is within supported legal regime
    const soldDate = startOfDay(parseISO(body.sold_date));
    if (isBefore(soldDate, EFFECTIVE_DATE)) {
      return NextResponse.json(
        { 
          error: "Date out of range", 
          details: "This engine strictly supports calculations for trades executed on or after the July 23, 2024 Budget Reform." 
        },
        { status: 400 }
      );
    }

    // 2. SURCHARGE HARDENING: Clamp surcharge rate to 15% (Legal cap for CG)
    // Even if user provides 0.25 or 0.37, we treat as 0.15 for computation.
    const sanitizedBody = {
      ...body,
      surcharge_rate: body.surcharge_rate ? Math.min(body.surcharge_rate, 0.15) : 0
    };

    const result = runTaxCompute(sanitizedBody);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Tax Engine Error:", error);
    
    // Check if it's the internal error thrown by computeCore
    const errorMessage = error instanceof Error ? error.message : "Failed to compute tax.";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}