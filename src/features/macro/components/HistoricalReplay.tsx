"use client";

import { useMacroStore } from "../store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EVENTS = [
  {
    id: "covid",
    name: "Covid Crash (Mar 2020)",
    desc: "Global liquidity crunch. Flight to USD safety.",
    shocks: { shortRateBps: -115, longRateBps: -80, fxShockPct: 6.5 },
    type: "crash"
  },
  {
    id: "gfc",
    name: "2008 Financial Crisis",
    desc: "Lehman collapse. Massive risk-off event.",
    shocks: { shortRateBps: -250, longRateBps: -150, fxShockPct: 20.0 },
    type: "crash"
  },
  {
    id: "taper",
    name: "Taper Tantrum (2013)",
    desc: "Fed taper fears triggered massive EM outflow.",
    shocks: { shortRateBps: 250, longRateBps: 180, fxShockPct: 15.0 },
    type: "volatility"
  },
  {
    id: "bop91",
    name: "1991 BoP Crisis (India)",
    desc: "Severe Balance of Payments crisis & devaluation.",
    shocks: { shortRateBps: 300, longRateBps: 200, fxShockPct: 35.0 },
    type: "crash"
  },
  {
    id: "russia",
    name: "Ukraine War (2022)",
    desc: "Oil shock and supply chain disruption.",
    shocks: { shortRateBps: 0, longRateBps: 45, fxShockPct: 2.2 },
    type: "geopolitics"
  },
  {
    id: "hike",
    name: "Fed Aggression (2022)",
    desc: "Relentless rate hikes by the Fed.",
    shocks: { shortRateBps: 225, longRateBps: 150, fxShockPct: 8.5 },
    type: "tightening"
  },
  {
    id: "demonet",
    name: "Demonetization (2016)",
    desc: "Cash crunch leading to temporary demand shock.",
    shocks: { shortRateBps: -50, longRateBps: -75, fxShockPct: 1.5 },
    type: "local"
  }
];

export function HistoricalReplay() {
  const { setShocks } = useMacroStore();

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'crash': return "border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 hover:border-rose-500/50";
      case 'volatility': return "border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-500/50";
      case 'tightening': return "border-blue-900/50 bg-blue-950/20 hover:bg-blue-950/40 hover:border-blue-500/50";
      case 'geopolitics': return "border-slate-700 bg-slate-800/20 hover:bg-slate-800/50 hover:border-slate-500";
      default: return "border-white/5 bg-slate-950/40 hover:bg-slate-800";
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
        case 'crash': return "bg-rose-500/10 text-rose-400 border-rose-500/20";
        case 'volatility': return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        case 'tightening': return "bg-blue-500/10 text-blue-400 border-blue-500/20";
        default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="h-full flex flex-col">
        <div className="mb-6 px-2">
            <h4 className="text-sm font-semibold text-slate-200">Historical Stress Library</h4>
            <p className="text-xs text-slate-400 mt-1">
                Click an event to apply its specific Rate and FX shocks to your portfolio.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-2 pb-4">
            {EVENTS.map(ev => (
                <button
                    key={ev.id}
                    onClick={() => setShocks({ ...ev.shocks, horizonDays: 30 })}
                    className={cn(
                        "group relative flex flex-col items-start p-4 rounded-lg border transition-all text-left",
                        getCardStyle(ev.type)
                    )}
                >
                    <div className="flex justify-between w-full mb-1">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                            {ev.name}
                        </span>
                        <Badge variant="outline" className={cn("text-[9px] h-5 uppercase tracking-wider", getBadgeStyle(ev.type))}>
                            {ev.type}
                        </Badge>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 mb-3 line-clamp-1 group-hover:text-slate-300">
                        {ev.desc}
                    </p>

                    <div className="flex gap-2 mt-auto">
                        <Badge variant="outline" className="bg-slate-950/50 border-white/5 text-slate-400 text-[10px] h-5 group-hover:border-white/10">
                            Yields {ev.shocks.longRateBps > 0 ? '+' : ''}{ev.shocks.longRateBps}bps
                        </Badge>
                        <Badge variant="outline" className="bg-slate-950/50 border-white/5 text-slate-400 text-[10px] h-5 group-hover:border-white/10">
                            USD {ev.shocks.fxShockPct > 0 ? '+' : ''}{ev.shocks.fxShockPct}%
                        </Badge>
                    </div>
                </button>
            ))}
        </div>
    </div>
  );
}