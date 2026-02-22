import fs from 'fs';
import path from 'path';

// --- Types ---
export interface MacroPoint {
  date: string;
  value: number;
}

export interface MarketSnapshot {
  month: string;
  usdinr: number | null;
  rate_3m_pct: number | null;
  rate_10y_pct: number | null;
  cpi_index: number | null;
  cpi_yoy_pct: number | null;
  curve_slope_bps: number | null;
}

// UPDATE: Pointing to 'data_seed' instead of 'data'
const DATA_DIR = path.join(process.cwd(), 'data_seed', 'macro');

function loadSeries(seriesId: string): MacroPoint[] {
  // Check cache first, then bundled
  let filePath = path.join(DATA_DIR, 'cache', `${seriesId}.csv`);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DATA_DIR, 'bundled', `${seriesId}.csv`);
  }

  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const points: MacroPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [rawDate, rawVal] = line.split(',');
    
    // Filter out invalid FRED data (dots or empty strings)
    if (!rawVal || rawVal === '.') continue;

    const val = parseFloat(rawVal);
    if (!isNaN(val)) {
      points.push({ date: rawDate, value: val });
    }
  }
  // Sort ascending
  return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function toMonthlyLast(points: MacroPoint[]): Record<string, number> {
  const map: Record<string, number> = {};
  points.forEach((p) => {
    const d = new Date(p.date);
    // YYYY-MM format
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = p.value;
  });
  return map;
}

export function getCombinedTimeline(monthsBack = 60): MarketSnapshot[] {
  // Load raw series
  const fxPts = loadSeries('DEXINUS');
  const r3Pts = loadSeries('INDIR3TIB01STM');
  const y10Pts = loadSeries('INDIRLTLT01STM');
  const cpiPts = loadSeries('INDCPIALLMINMEI');

  const fxMap = toMonthlyLast(fxPts);
  const r3Map = toMonthlyLast(r3Pts);
  const y10Map = toMonthlyLast(y10Pts);
  const cpiMap = toMonthlyLast(cpiPts);

  // Determine date range
  const allKeys = [...Object.keys(fxMap), ...Object.keys(r3Map), ...Object.keys(y10Map)].sort();
  if (allKeys.length === 0) return [];
  
  const lastKey = allKeys[allKeys.length - 1];
  const [lastY, lastM] = lastKey.split('-').map(Number);

  const result: MarketSnapshot[] = [];
  
  // Forward-fill variables
  let lastFx = 0;
  let lastR3 = 0;
  let lastY10 = 0;
  let lastCpi = 0;

  // Generate keys backwards from latest
  let currY = lastY;
  let currM = lastM;
  const keys: string[] = [];

  for(let i=0; i<monthsBack; i++) {
    keys.unshift(`${currY}-${String(currM).padStart(2, '0')}`);
    currM--;
    if(currM === 0) { currM = 12; currY--; }
  }

  keys.forEach(key => {
    if (fxMap[key]) lastFx = fxMap[key];
    if (r3Map[key]) lastR3 = r3Map[key];
    if (y10Map[key]) lastY10 = y10Map[key];
    if (cpiMap[key]) lastCpi = cpiMap[key];

    // Calc YoY CPI
    let yoy = null;
    if (lastCpi) {
       const [y, m] = key.split('-').map(Number);
       const prevKey = `${y-1}-${String(m).padStart(2, '0')}`;
       if (cpiMap[prevKey]) yoy = ((lastCpi / cpiMap[prevKey]) - 1) * 100;
    }

    result.push({
      month: `${key}-01`,
      usdinr: lastFx,
      rate_3m_pct: lastR3,
      rate_10y_pct: lastY10,
      cpi_index: lastCpi,
      cpi_yoy_pct: yoy,
      curve_slope_bps: (lastY10 - lastR3) * 100
    });
  });

  return result;
}