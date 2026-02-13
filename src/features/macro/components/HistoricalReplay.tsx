"use client";

import { Button } from "@/components/ui/button";
import { useMacroStore } from "../store";
import { Play, RotateCcw, TrendingUp, TrendingDown, Activity, AlertTriangle, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HISTORICAL_SCENARIOS = [
  {
    id: "gfc-2008",
    label: "Global Fin. Crisis '08",
    description: "Liquidity crunch. Rates slashed, spreads explode.",
    shocks: { shortRateBps: -400, longRateBps: -250, fxShockPct: 20.0, horizonDays: 180 },
    icon: AlertTriangle,
    color: "text-rose-500"
  },
  {
    id: "taper-2013",
    label: "Taper Tantrum '13",
    description: "Fed tapering fears. EM currencies crush.",
    shocks: { shortRateBps: 45, longRateBps: 85, fxShockPct: 15.0, horizonDays: 30 },
    icon: TrendingUp,
    color: "text-orange-400"
  },
  {
    id: "brexit-2016",
    label: "Brexit Vote '16",
    description: "Major FX dislocation and flight to quality.",
    shocks: { shortRateBps: -25, longRateBps: -40, fxShockPct: 5.5, horizonDays: 7 },
    icon: Globe,
    color: "text-blue-400"
  },
  {
    id: "covid-2020",
    label: "Covid Crash '20",
    description: "Global shutdown. Dash for cash.",
    shocks: { shortRateBps: -110, longRateBps: -90, fxShockPct: 6.0, horizonDays: 14 },
    icon: TrendingDown,
    color: "text-emerald-400"
  },
  {
    id: "ukraine-2022",
    label: "Ukraine Invasion '22",
    description: "Commodity shock & supply chain inflation.",
    shocks: { shortRateBps: 50, longRateBps: 40, fxShockPct: 3.5, horizonDays: 30 },
    icon: AlertTriangle,
    color: "text-yellow-400"
  },
  {
    id: "rate-hike-2022",
    label: "Fed Hiking Cycle '22",
    description: "Aggressive tightening. Curve flattening.",
    shocks: { shortRateBps: 350, longRateBps: 200, fxShockPct: 10.0, horizonDays: 365 },
    icon: Activity,
    color: "text-indigo-400"
  }
];

export function HistoricalReplay() {
  const { setShocks } = useMacroStore();

  const applyScenario = (s: typeof HISTORICAL_SCENARIOS[0]) => {
    setShocks({
      shortRateBps: s.shocks.shortRateBps,
      longRateBps: s.shocks.longRateBps,
      fxShockPct: s.shocks.fxShockPct,
      horizonDays: s.shocks.horizonDays
    });
    toast.info(`Applied: ${s.label}`);
  };

  const reset = () => {
    setShocks({ shortRateBps: 0, longRateBps: 0, fxShockPct: 0, horizonDays: 0 });
    toast.success("Scenarios Reset");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-2 overflow-y-auto dark-scrollbar pr-2 pb-4">
        {HISTORICAL_SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => applyScenario(s)}
            className="w-full text-left group flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/30 hover:bg-slate-800 hover:border-slate-700 transition-all"
          >
            <div className={cn("p-2 rounded-md bg-slate-900 border border-slate-800 mt-1", s.color)}>
              <s.icon size={16} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200 group-hover:text-white flex items-center gap-2">
                {s.label}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {s.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* HIGH VISIBILITY RESET BUTTON */}
      <div className="pt-4 mt-2 border-t border-white/5">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={reset}
          className="w-full h-9 text-xs font-semibold border-rose-900/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
        >
          <RotateCcw className="w-3 h-3 mr-2" />
          RESET SCENARIOS
        </Button>
      </div>
    </div>
  );
}