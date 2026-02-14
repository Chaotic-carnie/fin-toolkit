"use client";

import { Button } from "@/components/ui/button";
import { useMacroStore } from "../store";
import { RotateCcw, TrendingUp, TrendingDown, Activity, AlertTriangle, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HISTORICAL_SCENARIOS = [
  {
    id: "gfc-2008", label: "Global Fin. Crisis '08", description: "Rates slashed. Spreads & Vol explode.",
    shocks: { rate3mBps: -400, rate2yBps: -350, rate5yBps: -300, rate10yBps: -250, fxShockPct: 20, equityShockPct: -45, creditSpreadBps: 350, volShockPts: 45, horizonDays: 180 },
    icon: AlertTriangle, color: "text-rose-500"
  },
  {
    id: "taper-2013", label: "Taper Tantrum '13", description: "Fed tapering fears. Bear steepener.",
    shocks: { rate3mBps: 15, rate2yBps: 45, rate5yBps: 70, rate10yBps: 85, fxShockPct: 15, equityShockPct: -10, creditSpreadBps: 80, volShockPts: 12, horizonDays: 30 },
    icon: TrendingUp, color: "text-orange-400"
  },
  {
    id: "brexit-2016", label: "Brexit Vote '16", description: "Major FX dislocation and flight to quality.",
    shocks: { rate3mBps: -25, rate2yBps: -35, rate5yBps: -40, rate10yBps: -40, fxShockPct: 5.5, equityShockPct: -8, creditSpreadBps: 45, volShockPts: 22, horizonDays: 7 },
    icon: Globe, color: "text-blue-400"
  },
  {
    id: "covid-2020", label: "Covid Crash '20", description: "Dash for cash. Fast, violent equity crash.",
    shocks: { rate3mBps: -150, rate2yBps: -130, rate5yBps: -100, rate10yBps: -90, fxShockPct: 6, equityShockPct: -32, creditSpreadBps: 200, volShockPts: 60, horizonDays: 30 },
    icon: TrendingDown, color: "text-emerald-400"
  },
  {
    id: "ukraine-2022", label: "Ukraine Invasion '22", description: "Commodity shock & supply chain inflation.",
    shocks: { rate3mBps: 50, rate2yBps: 60, rate5yBps: 45, rate10yBps: 40, fxShockPct: 3.5, equityShockPct: -15, creditSpreadBps: 120, volShockPts: 28, horizonDays: 30 },
    icon: AlertTriangle, color: "text-yellow-400"
  },
  {
    id: "rate-hike-2022", label: "Fed Hiking Cycle '22", description: "Aggressive tightening. Curve flattening.",
    shocks: { rate3mBps: 350, rate2yBps: 320, rate5yBps: 250, rate10yBps: 200, fxShockPct: 10, equityShockPct: -20, creditSpreadBps: 150, volShockPts: 15, horizonDays: 365 },
    icon: Activity, color: "text-indigo-400"
  }
];

export function HistoricalReplay() {
  const { setShocks } = useMacroStore();

  const applyScenario = (s: typeof HISTORICAL_SCENARIOS[0]) => {
    setShocks(s.shocks);
    toast.info(`Applied: ${s.label}`);
  };

  const reset = () => {
    setShocks({ rate3mBps: 0, rate2yBps: 0, rate5yBps: 0, rate10yBps: 0, fxShockPct: 0, equityShockPct: 0, creditSpreadBps: 0, volShockPts: 0, horizonDays: 0 });
    toast.success("Scenarios Reset");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-2 overflow-y-auto dark-scrollbar pr-2 pb-4">
        {HISTORICAL_SCENARIOS.map((s) => (
          <button key={s.id} onClick={() => applyScenario(s)} className="w-full text-left group flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/30 hover:bg-slate-800 hover:border-slate-700 transition-all">
            <div className={cn("p-2 rounded-md bg-slate-900 border border-slate-800 mt-1", s.color)}><s.icon size={16} /></div>
            <div>
              <div className="text-sm font-medium text-slate-200">{s.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.description}</div>
            </div>
          </button>
        ))}
      </div>
      
      <div className="pt-4 mt-2 border-t border-white/5">
        <Button variant="outline" size="sm" onClick={reset} className="w-full h-9 text-xs font-semibold border-rose-900/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
          <RotateCcw className="w-3 h-3 mr-2" /> RESET SCENARIOS
        </Button>
      </div>
    </div>
  );
}