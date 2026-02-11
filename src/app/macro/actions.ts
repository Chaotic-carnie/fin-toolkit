"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { parse } from "csv-parse/sync";
import { generateCalendarForYear } from "@/features/macro/calendar-engine";

// FRED Series IDs
const SERIES = {
  USDINR: "DEXINUS",
  INR10Y: "INDIRLTLT01STM",
  INR3M:  "INDIR3TIB01STM",
  CPI:    "INDCPIALLMINMEI",
};

// ... [Keep fetchFredSeries function UNCHANGED] ...
async function fetchFredSeries(seriesId: string) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinToolkit/1.0;)' }
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`FRED API Error (${res.status}): ${errText.slice(0, 50)}`);
    }
    const text = await res.text();
    if (!text || text.trim().length === 0) throw new Error(`FRED returned empty data for ${seriesId}`);

    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    if (records.length === 0) throw new Error(`No records found in CSV for ${seriesId}`);

    const firstRow = records[0];
    const dateKey = Object.keys(firstRow).find(k => k.toUpperCase().includes('DATE'));
    if (!dateKey) throw new Error(`Could not find a 'DATE' column in ${seriesId} CSV.`);

    for (let i = records.length - 1; i >= 0; i--) {
      const val = records[i][seriesId];
      const dateStr = records[i][dateKey];
      if (val && val !== ".") {
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) continue;
        return { date: parsedDate, value: parseFloat(val) };
      }
    }
    throw new Error(`No valid numeric data found for ${seriesId}`);
  } catch (error) {
    console.error(`Error fetching ${seriesId}:`, error);
    throw new Error(`Failed to fetch ${seriesId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 1. REFRESH MARKET DATA
export async function refreshMarketData() {
  try {
    const [usd, y10, r3m, cpi] = await Promise.all([
      fetchFredSeries(SERIES.USDINR),
      fetchFredSeries(SERIES.INR10Y),
      fetchFredSeries(SERIES.INR3M),
      fetchFredSeries(SERIES.CPI),
    ]);

    if (!usd || !y10 || !r3m || !cpi) {
      throw new Error("One or more series returned null data.");
    }

    await db.marketSnapshot.upsert({
      where: { date: usd.date },
      update: {
        usdinr: usd.value,
        inr10y: y10.value,
        inr3m: r3m.value,
        cpiIndex: cpi.value,
        updatedAt: new Date(),
      },
      create: {
        date: usd.date,
        usdinr: usd.value,
        inr10y: y10.value,
        inr3m: r3m.value,
        cpiIndex: cpi.value,
        cpiYoy: 0,
        marketRegime: "Neutral",
      },
    });

    revalidatePath("/macro");
    return { success: true, date: usd.date.toISOString().split("T")[0] };

  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// 2. FETCH CALENDAR (FIXED: Ensures IDs are returned)
export async function fetchCalendarEvents(year: number) {
    try {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);
        
        // 1. Check DB first
        const existing = await db.economicEvent.findMany({
            where: { date: { gte: startOfYear, lte: endOfYear } },
            orderBy: { date: 'asc' }
        });

        if (existing.length > 0) {
            return { success: true, events: existing };
        }

        // 2. If DB empty, GENERATE using engine
        console.log(`Generating events for ${year}...`);
        const generatedEvents = generateCalendarForYear(year);

        // 3. Save to DB
        await db.economicEvent.createMany({
            data: generatedEvents.map(e => ({
                date: e.date,
                event: e.event,
                country: e.country,
                impact: e.impact,
                forecast: e.forecast || ""
            }))
        });

        // 4. [CRITICAL FIX] Re-fetch from DB to get the IDs!
        // The previous version returned 'generatedEvents' which had no IDs, causing the "key" error.
        const newEvents = await db.economicEvent.findMany({
            where: { date: { gte: startOfYear, lte: endOfYear } },
            orderBy: { date: 'asc' }
        });

        return { success: true, events: newEvents };

    } catch (e) {
        console.error("Calendar Error:", e);
        return { success: false, error: "Failed to load calendar" };
    }
}

export async function saveScenario(name: string, shocksState: any) {
  try {
    // We store the entire 'shocks' object as a JSON blob
    const scenario = await db.macroScenario.create({
      data: {
        name,
        shocks: shocksState, // Prisma handles the JSON conversion automatically
        description: `Custom Scenario: ${new Date().toLocaleDateString()}`
        // userId: session.user.id (If you have auth, add this later)
      }
    });
    
    revalidatePath("/macro");
    return { success: true, scenario };
  } catch (e) {
    console.error("Save Error:", e);
    return { success: false, error: "Failed to save scenario" };
  }
}

// 4. GET SCENARIOS
export async function getScenarios() {
  try {
    const scenarios = await db.macroScenario.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20 // Limit to recent 20
    });
    return { success: true, scenarios };
  } catch (e) {
    console.error("Load Error:", e);
    return { success: false, error: "Failed to load scenarios" };
  }
}

// 5. DELETE SCENARIO
export async function deleteScenario(id: string) {
  try {
    await db.macroScenario.delete({ where: { id } });
    revalidatePath("/macro");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete" };
  }
}