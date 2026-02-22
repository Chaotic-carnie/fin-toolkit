"use client";

import { useState } from "react";
import { useMacroStore } from "../store";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RiskHeatmap() {
  const { fiPositions, fxPositions, hydrated, baseData } = useMacroStore();

  // State for Custom Grid Axes
  const [rateStr, setRateStr] = useState("-100,-50,0,50,100");
  const [fxStr, setFxStr] = useState("-5,-2.5,0,2.5,5");

  if (!hydrated) return <div className="text-xs text-slate-500">Loading Risk Engine...</div>;

  // Parse strings to arrays
  const parseGrid = (s: string) => s.split(',').map(v => parseFloat(v.trim())).filter(n => !isNaN(n));
  const rateShocks = parseGrid(rateStr);
  const fxShocks = parseGrid(fxStr);

  const getScenarioPnl = (rateShockBps: number, fxShockPct: number) => {
    let total = 0;
    // Bond PnL (Includes Convexity if available)
    fiPositions.forEach(pos => {
      const dy = rateShockBps / 10000;
      // Duration Term: -Dur * dy
      const durTerm = -1 * pos.notionalInr * pos.modifiedDuration * dy;
      // Convexity Term: 0.5 * Conv * (dy^2)
      const convTerm = 0.5 * pos.notionalInr * pos.convexity * (dy * dy);
      
      total += (durTerm + convTerm);
    });

    // FX PnL
    fxPositions.forEach(pos => {
      const spot = baseData?.usdinr || 83.0; 
      const val = pos.notionalUsd * spot * (fxShockPct / 100);
      if (!isNaN(val)) total += val;
    });
    return total;
  };

  const formatK = (num: number) => {
    if (isNaN(num)) return "-";
    if (Math.abs(num) < 1000 && num !== 0) return (num / 1000).toFixed(1) + "k"; 
    if (num === 0) return "-";
    return (num / 1000).toFixed(0) + "k";
  };

  const getColor = (val: number) => {
    if (Math.abs(val) < 100) return "bg-slate-800/50 text-slate-500";
    if (val > 0) {
      if (val > 5000000) return "bg-emerald-500 text-white font-bold";
      if (val > 1000000) return "bg-emerald-500/80 text-white";
      return "bg-emerald-500/30 text-emerald-100";
    } else {
      if (val < -5000000) return "bg-rose-600 text-white font-bold";
      if (val < -1000000) return "bg-rose-500/80 text-white";
      return "bg-rose-500/30 text-rose-100";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative group">
      {/* HEADER + CONFIG BUTTON */}
      <div className="text-center mb-6 relative w-full flex justify-center items-center">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Risk Matrix</h4>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Rates (Y) vs FX (X)</span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="absolute right-0 h-6 w-6 text-slate-600 hover:text-white">
                <Settings2 size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-slate-900 border-slate-700 text-slate-200 p-4">
               <h4 className="font-semibold text-sm mb-3">Grid Settings</h4>
               <div className="space-y-3">
                 <div>
                   <Label className="text-xs text-slate-400">FX Shocks (%)</Label>
                   <Input className="h-8 bg-slate-950 border-slate-800 mt-1" value={fxStr} onChange={e => setFxStr(e.target.value)} />
                 </div>
                 <div>
                   <Label className="text-xs text-slate-400">Rate Shocks (bps)</Label>
                   <Input className="h-8 bg-slate-950 border-slate-800 mt-1" value={rateStr} onChange={e => setRateStr(e.target.value)} />
                 </div>
                 <div className="text-[10px] text-slate-500 italic">Comma separated values.</div>
               </div>
            </PopoverContent>
          </Popover>
      </div>

      <div className="relative">
        <div className="absolute -left-12 top-0 bottom-0 flex items-center justify-center">
            <span className="-rotate-90 text-[10px] font-bold tracking-widest text-slate-600 uppercase whitespace-nowrap">Rates (bps)</span>
        </div>

        {/* DYNAMIC GRID RENDERING */}
        <div 
          className="grid gap-2" 
          style={{ gridTemplateColumns: `repeat(${fxShocks.length}, minmax(0, 1fr))` }}
        >
           {/* Header Row */}
           {fxShocks.map((fx, i) => (
             <div key={`h-${i}`} className="text-[10px] text-center text-slate-500 font-mono mb-1">
               {fx > 0 ? "+" : ""}{fx}%
             </div>
           ))}

           {/* Cells */}
           {rateShocks.map((rate, rIdx) => (
              fxShocks.map((fx, cIdx) => {
                 const pnl = getScenarioPnl(rate, fx);
                 return (
                    <div 
                        key={`${rIdx}-${cIdx}`} 
                        className={cn(
                            "h-12 w-20 flex items-center justify-center rounded-md text-[11px] font-mono transition-all border border-black/20 cursor-default shadow-sm",
                            getColor(pnl)
                        )}
                        title={`Rates: ${rate}bps, FX: ${fx}%`}
                    >
                        {formatK(pnl)}
                    </div>
                 );
              })
           ))}
        </div>
        
        {/* Y-Axis Labels */}
        <div className="absolute -left-2 top-6 flex flex-col gap-2 h-full text-[10px] text-slate-500 text-right pr-3">
            {rateShocks.map((r, i) => (
                <div key={i} className="h-12 flex items-center justify-end w-8">{r}</div>
            ))}
        </div>
      </div>
    </div>
  );
}