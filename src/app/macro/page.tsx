import { db } from "@/server/db";
import { MacroClient } from "./client";

// This MUST be a Server Component (async), so DO NOT add "use client" here.
export default async function MacroPage() {
  
  // 1. Fetch Market Snapshot (with fallback if DB is empty)
  const latest = await db.marketSnapshot.findFirst({
    orderBy: { date: "desc" },
  });

  const safeSnapshot = latest || {
    id: "dummy",
    date: new Date(),
    usdinr: 83.5,
    inr10y: 7.1,
    inr3m: 6.8,
    cpiIndex: 0,
    cpiYoy: 5.1,
    marketRegime: "Neutral",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 2. Fetch Economic Events
  const events = await db.economicEvent.findMany({
    where: {
      date: {
        gte: new Date(), 
      },
    },
    orderBy: { date: "asc" },
    take: 50,
  });

  // 3. Fetch Portfolio Positions (Your Live Book)
  const positions = await db.portfolioPosition.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    // We use bg-transparent because the global layout already handles the dark background
    <main className="h-[calc(100vh-4rem)] w-full overflow-y-auto bg-transparent text-white dark-scrollbar">
      <MacroClient 
        snapshot={safeSnapshot} 
        events={events} 
        positions={positions} 
      />
    </main>
  );
}