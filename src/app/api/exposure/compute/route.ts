import { NextResponse } from "next/server";
import { computeExposureMetrics } from "@/features/exposure/engine";
import { ExposureComputeRequest } from "@/app/api/docs/schemas";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExposureComputeRequest;

    if (body.benchmark_price <= 0) {
      return NextResponse.json({ error: "Benchmark price must be > 0" }, { status: 400 });
    }

    const runId = randomUUID();
    const result = computeExposureMetrics(body, runId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[EXPOSURE_COMPUTE_ERROR]", error);
    return NextResponse.json({ error: "Internal server error during exposure computation." }, { status: 500 });
  }
}