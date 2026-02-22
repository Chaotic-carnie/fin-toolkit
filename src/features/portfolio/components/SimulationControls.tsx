"use client";

import React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Clock, Activity } from "lucide-react";
import { usePortfolioStore } from "../store";

export function SimulationControls() {
  const sim = usePortfolioStore((state) => state.simulation || { daysPassed: 0, volShock: 0, priceShock: 0 });
  const setSim = usePortfolioStore((state) => state.setSimulation);

  const reset = () => setSim({ daysPassed: 0, volShock: 0, priceShock: 0 });

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-slate-900/40 rounded-xl border border-white/5 mb-4 shadow-sm">
      
      {/* Time Slider */}
      <div className="flex-1 space-y-3">
        <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold tracking-wider">
          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-cyan-400" /> Time Jump</span>
          <span className="text-cyan-400 font-mono">T + {sim.daysPassed} Days</span>
        </div>
        <Slider 
          value={[sim.daysPassed]} 
          min={0} max={60} step={1} 
          onValueChange={(v) => setSim({ daysPassed: v[0] })}
          className="cursor-pointer"
        />
      </div>

      {/* Vol Slider */}
      <div className="flex-1 space-y-3">
        <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold tracking-wider">
          <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-yellow-400" /> Vol Shock</span>
          <span className={sim.volShock === 0 ? "text-slate-400" : sim.volShock > 0 ? "text-emerald-400" : "text-rose-400"}>
             {sim.volShock > 0 ? "+" : ""}{(sim.volShock * 100).toFixed(0)}%
          </span>
        </div>
        <Slider 
          value={[sim.volShock]} 
          min={-0.5} max={0.5} step={0.01} 
          onValueChange={(v) => setSim({ volShock: v[0] })}
           className="cursor-pointer"
        />
      </div>

      {/* Reset */}
      <div className="h-full flex items-end pb-1">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={reset} 
            disabled={sim.daysPassed === 0 && sim.volShock === 0}
            className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
            <RefreshCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}