"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";

// 1. GET PORTFOLIO
export async function getPortfolio() {
  try {
    const positions = await db.portfolioPosition.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, positions };
  } catch (e) {
    return { success: false, error: "Failed to load portfolio" };
  }
}

// 2. ADD POSITION
export async function addPosition(data: {
  name: string;
  type: "BOND" | "FX";
  bucket: "short" | "long";
  duration: number;
  amount: number;
}) {
  try {
    await db.portfolioPosition.create({
      data: {
        name: data.name,
        type: data.type,
        bucket: data.bucket,
        duration: data.duration,
        amount: data.amount,
        convexity: 0 // Default for now
      }
    });
    revalidatePath("/macro");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to add position" };
  }
}

// 3. DELETE POSITION
export async function deletePosition(id: string) {
  try {
    await db.portfolioPosition.delete({ where: { id } });
    revalidatePath("/macro");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete" };
  }
}