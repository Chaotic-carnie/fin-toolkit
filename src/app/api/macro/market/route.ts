import { NextResponse } from 'next/server';
import { getCombinedTimeline } from '@/server/services/macro-data';

export async function GET() {
  const timeline = getCombinedTimeline(60);
  const latest = timeline[timeline.length - 1];

  return NextResponse.json({
    latest: {
      usdinr: latest?.usdinr ?? 83.0,
      rate3m: latest?.rate_3m_pct ?? 6.5,
      rate10y: latest?.rate_10y_pct ?? 7.2,
      cpiYoy: latest?.cpi_yoy_pct ?? 5.0
    },
    timeline
  });
}