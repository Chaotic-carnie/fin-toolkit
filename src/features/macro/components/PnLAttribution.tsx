"use client";

import { useMacroStore } from "../store";
import { calculateBondPnL, calculateFxPnL } from "../engine";

export function PnLAttribution() {
  const { fiPositions, fxPositions, shocks, baseData } = useMacroStore();

  // 1. Calculate Fixed Income P&L
  const fiResults = fiPositions.map(pos => {
    // Apply the correct shock based on the bucket (Short vs Long end of curve)
    const shock = pos.bucket === 'short' ? shocks.shortRateBps : shocks.longRateBps;
    const res = calculateBondPnL(pos, shock);
    return { 
      label: pos.label, 
      type: 'Bond', 
      pnl: res.pnl, 
      impact: shock,
      unit: 'bps'
    };
  });

  // 2. Calculate FX P&L
  const fxResults = fxPositions.map(pos => {
    const res = calculateFxPnL(pos, shocks, baseData.usdinr, baseData.inr3m);
    return { 
      label: pos.label, 
      type: 'FX', 
      pnl: res.pnl, 
      impact: shocks.fxShockPct,
      unit: '%'
    };
  });

  // 3. Merge and Sort by Magnitude (Biggest movers first)
  const allItems = [...fiResults, ...fxResults].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  return (
    <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 px-2">
            <h4 className="text-sm font-semibold text-slate-200">P&L Attribution</h4>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Breakdown</span>
        </div>

        <div className="flex-1 overflow-y-auto dark-scrollbar pr-2">
            <div className="space-y-2">
                {allItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md bg-slate-900/40 border border-white/5 text-xs hover:bg-slate-800/60 transition-colors">
                        <div>
                            <div className="font-medium text-slate-300">{item.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded ${item.type === 'FX' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {item.type}
                                </span>
                                <span>
                                   Shock: <span className="text-slate-400">{item.impact > 0 ? '+' : ''}{item.impact}{item.unit}</span>
                                </span>
                            </div>
                        </div>
                        <div className={`font-mono font-bold text-right ${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.pnl >= 0 ? '+' : ''}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.pnl)}
                        </div>
                    </div>
                ))}
                
                {allItems.length === 0 && (
                    <div className="text-center text-slate-500 py-8 flex flex-col items-center">
                        <span>No active positions.</span>
                        <span className="text-[10px] mt-1 opacity-50">Add positions in the Engine to see attribution.</span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}