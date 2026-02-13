import { NextResponse } from 'next/server';
import { runTaxCompute } from '@/features/tax/engine';
import { TaxComputeRequest } from '@/features/tax/types';

export async function POST(request: Request) {
  try {
    const body: TaxComputeRequest = await request.json();
    const result = runTaxCompute(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Tax Engine Error:", error);
    return NextResponse.json(
      { error: "Failed to compute tax. Please verify inputs." },
      { status: 400 }
    );
  }
}