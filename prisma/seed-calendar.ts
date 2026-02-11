import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENTS = [
  // --- USA (FOMC) 2026 Official Schedule ---
  // Past
  { date: '2026-01-28', event: 'FOMC Rate Decision', country: 'USA', impact: 'High', forecast: 'Hold 4.75%' },
  
  // Future
  { date: '2026-03-18', event: 'FOMC Rate Decision (SEP)', country: 'USA', impact: 'High', forecast: 'Possible Cut 25bps' },
  { date: '2026-04-29', event: 'FOMC Rate Decision', country: 'USA', impact: 'High' },
  { date: '2026-06-17', event: 'FOMC Rate Decision (SEP)', country: 'USA', impact: 'High' },
  { date: '2026-07-29', event: 'FOMC Rate Decision', country: 'USA', impact: 'High' },
  { date: '2026-09-16', event: 'FOMC Rate Decision (SEP)', country: 'USA', impact: 'High' },
  { date: '2026-10-28', event: 'FOMC Rate Decision', country: 'USA', impact: 'High' },
  { date: '2026-12-09', event: 'FOMC Rate Decision (SEP)', country: 'USA', impact: 'High' },

  // --- INDIA (RBI MPC) 2026 Projected Schedule ---
  // Based on standard bi-monthly cycle (Feb, Apr, Jun, Aug, Oct, Dec)
  { date: '2026-02-12', event: 'RBI MPC Policy', country: 'IND', impact: 'High', forecast: 'Hold 6.25%' }, // Upcoming
  { date: '2026-04-08', event: 'RBI MPC Policy', country: 'IND', impact: 'High' },
  { date: '2026-06-06', event: 'RBI MPC Policy', country: 'IND', impact: 'High' },
  { date: '2026-08-07', event: 'RBI MPC Policy', country: 'IND', impact: 'High' },
  { date: '2026-10-05', event: 'RBI MPC Policy', country: 'IND', impact: 'High' },
  { date: '2026-12-04', event: 'RBI MPC Policy', country: 'IND', impact: 'High' },
  
  // --- Recurring Data Prints ---
  { date: '2026-02-14', event: 'US CPI (Inflation)', country: 'USA', impact: 'High', forecast: '3.1% YoY' },
  { date: '2026-02-16', event: 'India WPI Inflation', country: 'IND', impact: 'Medium' },
  { date: '2026-02-28', event: 'India GDP (Q3)', country: 'IND', impact: 'High' },
  { date: '2026-03-06', event: 'US Non-Farm Payrolls', country: 'USA', impact: 'High' },
];

async function main() {
  console.log('📅 Seeding 2026 Economic Calendar...');
  
  await prisma.economicEvent.deleteMany({});

  for (const ev of EVENTS) {
    await prisma.economicEvent.create({
      data: {
        date: new Date(ev.date),
        event: ev.event,
        country: ev.country,
        impact: ev.impact,
        forecast: ev.forecast || '',
        previous: '',
      }
    });
  }
  
  console.log(`✅ Added ${EVENTS.length} events for 2026.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });