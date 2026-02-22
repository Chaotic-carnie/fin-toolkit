import { NextResponse } from 'next/server';
import { computePortfolioMetrics } from '@/features/portfolio/engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { market, view, legs, net_premium } = body;

    if (!market || !view || !legs || net_premium === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Default scenarios to run
    const scenarios = [
      { label: "Spot -10%", ds: -10, dv: 0, dr: 0 },
      { label: "Spot -5%", ds: -5, dv: 0, dr: 0 },
      { label: "Spot +5%", ds: 5, dv: 0, dr: 0 },
      { label: "Spot +10%", ds: 10, dv: 0, dr: 0 },
      { label: "Vol -5%", ds: 0, dv: -0.05, dr: 0 },
      { label: "Vol +5%", ds: 0, dv: 0.05, dr: 0 },
      { label: "Rate -25bp", ds: 0, dv: 0, dr: -25 },
      { label: "Rate +25bp", ds: 0, dv: 0, dr: 25 },
    ];

    const horizonYears = Math.max(1 / 365, (view.horizonDays || 0) / 365);

    const results = scenarios.map((s) => {
      // Create bumped legs for this specific scenario
      const shockedLegs = legs.map((l: any) => ({
        ...l,
        params: {
          ...l.params,
          spot: market.spot * (1 + s.ds / 100),
          vol: Math.max(0.0001, market.vol + s.dv),
          risk_free_rate: market.rate + (s.dr / 10000),
          time_to_expiry: Math.max(0.0001, l.params.time_to_expiry - horizonYears)
        }
      }));

      // Calculate total value using the portfolio engine
      const { metrics } = computePortfolioMetrics(shockedLegs, 0, 0, 0);
      const totalValue = metrics?.totalValue || 0;
      const pnl = totalValue - net_premium;

      return {
        label: s.label,
        ds: s.ds,
        dv: s.dv,
        dr: s.dr,
        totalValue,
        pnl
      };
    });

    return NextResponse.json({ scenarios: results });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to compute scenarios', details: error.message },
      { status: 500 }
    );
  }
}