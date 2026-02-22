import { NextResponse } from "next/server";
import { computeCapBudMetrics } from "@/features/capbud/engine";
import { type CapBudComputeRequest } from "@/app/api/docs/schemas";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CapBudComputeRequest;

    if (!body.cashflows || !Array.isArray(body.cashflows) || body.cashflows.length < 2) {
      return NextResponse.json(
        { error: "Invalid cashflows array. Requires at least t=0 and t=1." },
        { status: 400 }
      );
    }

    if (body.discount_rate === undefined || body.discount_rate === null || isNaN(body.discount_rate)) {
      return NextResponse.json(
        { error: "Invalid discount_rate." },
        { status: 400 }
      );
    }

    const runId = crypto.randomUUID();
    const result = computeCapBudMetrics(body, runId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CAPBUD_COMPUTE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during computation." },
      { status: 500 }
    );
  }
}

// Add this right above your POST function
export async function GET() {
  return NextResponse.json({ status: "ALIVE", message: "The CapBud API route is successfully wired!" });
}