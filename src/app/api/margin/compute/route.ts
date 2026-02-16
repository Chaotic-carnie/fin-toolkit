import { NextResponse } from "next/server";
import { computeMarginMetrics } from "@/features/margin/engine";
import { MarginComputeRequest } from "@/app/api/docs/schemas";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MarginComputeRequest;

    if (!body.legs || !Array.isArray(body.legs) || body.legs.length === 0) {
      return NextResponse.json({ error: "Requires at least one option leg." }, { status: 400 });
    }
    if (body.spot_price <= 0) {
      return NextResponse.json({ error: "Spot price must be > 0" }, { status: 400 });
    }

    const runId = randomUUID();
    const result = computeMarginMetrics(body, runId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[MARGIN_COMPUTE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during margin computation." },
      { status: 500 }
    );
  }
}