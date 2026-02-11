import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

// Helper to parse dates like "2023-01-01"
const parseDate = (str: string) => new Date(str);

interface CsvRow {
  DATE: string;
  [key: string]: string;
}

async function main() {
  console.log('🌱 Starting Macro Seeding...');

  // 1. Read CSVs
  const readCsv = (filename: string) => {
    const filePath = path.join(process.cwd(), 'data_seed', filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRow[];
  };

  const usdData = readCsv('DEXINUS.csv');
  const bond10yData = readCsv('INDIRLTLT01STM.csv');
  const bond3mData = readCsv('INDIR3TIB01STM.csv');
  const cpiData = readCsv('INDCPIALLMINMEI.csv');

  // 2. Create a Map for faster lookup by Date String
  const createMap = (data: CsvRow[], valueKey: string) => {
    const map = new Map<string, number>();
    data.forEach(row => {
      const val = parseFloat(row[valueKey]);
      if (!isNaN(val)) map.set(row.DATE, val);
    });
    return map;
  };

  const usdMap = createMap(usdData, 'DEXINUS');
  const bond10yMap = createMap(bond10yData, 'INDIRLTLT01STM');
  const bond3mMap = createMap(bond3mData, 'INDIR3TIB01STM');
  const cpiMap = createMap(cpiData, 'INDCPIALLMINMEI');

  // 3. Merge and Forward Fill
  // We iterate through the USD dates (since it's daily) and fill in the monthly data
  const snapshots = [];
  
  // Sort dates to ensure forward fill works
  const allDates = Array.from(usdMap.keys()).sort();

  let last10y = 0;
  let last3m = 0;
  let lastCpi = 0;

  for (const dateStr of allDates) {
    const usdinr = usdMap.get(dateStr);
    
    // Update "Last Known" values if they exist for this date
    if (bond10yMap.has(dateStr)) last10y = bond10yMap.get(dateStr)!;
    if (bond3mMap.has(dateStr)) last3m = bond3mMap.get(dateStr)!;
    if (cpiMap.has(dateStr)) lastCpi = cpiMap.get(dateStr)!;

    // Skip if we don't have enough data yet
    if (!usdinr || !last10y || !last3m || !lastCpi) continue;

    snapshots.push({
      date: new Date(dateStr),
      usdinr,
      inr10y: last10y,
      inr3m: last3m,
      cpiIndex: lastCpi,
      cpiYoy: 0, // We can calc this later if needed
      marketRegime: 'Neutral', // Placeholder for AI
    });
  }

  console.log(`🚀 Prepared ${snapshots.length} snapshots. Inserting...`);

  // Batch insert
  await prisma.marketSnapshot.createMany({
    data: snapshots,
    skipDuplicates: true,
  });

  console.log('✅ Seeding Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });