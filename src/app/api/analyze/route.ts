import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PortfolioLegSchema } from "@/features/portfolio/schema";
import { computePortfolioMetrics } from "@/features/portfolio/engine";

// Define the Request Schema
const AnalyzeRequestSchema = z.object({
  legs: z.array(PortfolioLegSchema),
  simulation: z.object({
    spotShock: z.number().default(0),
    volShock: z.number().default(0),
    daysPassed: z.number().default(0),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Validate Input (Fast & Safe)
    const result = AnalyzeRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid Input", details: result.error.errors }, 
        { status: 400 }
      );
    }

    const { legs, simulation } = result.data;
    const sim = simulation || { spotShock: 0, volShock: 0, daysPassed: 0 };

    // 2. Run the Math Engine (Same logic as Frontend)
    const { metrics } = computePortfolioMetrics(
      legs,
      sim.spotShock,
      sim.volShock,
      sim.daysPassed
    );

    // 3. Return Pure Data
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      data: metrics,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}