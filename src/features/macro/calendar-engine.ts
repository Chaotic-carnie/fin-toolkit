import { addDays, setMonth, setYear, isWeekend, nextMonday } from "date-fns"; // Standard math

// --- Rules & Heuristics ---

// FOMC usually meets 8 times a year, roughly every 6-7 weeks on Tue/Wed.
// We base this on a known anchor date (Jan 2025) and project forward.
const FOMC_ANCHOR = new Date("2025-01-29"); 

// RBI MPC meets bi-monthly (Feb, Apr, Jun, Aug, Oct, Dec)
const RBI_ANCHOR = new Date("2025-02-08");

export function generateCalendarForYear(year: number) {
  const events = [];

  // 1. Generate FOMC (Approximate Rule: Every ~46 days)
  let currentFomc = new Date(FOMC_ANCHOR);
  // Wind back or forward to the target year
  while (currentFomc.getFullYear() < year) {
    currentFomc = addDays(currentFomc, 45); // Move forward 6.5 weeks
  }
  while (currentFomc.getFullYear() > year) {
    currentFomc = addDays(currentFomc, -45); // Move back
  }
  
  // Now generate for the specific year
  // Reset to start of year to be safe, find first meeting
  let pointer = new Date(currentFomc);
  // Align pointer to Jan of requested year
  if (pointer.getFullYear() !== year) {
     pointer.setFullYear(year);
     pointer.setMonth(0); 
     pointer.setDate(28); // Approximation
  }

  // Generate 8 Meetings
  for (let i = 0; i < 8; i++) {
    // Avoid weekends
    let meetingDate = pointer;
    // FOMC is Tue/Wed. Let's ensure it's a Wed.
    while (meetingDate.getDay() !== 3) {
        meetingDate = addDays(meetingDate, 1);
    }
    
    // Add to list if it matches the year
    if (meetingDate.getFullYear() === year) {
        events.push({
            date: meetingDate,
            event: "FOMC Rate Decision",
            country: "USA",
            impact: "High",
            forecast: "Data Dependent",
            type: "fomc"
        });
    }
    pointer = addDays(pointer, 45); // Next meeting ~6.5 weeks later
  }

  // 2. Generate RBI MPC (Bi-Monthly: Feb, Apr, Jun, Aug, Oct, Dec)
  const rbiMonths = [1, 3, 5, 7, 9, 11]; // 0-indexed (Feb=1)
  
  rbiMonths.forEach(month => {
    let date = new Date(year, month, 6); // Usually first week
    // Avoid Weekend
    if (date.getDay() === 0) date = addDays(date, 1); // Sun -> Mon
    if (date.getDay() === 6) date = addDays(date, 2); // Sat -> Mon
    
    events.push({
        date: date,
        event: "RBI MPC Policy",
        country: "IND",
        impact: "High",
        forecast: "Consensus Pending",
        type: "rbi"
    });
  });

  // 3. Recurring Data Prints (CPI/NFP)
  for (let m = 0; m < 12; m++) {
    // US CPI (Usually 12th-14th)
    events.push({
        date: new Date(year, m, 13),
        event: "US CPI Inflation",
        country: "USA",
        impact: "High",
        forecast: null,
        type: "cpi"
    });
    
    // US NFP (First Friday)
    let nfp = new Date(year, m, 1);
    while (nfp.getDay() !== 5) nfp = addDays(nfp, 1); // Find first Friday
    events.push({
        date: nfp,
        event: "Non-Farm Payrolls",
        country: "USA",
        impact: "High",
        forecast: null,
        type: "nfp"
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}