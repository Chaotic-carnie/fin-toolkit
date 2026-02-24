"use client";

import React from "react";
import type { GreekSnapshot, GreekSpec } from "../types";
import { cn } from "~/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

// Explicitly show + signs on positive numbers for a "Terminal" feel
const fmtSigned = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

// Dynamic colorizer for individual mathematical values
const colorize = (val: number, neutral = "text-slate-500") => {
  if (Math.abs(val) < 1e-5) return neutral;
  return val > 0 ? "text-emerald-400" : "text-rose-400";
};

// Returns a styled badge for the risk zone
function RegionBadge({ index }: { index: number }) {
  if (index === 0) return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">Down</span>;
  if (index === 1) return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">ATM</span>;
  return <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Up</span>;
}

export function GreeksPanel(props: {
  snapshots: GreekSnapshot[];
  greekSpec?: GreekSpec;
}) {
  const { snapshots } = props;

  if (!snapshots || snapshots.length === 0) {
    return <div className="text-xs text-slate-600 text-center mt-10 font-mono uppercase tracking-widest">No Risk Snapshots</div>;
  }

  return (
    <div className="w-full overflow-x-auto dark-scrollbar flex flex-col h-full justify-between">
      <div className="min-w-[500px]">
        
        {/* TABLE HEADERS */}
        <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-slate-900/40 border-y border-slate-800 text-[9px] uppercase tracking-widest font-bold text-slate-500">
          <div>Zone</div>
          <div className="text-right">Spot</div>
          <div className="text-right">Delta</div>
          <div className="text-right">Gamma</div>
          <div className="text-right">Vega</div>
          <div className="text-right">Theta</div>
        </div>

        {/* TABLE ROWS */}
        <div className="divide-y divide-slate-800/50">
          {snapshots.map((s, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 px-3 py-2.5 items-center hover:bg-white/[0.02] transition-colors">
              
              {/* ZONE */}
              <div>
                <RegionBadge index={i} />
              </div>
              
              {/* SPOT */}
              <div className="text-right font-mono text-slate-300 text-xs font-semibold">
                {fmt(s.spot)}
              </div>
              
              {/* DELTA */}
              <div className={cn("text-right font-mono text-xs", colorize(s.greeks.delta))}>
                {fmtSigned(s.greeks.delta)}
              </div>
              
              {/* GAMMA */}
              <div className={cn("text-right font-mono text-xs", colorize(s.greeks.gamma))}>
                {fmtSigned(s.greeks.gamma)}
              </div>
              
              {/* VEGA (Custom amber neutral) */}
              <div className={cn("text-right font-mono text-xs", colorize(s.greeks.vega, "text-amber-500/80"))}>
                {fmtSigned(s.greeks.vega)}
              </div>
              
              {/* THETA (Cyan/Rose for visual variety) */}
              <div className={cn("text-right font-mono text-xs", s.greeks.theta > 0 ? "text-cyan-400" : "text-rose-400")}>
                {fmtSigned(s.greeks.theta)}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* FOOTER INFO */}
      {props.greekSpec && (
        <div className="mt-4 flex items-center gap-2 px-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold border-t border-slate-800/50 pt-3">
          <div className="w-2 h-2 rounded-full bg-slate-700" />
          Zones calculated at ±{props.greekSpec.zoneWidthPct.toFixed(0)}% from current spot
        </div>
      )}
    </div>
  );
}