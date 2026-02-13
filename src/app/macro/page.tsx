import { Suspense } from "react";
import { db } from "@/server/db";
import { getCombinedTimeline } from "@/server/services/macro-data";
import { MacroClient } from "@/features/macro/client";
import { fetchCalendarEvents } from "@/features/macro/actions";

async function getInitialData() {
  const timeline = getCombinedTimeline(60); 
  const latest = timeline[timeline.length - 1];

  const snapshot = {
    id: "latest",
    date: new Date(latest?.month || new Date()),
    usdinr: latest?.usdinr ?? 83.0,
    inr3m: latest?.rate_3m_pct ?? 6.5,
    inr10y: latest?.rate_10y_pct ?? 7.2,
    cpiIndex: latest?.cpi_index ?? 0,
    createdAt: new Date(),
  };

  const positions = await db.portfolioPosition.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // Default to 2026 to match your initial view
  const { events } = await fetchCalendarEvents(2026);

  return { snapshot, positions, events };
}

export default async function MacroPage() {
  const { snapshot, positions, events } = await getInitialData();

  return (
    <main className="h-screen w-full bg-slate-950 overflow-y-auto dark-scrollbar">
      {/* ADDED pt-24 to push content below fixed navbar */}
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6 pt-24 pb-20">
        
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">Macro Risk Engine</h1>
          <p className="text-sm text-slate-400">
            Real-time stress testing of sovereign bonds and FX derivatives.
          </p>
        </div>

        <Suspense fallback={<div className="text-emerald-500 animate-pulse">Loading Quant Engine...</div>}>
          <MacroClient 
            snapshot={snapshot} 
            positions={positions} 
            events={events || []} 
          />
        </Suspense>
      </div>
    </main>
  );
}