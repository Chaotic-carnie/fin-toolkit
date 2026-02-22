import { NextResponse } from 'next/server';
import { recommendStrategies } from '~/features/strategy/engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { market, view, constraints, gen } = body;

    // 1. Basic Validation
    if (!market || !view || !constraints || !gen) {
      return NextResponse.json(
        { error: "Missing required payload objects: 'market', 'view', 'constraints', or 'gen'." }, 
        { status: 400 }
      );
    }

    // 2. Execute the Quant Engine
    const candidates = recommendStrategies(market, view, gen, constraints);

    // 3. Return the exact structure documented in your OpenAPI spec
    return NextResponse.json(candidates, { status: 200 });

  } catch (error: any) {
    console.error("Strategy Engine API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compute strategy candidates." }, 
      { status: 500 }
    );
  }
}