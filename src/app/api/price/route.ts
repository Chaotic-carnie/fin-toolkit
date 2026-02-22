// src/app/api/price/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PricingRequestSchema } from "@/features/pricing/schema";
// Import your existing math logic. 
// Ideally, refactor 'engine.ts' to export 'calculatePrice' directly, 
// or paste the 'solveBlackScholes', 'solveBinomial' etc. here.
import { calculatePriceDetails } from "@/features/pricing/engine"; 

export async function POST(req: NextRequest) {
  try {
    const start = performance.now();
    
    // 1. Parse & Validate Body
    const body = await req.json();
    const validated = PricingRequestSchema.parse(body);

    // 2. Assemble the "Inputs" object expected by your math engine
    const engineInputs = {
      ...validated.market,
      ...validated.params,
      // Pass instrument keys if your engine needs them to switch logic
      instrument: validated.instrument, 
      method: validated.method
    };

    // 3. Run Calculation (Synchronously on Server)
    // We assume you updated engine.ts to export a function that returns { price, delta... }
    // instead of the async 'computeResult' wrapper.
    const result = calculatePriceDetails(validated.method, validated.instrument, engineInputs);

    const end = performance.now();

    // 4. Return JSON
    return NextResponse.json({
      ...result,
      latency: Math.round(end - start),
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Calculation Failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 400 }
    );
  }
}