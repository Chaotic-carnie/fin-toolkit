import { NextResponse } from 'next/server';
import { db } from "@/server/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');

  // Filter by year if provided, otherwise fetch upcoming
  const whereClause = year 
    ? { date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } }
    : { date: { gte: new Date() } };

  const events = await db.economicEvent.findMany({
    where: whereClause,
    orderBy: { date: "asc" },
    take: 50
  });

  return NextResponse.json(events);
}