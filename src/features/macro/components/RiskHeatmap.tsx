"use client";

import { useMacroStore } from "@/features/macro/store";
import { cn } from "@/lib/utils";

export function RiskHeatmap() {
  const { fiPositions, fxPositions, hydrated } = useMacroStore();

  if (!hydrated) return <div className="text-xs text-slate-500">Loading Risk Engine...</div>;

  const rateShocks = [-100, -50, 0, 50, 100];
  const fxShocks = [-5, -2.5, 0, 2.5, 5];

  const getScenarioPnl = (rateShockBps: number, fxShockPct: number) => {
    let total = 0;
    // Bond PnL
    fiPositions.forEach(pos => {
      const val = -1 * (pos.notional || 0) * (pos.duration || 0) * (rateShockBps / 10000);
      if (!isNaN(val)) total += val;
    });
    // FX PnL
    fxPositions.forEach(pos => {
      const val = (pos.notional || 0) * (fxShockPct / 100);
      if (!isNaN(val)) total += val;
    });
    return total;
  };

  const formatK = (num: number) => {
    if (isNaN(num) || num === 0) return "-";
    return (num / 1000).toFixed(0) + "k";
  };

  const getColor = (val: number) => {
    if (val === 0) return "bg-slate-800/50 text-slate-500";
    if (val > 0) {
      if (val > 500000) return "bg-emerald-500 text-white font-bold";
      if (val > 100000) return "bg-emerald-500/80 text-white";
      return "bg-emerald-500/30 text-emerald-100";
    } else {
      if (val < -500000) return "bg-rose-600 text-white font-bold";
      if (val < -100000) return "bg-rose-500/80 text-white";
      return "bg-rose-500/30 text-rose-100";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="text-center mb-4">
          <h4 className="text-sm font-semibold text-slate-200">Risk Matrix</h4>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Rates (Y) vs FX (X)</span>
      </div>

      <div className="relative">
        {/* Y-Axis Label */}
        <div className="absolute -left-10 top-0 bottom-0 flex items-center justify-center">
            <span className="-rotate-90 text-[9px] font-bold tracking-widest text-slate-600 uppercase">Rates (bps)</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
           {/* Header Row */}
           {fxShocks.map((fx, i) => (
             <div key={`h-${i}`} className="text-[9px] text-center text-slate-500 font-mono mb-1">{fx > 0 ? "+" : ""}{fx}%</div>
           ))}

           {/* Grid Cells */}
           {rateShocks.map((rate, rIdx) => (
              fxShocks.map((fx, cIdx) => {
                 const pnl = getScenarioPnl(rate, fx);
                 return (
                    <div 
                        key={`${rIdx}-${cIdx}`} 
                        className={cn(
                            "h-10 w-16 flex items-center justify-center rounded text-[10px] font-mono transition-all border border-black/20 cursor-default",
                            getColor(pnl)
                        )}
                    >
                        {formatK(pnl)}
                    </div>
                 );
              })
           ))}
        </div>
        
        {/* Y-Axis Row Labels */}
        <div className="absolute -left-1 top-5 flex flex-col gap-1.5 h-full text-[8px] text-slate-600 text-right pr-2">
            {rateShocks.map((r, i) => (
                <div key={i} className="h-10 flex items-center justify-end w-6">{r}</div>
            ))}
        </div>
      </div>
    </div>
  );
}