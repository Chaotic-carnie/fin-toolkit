"use client";

import React, { useMemo } from "react";
import { Building2, Zap, Sparkles, ShieldAlert } from "lucide-react";

import { useJpmcTrackerStore } from "~/features/jpmc/store";
import { computeHoldingsAnalytics, formatPct, formatUsdCompact } from "~/features/jpmc/engine";
import { cn } from "~/lib/utils";

function Metric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">
        {label}
      </span>
      <span className={cn("text-base font-mono font-medium", color ?? "text-slate-200")}>
        {value}
      </span>
      {sub ? (
        <span className="text-[10px] text-slate-600 font-mono mt-0.5">{sub}</span>
      ) : null}
    </div>
  );
}

export function JpmcStatsBanner() {
  const { holdingsReport, loading } = useJpmcTrackerStore();
  const holdings = holdingsReport?.holdings ?? [];

  const analytics = useMemo(() => computeHoldingsAnalytics(holdings), [holdings]);
  const meta = holdingsReport?.meta;

  if (loading.holdings && holdings.length === 0) {
    return (
      <header className="h-20 w-full min-w-[1100px] border-b border-white/10 bg-[#020617]/80 backdrop-blur-xl flex items-center px-6">
        <div className="text-slate-500 text-sm font-mono animate-pulse">
          Initializing SEC feed…
        </div>
      </header>
    );
  }

  if (!holdingsReport || holdings.length === 0) {
    return (
      <header className="h-20 w-full min-w-[1100px] border-b border-white/10 bg-[#020617]/80 backdrop-blur-xl flex items-center px-6">
        <div className="text-slate-600 text-sm font-mono">No 13F snapshot loaded.</div>
      </header>
    );
  }

  return (
    <header className="h-20 w-full shrink-0 min-w-[1100px] border-b border-white/10 bg-[#020617]/80 backdrop-blur-md flex items-center justify-between px-6 shadow-2xl">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-500" /> 13F AUM
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold tracking-tighter text-emerald-400">
            {formatUsdCompact(analytics.totalValueUsd)}
          </span>
          <span className="text-xs text-slate-500 font-mono">USD</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Metric label="Positions" value={String(analytics.holdingsCount)} color="text-cyan-300" />
        <Metric label="Top 1" value={formatPct(analytics.top1WeightPct, 2)} sub={analytics.top1?.issuer ? analytics.top1.issuer.slice(0, 8) : undefined} color="text-yellow-300" />
        <Metric label="Top 10" value={formatPct(analytics.top10ConcentrationPct, 1)} color="text-rose-300" />
        <Metric label="ENB" value={analytics.effectivePositions.toFixed(0)} sub={`HHI ${analytics.hhi.toFixed(4)}`} color="text-fuchsia-300" />
        <Metric label="Mega-cap" value={formatPct(analytics.megaCapTechWeightPct, 1)} color="text-blue-300" />
      </div>

      <div className="flex items-center gap-6 border-l border-white/10 pl-6">
        <div className="flex flex-col items-end">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Source</span>
          <div className="flex items-center gap-2 text-slate-400 font-mono font-bold text-sm">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            {meta?.form ?? "13F"}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">As of</span>
          <div className="flex items-center gap-2 text-slate-400 font-mono font-bold text-sm">
            <Sparkles className="w-4 h-4 text-blue-500" />
            {meta?.reportDate ?? "-"}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Filed</span>
          <div className="flex items-center gap-2 text-slate-400 font-mono font-bold text-sm">
            <Zap className="w-4 h-4 text-emerald-400" />
            {meta?.filingDate ?? "-"}
          </div>
        </div>
      </div>
    </header>
  );
}