import { NextResponse } from 'next/server';
import { db } from "@/server/db";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.portfolioPosition.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Position Closed" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete position" }, { status: 500 });
  }
}