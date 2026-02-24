"use client";

import React, { useMemo, useState } from "react";
import { Zap, Play, Settings2, BarChart3, SlidersHorizontal, ShieldAlert, Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";

import type {
  CompileConfig,
  CompileResult,
  ComposerLeg,
  GreekSpec,
  HardConstraints,
  MarketState,
  PayoffCurvePoint,
  PayoffSpec,
  PriorityLadder,
} from "../types";

import { MarketInputs } from "./MarketInputs";
import { PayoffSpecPanel } from "./PayoffSpecPanel";
import { GreekSpecPanel } from "./GreekSpecPanel";
import { ConstraintsPanel } from "./ConstraintsPanel";

import { compilePortfolio } from "../compiler/compile";

import { ComposerPayoffChart } from "./ComposerPayoffChart";
import { CurvatureChart } from "./CurvatureChart";
import { ScenarioHeatmap } from "./ScenarioHeatmap";
import { LegTable } from "./LegTable";
import { GreeksPanel } from "./GreeksPanel";
import { TemplateBuilderPanel } from "./TemplateBuilderPanel";

import { intrinsicPayoff, priceLeg } from "../pricing/router";

// --- Defaults ---
const DEFAULT_MARKET: MarketState = { asset: "SPX", spot: 100, vol: 0.2, rate: 0.05, dividend: 0.0 };
const DEFAULT_CFG: CompileConfig = { maturity: 0.25, strikeCount: 21, strikeRangePct: 0.6, strikeRound: undefined, allowMultiExpiry: true, longMaturity: 0.5, maxIterations: 15, payoffDriftTolerancePct: 10, mcPaths: 3000, mcSteps: 80, mcSeed: 12345 };
const DEFAULT_PAYOFF: PayoffSpec = { scale: 1, points: [ { spot: 70, payoff: 0 }, { spot: 90, payoff: 10 }, { spot: 100, payoff: 40 }, { spot: 110, payoff: 10 }, { spot: 130, payoff: 0 } ] };
const DEFAULT_GREEKS: GreekSpec = { zoneWidthPct: 10, bands: [] };
const DEFAULT_CONSTRAINTS: HardConstraints = { maxDebit: undefined, maxCreditAbs: undefined, maxLegs: 14, allowShort: true, requireDefinedRisk: false };
const DEFAULT_PRIORITY: PriorityLadder = { order: ["payoff", "greeks", "safety", "simplicity"] };

// --- Helpers (Updated with active!==false failsafe) ---
function computePVOnlyCurve(opts: { legs: ComposerLeg[]; market: MarketState; spotRangePct: number; points: number; }) {
  const { legs, market, spotRangePct, points } = opts;
  const active = legs.filter((l) => l.active !== false); // Failsafe
  const expiries = Array.from(new Set(active.map((l) => Number(l.params?.time_to_expiry ?? l.params?.T ?? NaN)).filter(Number.isFinite)));
  const hasSingleExpiry = expiries.length <= 1;
  const expiry = expiries[0];
  const spot = market.spot;
  const lo = Math.max(1e-9, spot * (1 - spotRangePct));
  const hi = spot * (1 + spotRangePct);
  const basePV = active.reduce((acc, l) => acc + priceLeg(l, market).price * l.quantity, 0);

  const data: PayoffCurvePoint[] = [];
  for (let i = 0; i < points; i++) {
    const S = lo + (i / (points - 1)) * (hi - lo);
    const pvNow = active.reduce((acc, l) => acc + priceLeg(l, { ...market, spot: S }).price * l.quantity, 0);
    const currentPnl = pvNow - basePV;
    let expiryPnl = 0;
    if (hasSingleExpiry && Number.isFinite(expiry)) {
      const expiryPayoff = active.reduce((acc, l) => acc + intrinsicPayoff(l, S), 0);
      expiryPnl = expiryPayoff - basePV;
    }
    data.push({ spot: S, currentPnl, expiryPnl });
  }
  return { data, hasSingleExpiry };
}

function computePVHeatmapPerLeg(opts: { legs: ComposerLeg[]; market: MarketState; spotShocks?: number[]; volShocks?: number[]; }) {
  const { legs, market } = opts;
  const xAxis = opts.spotShocks ?? [-0.3, -0.15, 0, 0.15, 0.3];
  const yAxis = opts.volShocks ?? [-0.15, -0.05, 0, 0.05, 0.15];
  const active = legs.filter((l) => l.active !== false); // Failsafe
  const basePV = active.reduce((acc, l) => acc + priceLeg(l, market).price * l.quantity, 0);

  const grid = yAxis.map((volShock) =>
    xAxis.map((spotShock) => {
      const shocked: MarketState = { ...market, spot: market.spot * (1 + spotShock), vol: Math.max(1e-9, market.vol + volShock) };
      const pv = active.reduce((acc, l) => acc + priceLeg(l, shocked).price * l.quantity, 0);
      return { spotShock, volShock, pnl: pv - basePV };
    })
  );
  return { xAxis, yAxis, grid };
}

function computeGreekSnapshotsPerLeg(opts: { legs: ComposerLeg[]; market: MarketState; zoneWidthPct: number; }) {
  const { legs, market, zoneWidthPct } = opts;
  const active = legs.filter((l) => l.active !== false); // Failsafe
  const regionSpots = [market.spot * (1 - zoneWidthPct / 100), market.spot, market.spot * (1 + zoneWidthPct / 100)].map((s) => Math.max(1e-9, s));

  return regionSpots.map((spot) => {
    const g = active.reduce((acc, l) => {
        const res = priceLeg(l, { ...market, spot });
        acc.delta += res.greeks.delta * l.quantity;
        acc.gamma += res.greeks.gamma * l.quantity;
        acc.vega += res.greeks.vega * l.quantity;
        acc.theta += res.greeks.theta * l.quantity;
        acc.rho += res.greeks.rho * l.quantity;
        acc.vanna += res.greeks.vanna * l.quantity;
        acc.volga += res.greeks.volga * l.quantity;
        return acc;
      },
      { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0, vanna: 0, volga: 0 }
    );
    return { spot, greeks: g };
  });
}

// --- Main Component ---

export function PortfolioComposer() {
  const [activeTab, setActiveTab] = useState<"compiler" | "builder">("compiler");
  
  const [market, setMarket] = useState<MarketState>(DEFAULT_MARKET);
  const [cfg, setCfg] = useState<CompileConfig>(DEFAULT_CFG);
  const [payoff, setPayoff] = useState<PayoffSpec>(DEFAULT_PAYOFF);
  const [greeks, setGreeks] = useState<GreekSpec>(DEFAULT_GREEKS);
  const [constraints, setConstraints] = useState<HardConstraints>(DEFAULT_CONSTRAINTS);
  const [priority, setPriority] = useState<PriorityLadder>(DEFAULT_PRIORITY);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [builderLegs, setBuilderLegs] = useState<ComposerLeg[]>([]);

  const compile = () => {
    const res = compilePortfolio({ market, payoffSpec: payoff, greekSpec: greeks, constraints, priority, cfg });
    setResult(res);
  };

  // FIX: Intercept the dummy 0.00 data from the backend and generate the real mathematical heatmap locally
  const compilerHeat = useMemo(() => {
    if (!result?.legs || result.legs.length === 0) return null;
    return computePVHeatmapPerLeg({ legs: result.legs, market });
  }, [result?.legs, market]);

  const builderCurve = useMemo(() => computePVOnlyCurve({ legs: builderLegs, market, spotRangePct: cfg.strikeRangePct, points: 81 }), [builderLegs, market, cfg.strikeRangePct]);
  const builderHeat = useMemo(() => computePVHeatmapPerLeg({ legs: builderLegs, market }), [builderLegs, market]);
  const builderGreekSnaps = useMemo(() => computeGreekSnapshotsPerLeg({ legs: builderLegs, market, zoneWidthPct: greeks.zoneWidthPct ?? 10 }), [builderLegs, market, greeks.zoneWidthPct]);


  return (
<div className="composer-fix flex flex-col lg:flex-row h-full w-full bg-[#020617] text-slate-200 min-h-0 overflow-y-auto lg:overflow-hidden dark-scrollbar">
      {/* ========================================= */}
      {/* SHADCN THEME & PORTAL INTERCEPTOR         */}
      {/* ========================================= */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* 1. Force dark mode variables onto the container and any Radix portals */
        .composer-fix, [data-radix-popper-content-wrapper] {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
          --card: 222.2 84% 4.9%;
          --card-foreground: 210 40% 98%;
          --popover: 222.2 84% 4.9%;
          --popover-foreground: 210 40% 98%;
          --border: 217.2 32.6% 17.5%;
          --input: 217.2 32.6% 17.5%;
        }

        /* 2. Fix Labels and standard text missing in Light Mode default */
        .composer-fix label, .composer-fix span {
          color: #cbd5e1 !important; /* Slate 300 */
        }

        /* 3. The "Transparent / White Border" override for all Shadcn buttons */
        /* Excludes our specific styling classes so the Compute & Tab buttons stay intact */
        .composer-fix button:not(.compute-btn):not(.tab-btn) {
          background-color: transparent !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #f8fafc !important;
        }

        .composer-fix button:not(.compute-btn):not(.tab-btn):hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
        }

        /* 4. Fix Input Fields */
        .composer-fix input, .composer-fix select {
          background-color: rgba(0, 0, 0, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }
        
        .composer-fix input:focus {
          border-color: rgba(59, 130, 246, 0.6) !important;
          outline: none !important;
        }

        /* 5. Intercept Select/Dropdown Portals explicitly so they aren't white */
        [data-radix-popper-content-wrapper] > div {
          background-color: #020617 !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #f8fafc !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
        }

        [data-radix-popper-content-wrapper] [role="option"] {
          color: #cbd5e1 !important;
        }
        
        [data-radix-popper-content-wrapper] [data-highlighted] {
          background-color: rgba(59, 130, 246, 0.2) !important;
          color: #60a5fa !important;
        }
      `}} />

      {/* ========================================= */}
      {/* LEFT PANEL: CONTROLS (Inputs Only)        */}
      {/* ========================================= */}
      <aside className="w-full lg:w-[420px] xl:w-[480px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-auto lg:h-full bg-[#020617] z-10">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg">
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">
              Portfolio <strong className="!text-blue-500 font-black">Composer</strong>
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Structure Engineering</p>
          </div>
        </div>

        {/* CUSTOM TAB SWITCHER */}
        <div className="p-4 border-b border-slate-800 shrink-0">
          <div className="flex bg-[#0a0f1a] border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("compiler")}
              className={`tab-btn flex-1 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === "compiler" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "text-slate-500 hover:text-slate-300 border border-transparent bg-transparent"
              }`}
            >
              Auto-Compiler
            </button>
            <button
              onClick={() => setActiveTab("builder")}
              className={`tab-btn flex-1 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === "builder" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "text-slate-500 hover:text-slate-300 border border-transparent bg-transparent"
              }`}
            >
              Exotic Builder
            </button>
          </div>
        </div>

        {/* STICKY COMPUTE BUTTON (Only visible in Compiler Tab) */}
        {activeTab === "compiler" && (
          <div className="p-4 border-b border-slate-800 bg-[#020617] sticky top-0 z-20 shrink-0">
            <Button 
              onClick={compile} 
              className="compute-btn w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-6 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] border-none"
            >
              <Play className="w-4 h-4 mr-2 fill-current" /> Compute Structure
            </Button>
          </div>
        )}

        {/* SCROLLABLE INPUTS AREA */}
        <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 space-y-5">
          
          {activeTab === "compiler" ? (
            <>
              {/* COMPILER INPUTS */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-slate-400">
                  <Settings2 className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Market & Grid</span>
                </div>
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none"><CardContent className="p-4"><MarketInputs market={market} cfg={cfg} onMarketChange={setMarket} onCfgChange={setCfg} /></CardContent></Card>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-slate-400">
                  <BarChart3 className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payoff Spec</span>
                </div>
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none"><CardContent className="p-4"><PayoffSpecPanel payoff={payoff} onChange={setPayoff} /></CardContent></Card>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-slate-400">
                  <SlidersHorizontal className="w-3 h-3 text-purple-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Greek Targets</span>
                </div>
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none"><CardContent className="p-4"><GreekSpecPanel greekSpec={greeks} onChange={setGreeks} /></CardContent></Card>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-slate-400">
                  <ShieldAlert className="w-3 h-3 text-rose-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Constraints</span>
                </div>
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none"><CardContent className="p-4"><ConstraintsPanel constraints={constraints} priority={priority} onConstraintsChange={setConstraints} onPriorityChange={setPriority} /></CardContent></Card>
              </div>
            </>
          ) : (
            <>
              {/* BUILDER INPUTS */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-slate-400">
                  <Settings2 className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Market Status</span>
                </div>
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none"><CardContent className="p-4"><MarketInputs market={market} cfg={cfg} onMarketChange={setMarket} onCfgChange={setCfg} /></CardContent></Card>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-slate-400">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Leg Builder</span>
                </div>
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none"><CardContent className="p-4"><TemplateBuilderPanel market={market} legs={builderLegs} onChange={setBuilderLegs} /></CardContent></Card>
              </div>
            </>
          )}

        </div>
      </aside>

      {/* ========================================= */}
      {/* RIGHT PANEL: OUTPUTS (Canvas)             */}
      {/* ========================================= */}
      <main className="flex-1 flex flex-col h-auto lg:h-full bg-[#020617] min-w-0 relative">
        <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6">
          
          {activeTab === "compiler" ? (
            <>
              {/* COMPILER OUTPUTS */}
              {result && (
                <div className="space-y-4">
                  
                  {/* KPI Metrics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    {/* Premium Card */}
                    <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Structure Premium</div>
                        <div className={cn(
                          "text-xl font-black font-mono", 
                          result.diagnostics.premium > 0 ? "text-rose-400" : result.diagnostics.premium < 0 ? "text-emerald-400" : "text-slate-200"
                        )}>
                          {result.diagnostics.premium > 0 ? "Debit " : result.diagnostics.premium < 0 ? "Credit " : ""}
                          {Math.abs(result.diagnostics.premium).toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>

                    {/* MSE Card */}
                    <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Curve Match (MSE)</div>
                        <div className="text-xl font-black font-mono text-cyan-400">
                          {result.diagnostics.payoffMSE.toFixed(6)}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Penalty Card (Only shows if there is a penalty) */}
                    {result.diagnostics.greekPenalty > 0 && (
                      <Card className="bg-rose-500/5 border-rose-500/20 shadow-none">
                        <CardContent className="p-4 flex flex-col justify-center">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500/80 mb-1">Greek Penalty</div>
                          <div className="text-xl font-black font-mono text-rose-400">
                            {result.diagnostics.greekPenalty.toFixed(4)}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* High-Visibility Warnings Row */}
                  {result.diagnostics.warnings.length > 0 && (
                    <div className="text-amber-400/90 flex items-center gap-2 bg-amber-500/10 px-4 py-3 rounded-lg border border-amber-500/20 text-[10px] font-bold tracking-widest uppercase">
                      <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
                      <div>
                        {result.diagnostics.warnings[0]} 
                        {result.diagnostics.warnings.length > 1 && <span className="ml-2 text-amber-500/70">(+{result.diagnostics.warnings.length - 1} MORE)</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                <CardHeader className="py-4 px-5 border-b border-slate-800">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Target vs Compiled Curve</CardTitle>
                </CardHeader>
                <CardContent className="p-5 h-[400px]">
                  <ComposerPayoffChart data={result?.payoffCurve ?? []} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                  <CardHeader className="py-4 px-5 border-b border-slate-800">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Butterfly Weights</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 h-[280px]"><CurvatureChart data={result?.curvature ?? []} /></CardContent>
                </Card>

                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                  <CardHeader className="py-4 px-5 border-b border-slate-800">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Greek Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5"><GreeksPanel snapshots={result?.greekSnapshots ?? []} greekSpec={greeks} /></CardContent>
                </Card>
              </div>

              <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
              <CardHeader className="py-4 px-5 border-b border-slate-800">
                <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Scenario Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-5 overflow-x-auto dark-scrollbar">
                {/* FIX: Now hooked up to the real local math calculation! */}
                <ScenarioHeatmap 
                  xAxis={compilerHeat?.xAxis ?? []} 
                  yAxis={compilerHeat?.yAxis ?? []} 
                  grid={compilerHeat?.grid ?? []} 
                />
              </CardContent>
            </Card>

              <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                <CardHeader className="py-4 px-5 border-b border-slate-800 flex justify-between items-center">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Compiled Legs</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto dark-scrollbar"><LegTable legs={result?.legs ?? []} market={market} /></CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* BUILDER OUTPUTS */}
              <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                <CardHeader className="py-4 px-5 border-b border-slate-800">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">T+0 PV Curve</CardTitle>
                </CardHeader>
                <CardContent className="p-5 h-[400px]">
                  <ComposerPayoffChart data={builderCurve.data} showExpiry={builderCurve.hasSingleExpiry} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                  <CardHeader className="py-4 px-5 border-b border-slate-800"><CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Greek Snapshot</CardTitle></CardHeader>
                  <CardContent className="p-5"><GreeksPanel snapshots={builderGreekSnaps} greekSpec={greeks} /></CardContent>
                </Card>

                <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                  <CardHeader className="py-4 px-5 border-b border-slate-800"><CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Scenario Matrix</CardTitle></CardHeader>
                  <CardContent className="p-5 overflow-x-auto dark-scrollbar"><ScenarioHeatmap xAxis={builderHeat.xAxis} yAxis={builderHeat.yAxis} grid={builderHeat.grid} /></CardContent>
                </Card>
              </div>

              <Card className="bg-[#0a0f1a] border-slate-800 shadow-none">
                <CardHeader className="py-4 px-5 border-b border-slate-800"><CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Active Legs</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto dark-scrollbar"><LegTable legs={builderLegs} market={market} /></CardContent>
              </Card>
            </>
          )}

        </div>
      </main>
    </div>
  );
}