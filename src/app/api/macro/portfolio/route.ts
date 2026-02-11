import { NextResponse } from 'next/server';
import { db } from "@/server/db";

// GET: Fetch all active positions
export async function GET() {
  try {
    const positions = await db.portfolioPosition.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(positions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

// POST: Book a new trade
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Validate required fields
    if (!body.name || !body.amount || !body.duration) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 2. Safe Parsing (Prevent NaN)
    const amount = parseFloat(body.amount);
    const duration = parseFloat(body.duration);

    if (isNaN(amount) || isNaN(duration)) {
        return NextResponse.json({ error: "Invalid numeric values" }, { status: 400 });
    }

    // 3. Save to DB
    const position = await db.portfolioPosition.create({
      data: {
        name: body.name,
        type: body.type || 'BOND',
        bucket: body.bucket || 'long',
        amount: amount,
        duration: duration,
        convexity: 0
      }
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to book trade" }, { status: 500 });
  }
}