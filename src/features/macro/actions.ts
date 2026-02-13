"use server";

import { db } from "@/server/db";
import { getCombinedTimeline } from "@/server/services/macro-data";
import { revalidatePath } from "next/cache";

// --- 1. Refresh Market Data ---
export async function refreshMarketData() {
  // In a real app, this might fetch live from FRED API or Bloomberg
  // For now, we re-read the CSV seed data to simulate a refresh
  const timeline = getCombinedTimeline(1); // Get latest point
  const latest = timeline[timeline.length - 1];

  if (!latest) throw new Error("No market data available");

  // Optional: Update a 'SystemStatus' table in DB if you track last refresh time
  
  revalidatePath("/macro"); // Force page to reload with new CSV data
  return { success: true, latest };
}

// --- 2. Calendar Events ---
export async function fetchCalendarEvents(year: number) {
  // You can seed this from a JSON file or DB. 
  // Returning mock data for the example to work immediately.
  
  const events2026 = [
    { id: "1", date: new Date("2026-01-28"), event: "FOMC Decision", impact: "HIGH", actual: "5.25%", consensus: "5.25%" },
    { id: "2", date: new Date("2026-02-14"), event: "US CPI (YoY)", impact: "HIGH", actual: "2.8%", consensus: "2.9%" },
    { id: "3", date: new Date("2026-03-20"), event: "RBI Policy", impact: "MEDIUM", actual: "--", consensus: "6.25%" },
    { id: "4", date: new Date("2026-04-05"), event: "US NFP Jobs", impact: "HIGH", actual: "--", consensus: "150k" },
  ];

  const events2025 = [
    { id: "5", date: new Date("2025-03-15"), event: "ECB Rate Decision", impact: "MEDIUM", actual: "3.75%", consensus: "3.75%" },
    { id: "6", date: new Date("2025-06-12"), event: "Fed Dot Plot", impact: "HIGH", actual: "5.6%", consensus: "5.5%" },
    { id: "7", date: new Date("2025-09-20"), event: "India GDP (Q2)", impact: "HIGH", actual: "7.1%", consensus: "6.8%" },
    { id: "8", date: new Date("2025-11-04"), event: "US Election", impact: "HIGH", actual: "--", consensus: "--" },
  ];

return { success: true, events: year === 2026 ? events2026 : events2025 };}

// --- 3. Scenario Management (Already used in your components) ---
export async function getScenarios() {
  try {
    const scenarios = await db.macroScenario.findMany({ orderBy: { createdAt: 'desc' } });
    return { success: true, scenarios };
  } catch (e) {
    return { success: false, error: "Failed to fetch scenarios" };
  }
}

export async function saveScenario(name: string, shocks: any) {
  try {
    await db.macroScenario.create({
      data: { name, shocks }
    });
    revalidatePath("/macro");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function deleteScenario(id: string) {
  try {
    await db.macroScenario.delete({ where: { id } });
    revalidatePath("/macro");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function getHistoricalReturns() {
  try {
    // 1. Try to load Real Data
    const history = getCombinedTimeline(250); // Grab ~1 trading year

    if (history && history.length > 10) {
      const returns = [];
      for (let i = 1; i < history.length; i++) {
        const today = history[i];
        const prev = history[i-1];
        
        // Ensure we have valid numbers
        if (today.rate_10y_pct && prev.rate_10y_pct && today.usdinr && prev.usdinr) {
            returns.push({
                date: today.month,
                d_10y: (today.rate_10y_pct - prev.rate_10y_pct) * 100, 
                d_3m: (today.rate_3m_pct && prev.rate_3m_pct) ? (today.rate_3m_pct - prev.rate_3m_pct) * 100 : 0,
                d_fx_pct: ((today.usdinr / prev.usdinr) - 1) * 100
            });
        }
      }
      return { success: true, data: returns };
    }
  } catch (e) {
    console.warn("Failed to load historical CSVs, falling back to synthetic data.");
  }

  // 2. Fallback: Generate Synthetic History (Gaussian Noise)
  // This ensures the UI works even if you haven't set up the 'data_seed' folder perfectly yet.
  const mockReturns = [];
  for (let i = 0; i < 250; i++) {
    // Random Normal Distribution approx
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    
    // Volatility Assumptions: Rates ±8bps daily, FX ±0.4% daily
    mockReturns.push({
        date: new Date().toISOString(),
        d_10y: z * 8,       
        d_3m: z * 4,
        d_fx_pct: z * 0.4
    });
  }

  return { success: true, data: mockReturns };
}