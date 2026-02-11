import { NextResponse } from 'next/server';
import { db } from "@/server/db";

export async function GET() {
  try {
    const latest = await db.marketSnapshot.findFirst({
      orderBy: { date: "desc" },
    });

    // Return DB data or Safe Defaults
    return NextResponse.json(latest || {
      usdinr: 83.5,
      inr10y: 7.18,
      inr3m: 6.85,
      updatedAt: new Date()
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}