"use client";

import React from "react";
import { useAllocationStore } from "@/features/allocation/store";
import { AllocationComputeRequest, AllocationComputeResponse } from "@/app/api/docs/schemas";

import { 
  Calculator, Layers, Filter, RefreshCw, AlertCircle, Play, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// --- Strict Formatter (Guards against Null/NaN Trap) ---
const formatMetric = (val: number | null | undefined, isPct: boolean = false, decimals: number = 2): string => {
  if (val !== undefined && val !== null && !isNaN(val)) {
    return isPct ? `${(val * 100).toFixed(decimals)}%` : Number(val).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return "—";
};

export default function AllocationPage() {
  const store = useAllocationStore();

  const handleCompute = async () => {
    store.setField("isLoading", true);
    store.setField("error", null);

    try {
      const payload: AllocationComputeRequest = {
        win_rate: store.winRate,
        payoff_ratio: store.payoffRatio,
        starting_capital: store.startingCapital,
        ruin_drawdown_pct: store.ruinDrawdownPct,
        sim_runs: store.simRuns,
        sim_trades: store.simTrades
      };

      const res = await fetch("/api/allocation/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to run simulation.");
      }

      const data: AllocationComputeResponse = await res.json();
      store.setField("result", data);
    } catch (err: any) {
      store.setField("error", err.message);
    } finally {
      store.setField("isLoading", false);
    }
  };

  // Recharts Data Pivot: Translates number[][] into [{ trade: 0, run0: 100k, run1: 100k }, ...]
  const chartData: any[] = [];
  if (store.result && store.result.simulated_paths.length > 0) {
    const numTrades = store.result.simulated_paths[0].length;
    for (let t = 0; t < numTrades; t++) {
      const dataPoint: any = { trade: `Trade ${t}` };
      store.result.simulated_paths.forEach((path, idx) => {
        dataPoint[`run${idx}`] = path[t];
      });
      chartData.push(dataPoint);
    }
  }

  const ruinLevelAmount = store.startingCapital * (1 - store.ruinDrawdownPct);

  return (
    // OUTermost shell: strict calc height and min-h-0 to prevent flex blowout
    <div className="h-full min-h-0 w-full bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      
      {/* TITLE BAR */}
      <div className="shrink-0 px-6 py-4 border-b border-white/5 bg-[#020617] flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
            Position <span className="text-blue-500">Sizing</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-2">
            <Layers className="w-3 h-3 text-blue-500" /> Kelly Criterion & Risk of Ruin Engine
          </p>
        </div>
        <div className="hidden md:block">
           <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/5">
             CAPITAL MODULE
           </span>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* LEFT PANE */}
        <section className="flex-[0.35] min-w-[350px] border-r border-white/5 flex flex-col bg-[#020617] z-10 min-h-0">
          
          <div className="h-12 shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/30">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Strategy Parameters</h2>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:bg-white/5 hover:text-blue-400 transition-colors" onClick={store.loadSample}>
                    <Play className="w-3 h-3 mr-1.5" /> Sample
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors" onClick={store.clearResults}>
                    <Filter className="w-3 h-3 mr-1.5" /> Clear
                </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto dark-scrollbar p-6 space-y-6 min-h-0 relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#3b82f605_0%,_transparent_50%)] pointer-events-none" />
             
             <div className="relative z-10 space-y-6">
                
                {/* Edge Settings */}
                <div className="space-y-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                    <TrendingUp className="w-3 h-3" /> Statistical Edge
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Win Rate (Dec)</label>
                      <Input type="number" step="0.01" className="h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.winRate} onChange={(e) => store.setField("winRate", parseFloat(e.target.value) || 0)} />
                      <p className="text-[9px] text-slate-500">e.g., 0.55 for 55%</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Payoff Ratio</label>
                      <Input type="number" step="0.01" className="h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.payoffRatio} onChange={(e) => store.setField("payoffRatio", parseFloat(e.target.value) || 0)} />
                      <p className="text-[9px] text-slate-500">Avg Win / Avg Loss</p>
                    </div>
                  </div>
                </div>

                {/* Capital Settings */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                    <Calculator className="w-3 h-3" /> Capital & Risk
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Starting Capital</label>
                      <Input type="number" step="1000" className="h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.startingCapital} onChange={(e) => store.setField("startingCapital", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Ruin Level (Dec)</label>
                      <Input type="number" step="0.01" className="h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.ruinDrawdownPct} onChange={(e) => store.setField("ruinDrawdownPct", parseFloat(e.target.value) || 0)} />
                      <p className="text-[9px] text-slate-500">e.g., 0.20 = 20% drawdown</p>
                    </div>
                  </div>
                </div>

                {/* Monte Carlo Settings */}
                <div className="space-y-4 pt-2 pb-6">
                  <h3 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                    <Layers className="w-3 h-3" /> Simulation Engine
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Sim Runs</label>
                      <Input type="number" step="100" className="h-8 bg-white/5 border-white/10 text-xs font-mono text-slate-400" value={store.simRuns} onChange={(e) => store.setField("simRuns", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Trades per Run</label>
                      <Input type="number" step="10" className="h-8 bg-white/5 border-white/10 text-xs font-mono text-slate-400" value={store.simTrades} onChange={(e) => store.setField("simTrades", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

             </div>
          </div>

          {/* ACTION BAR */}
          <div className="shrink-0 p-4 border-t border-white/5 bg-[#020617] relative z-20">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider text-xs shadow-lg shadow-blue-900/20" 
              onClick={handleCompute} disabled={store.isLoading}
            >
              {store.isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              RUN MONTE CARLO SIMULATION
            </Button>
            {store.error && (
              <div className="mt-3 text-[10px] text-red-400 flex items-center uppercase tracking-wider font-bold bg-red-500/10 p-2 rounded border border-red-500/20">
                <AlertCircle className="w-3 h-3 mr-2 shrink-0" /> {store.error}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANE: Analysis */}
        <section className="flex-[0.65] flex flex-col bg-[#020617] relative z-0 min-h-0">
          <div className="h-12 shrink-0 border-b border-white/5 flex items-center px-6 bg-slate-950/30">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Simulation Results</h2>
          </div>

          {!store.result ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 flex-col min-h-0">
              <Layers className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-bold">Awaiting Execution</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto dark-scrollbar p-6 space-y-6 relative min-h-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3b82f603_0%,_transparent_70%)] pointer-events-none" />

              {/* KPI Ribbon */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                {[
                  { label: "Optimal Kelly Fraction", val: formatMetric(store.result.kelly_pct, true), color: "text-white" },
                  { label: "Half-Kelly (Recommended)", val: formatMetric(store.result.half_kelly_pct, true), color: "text-blue-400" },
                  { label: "Trade Allocation Size", val: `$${formatMetric(store.result.recommended_alloc_amount)}`, color: "text-blue-400" },
                  { label: `Risk of Ruin (Hits $${(ruinLevelAmount / 1000).toFixed(0)}k)`, val: formatMetric(store.result.risk_of_ruin_prob, true), color: store.result.risk_of_ruin_prob > 0.05 ? "text-red-400" : "text-emerald-400" },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-lg">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">{kpi.label}</p>
                    <p className={`text-xl font-mono font-black ${kpi.color}`}>{kpi.val}</p>
                  </div>
                ))}
              </div>

              {/* Monte Carlo Spaghetti Chart */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 shadow-xl relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Monte Carlo Equity Paths (Sample of {store.result.simulated_paths.length})
                  </h3>
                  <p className="text-[9px] text-slate-500 font-mono">Simulating Half-Kelly allocation</p>
                </div>
                
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="trade" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(val) => val.replace("Trade ", "")} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" domain={['auto', 'auto']} tickFormatter={(val) => `$${val/1000}k`} />
                      <RechartsTooltip 
                        cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.2)" }} 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
                        labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                        formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Equity"]}
                      />
                      
                      {/* Draw Ruin Level Reference Line */}
                      <ReferenceLine y={ruinLevelAmount} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'insideBottomLeft', value: 'Ruin Level', fill: '#ef4444', fontSize: 10 }} />
                      <ReferenceLine y={store.startingCapital} stroke="rgba(255,255,255,0.2)" />

                      {/* Map over the paths and draw a line for each */}
                      {store.result.simulated_paths.map((_, idx) => (
                        <Line 
                          key={`run${idx}`} 
                          type="monotone" 
                          dataKey={`run${idx}`} 
                          stroke={idx % 3 === 0 ? "#3b82f6" : idx % 3 === 1 ? "#60a5fa" : "#1d4ed8"} // Variations of blue
                          strokeWidth={1.5} 
                          strokeOpacity={0.6}
                          dot={false} 
                          isAnimationActive={false} // Disable animation for massive data arrays to prevent lag
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="h-12" /> {/* Bottom padding */}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}