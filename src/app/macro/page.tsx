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

  const rawPositions = await db.portfolioPosition.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const positions = rawPositions.map(p => ({
    ...p,
    amount: Number(p.amount),
    duration: Number(p.duration || 0),
    convexity: Number(p.convexity || 0),
    beta: Number(p.beta || 1),
    spreadDuration: Number(p.spreadDuration || 0),
  }));

  const { events } = await fetchCalendarEvents(2026);

  return { snapshot, positions: positions as any, events };
}

export default async function MacroPage() {
  const { snapshot, positions, events } = await getInitialData();

  return (
    <main className="h-screen w-full bg-slate-950 flex flex-col pt-0 print:h-auto print:block print:pt-0">
      
      {/* 2. The inner div handles the scrolling. Because it starts BELOW the padding, it can never overlap the navbar! */}
      <div className="flex-1 overflow-y-auto dark-scrollbar p-4 lg:p-6 print:overflow-visible">
        
        <div className="max-w-[1600px] mx-auto pb-20">
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight uppercase text-white">Macro Risk <span className="text-blue-600">Engine</span></h1>
            <p className="text-sm text-slate-400">
              Real-time stress testing of sovereign bonds, FX, equities, and credit.
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

      </div>
    </main>
  );
}