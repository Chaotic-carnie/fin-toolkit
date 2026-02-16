import { NextResponse } from "next/server";
import { computeAllocationMetrics } from "@/features/allocation/engine";
import { AllocationComputeRequest } from "@/app/api/docs/schemas";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AllocationComputeRequest;

    // Strict validation mappings
    if (body.win_rate < 0 || body.win_rate > 1) {
      return NextResponse.json({ error: "Win rate must be between 0 and 1" }, { status: 400 });
    }
    if (body.payoff_ratio <= 0) {
      return NextResponse.json({ error: "Payoff ratio must be > 0" }, { status: 400 });
    }
    if (body.starting_capital <= 0) {
      return NextResponse.json({ error: "Starting capital must be > 0" }, { status: 400 });
    }

    const runId = randomUUID();
    const result = computeAllocationMetrics(body, runId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ALLOCATION_COMPUTE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during allocation computation." },
      { status: 500 }
    );
  }
}