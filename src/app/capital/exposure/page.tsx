"use client";

import React from "react";
import { useExposureStore } from "@/features/exposure/store";
import type { ExposureComputeRequest, ExposureComputeResponse } from "@/app/api/docs/schemas";

import { Activity, Layers, Filter, Plus, Minus, RefreshCw, AlertCircle, Play, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

const formatMetric = (val: number | null | undefined, decimals: number = 2): string => {
  if (val !== undefined && val !== null && !isNaN(val)) return Number(val).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return "—";
};

export default function ExposurePage() {
  const store = useExposureStore();

  const handleCompute = async () => {
    store.setField("isLoading", true);
    store.setField("error", null);

    try {
      const payload: ExposureComputeRequest = {
        benchmark_name: store.benchmarkName,
        benchmark_price: store.benchmarkPrice,
        legs: store.legs,
      };

      const res = await fetch("/api/exposure/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to compute exposure.");
      const data: ExposureComputeResponse = await res.json();
      store.setField("result", data);
    } catch (err: any) {
      store.setField("error", err.message);
    } finally {
      store.setField("isLoading", false);
    }
  };

  const chartData = store.result?.leg_exposures.map(leg => ({
    name: leg.symbol,
    betaDelta: leg.beta_weighted_delta
  })) || [];

  return (
    // MOBILE FIX: Use `h-full` but let it dictate natural scrolling on mobile
    <div className="h-full w-full bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      
      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-white/5 bg-[#020617] flex flex-col md:flex-row md:justify-between items-start md:items-end gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2 md:gap-3">
            Beta <span className="text-blue-500">Weighting</span>
          </h1>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1.5 md:gap-2">
            <Activity className="w-3 h-3 text-blue-500" /> Directional Portfolio Exposure Engine
          </p>
        </div>
      </div>

      {/* MOBILE FIX: Stack layout on mobile, switch to flex-row on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden w-full dark-scrollbar">
        
        {/* LEFT PANE */}
        {/* MOBILE FIX: Full width on mobile, 40% on desktop */}
        <section className="w-full lg:flex-[0.40] lg:min-w-[450px] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col bg-[#020617] z-10 shrink-0">
          <div className="h-12 shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-slate-950/30">
            <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">Positions & Benchmark</h2>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-[9px] md:text-[10px] uppercase font-bold text-slate-500 hover:text-blue-400" onClick={store.loadSample}><Play className="w-3 h-3 mr-1.5" /> Sample</Button>
                <Button variant="ghost" size="sm" className="h-7 text-[9px] md:text-[10px] uppercase font-bold text-slate-500 hover:text-red-400" onClick={store.clearResults}><Filter className="w-3 h-3 mr-1.5" /> Clear</Button>
            </div>
          </div>

          <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6 relative">
             <div className="grid grid-cols-2 gap-3 md:gap-4 border-b border-white/5 pb-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Benchmark (e.g. SPY)</label>
                  <Input className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono uppercase" value={store.benchmarkName} onChange={(e) => store.setField("benchmarkName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Benchmark Spot Price</label>
                  <Input type="number" step="0.01" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.benchmarkPrice} onChange={(e) => store.setField("benchmarkPrice", parseFloat(e.target.value) || 0)} />
                </div>
             </div>

             <div className="space-y-3 pb-6"> 
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2"><Layers className="w-3 h-3" /> Portfolio Legs</span>
                  <button className="p-1.5 md:p-1 bg-blue-500/10 hover:bg-blue-500/20 md:bg-transparent md:hover:bg-white/10 rounded text-blue-400 transition-colors flex items-center text-[9px] md:text-[10px] font-bold uppercase" onClick={store.addLeg}><Plus className="w-3 h-3 mr-1" /> Add Asset</button>
                </div>
                
                <div className="space-y-3"> 
                  {store.legs.map((leg, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl md:rounded-md space-y-3 relative">
                      <button className="absolute top-2 right-2 text-red-400/50 hover:text-red-400 p-1" onClick={() => store.removeLeg(idx)}><Minus className="w-4 h-4 md:w-3 md:h-3" /></button>
                      
                      <div className="grid grid-cols-3 gap-2 pr-8 md:pr-6">
                        <Input placeholder="SYM" className="h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-bold uppercase" value={leg.symbol} onChange={(e) => store.updateLeg(idx, "symbol", e.target.value)} />
                        <Select value={leg.asset_type} onValueChange={(val: any) => store.updateLeg(idx, "asset_type", val)}>
                          <SelectTrigger className="h-8 md:h-7 text-[10px] md:text-xs font-bold uppercase border-white/5 bg-black/20"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#0f172a] border-white/10 text-white"><SelectItem value="option">Option</SelectItem><SelectItem value="stock">Stock</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" placeholder="Qty" className={`h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-mono ${leg.quantity < 0 ? 'text-red-400' : 'text-blue-400'}`} value={leg.quantity} onChange={(e) => store.updateLeg(idx, "quantity", parseFloat(e.target.value) || 0)} />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1"><label className="text-[8px] md:text-[8px] uppercase tracking-widest text-slate-500">Spot</label><Input type="number" step="0.5" className="h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-mono" value={leg.spot_price} onChange={(e) => store.updateLeg(idx, "spot_price", parseFloat(e.target.value) || 0)} /></div>
                        <div className="space-y-1"><label className="text-[8px] md:text-[8px] uppercase tracking-widest text-slate-500">Delta</label><Input type="number" step="0.01" className="h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-mono" value={leg.delta} onChange={(e) => store.updateLeg(idx, "delta", parseFloat(e.target.value) || 0)} /></div>
                        <div className="space-y-1"><label className="text-[8px] md:text-[8px] uppercase tracking-widest text-slate-500">Beta</label><Input type="number" step="0.01" className="h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-mono" value={leg.beta} onChange={(e) => store.updateLeg(idx, "beta", parseFloat(e.target.value) || 0)} /></div>
                      </div>
                    </div>
                  ))}
                  {store.legs.length === 0 && (
                    <div className="text-center p-4 border border-dashed border-white/10 rounded-md text-slate-500 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                      No legs added
                    </div>
                  )}
                </div>
             </div>
          </div>

          <div className="shrink-0 p-4 border-t border-white/5 bg-[#020617] relative z-20">
            <Button className="w-full h-12 md:h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider text-xs shadow-lg shadow-blue-900/20" onClick={handleCompute} disabled={store.isLoading || store.legs.length === 0}>
              {store.isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <BarChart2 className="w-4 h-4 mr-2" />} CALC BETA DELTA
            </Button>
            {store.error && <div className="mt-3 text-[10px] text-red-400 flex items-center font-bold bg-red-500/10 p-2 rounded border border-red-500/20"><AlertCircle className="w-3 h-3 mr-2 shrink-0" /> {store.error}</div>}
          </div>
        </section>

        {/* RIGHT PANE */}
        {/* MOBILE FIX: Full width on mobile */}
        <section className="w-full lg:flex-[0.60] flex flex-col bg-[#020617] relative z-0 shrink-0">
          <div className="h-12 shrink-0 border-b border-t lg:border-t-0 border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
              <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">Directional Risk Profile</h2>
          </div>

          {!store.result ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 flex-col min-h-[300px]"><Activity className="w-10 h-10 md:w-12 md:h-12 mb-4 opacity-20" /><p className="text-[10px] md:text-xs uppercase tracking-widest font-bold">Awaiting Execution</p></div>
          ) : (
            <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 md:p-6 space-y-6 relative pb-24 lg:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className={`bg-white/5 backdrop-blur-sm border rounded-xl p-4 md:p-5 shadow-lg ${store.result.net_beta_delta > 0 ? 'border-blue-500/30' : 'border-red-500/30'}`}>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Equivalent {store.benchmarkName} Shares</p>
                  <p className={`text-3xl md:text-4xl font-mono font-black ${store.result.net_beta_delta > 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatMetric(store.result.net_beta_delta)}</p>
                  <p className="text-[8px] md:text-[9px] text-slate-500 mt-2 uppercase tracking-widest">Net Delta Position</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-lg">
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Directional Capital Exposure</p>
                  <p className="text-3xl md:text-4xl font-mono font-black text-white">${formatMetric(Math.abs(store.result.net_dollar_exposure))}</p>
                  <p className="text-[8px] md:text-[9px] text-slate-500 mt-2 uppercase tracking-widest">Notional $ At Risk to {store.benchmarkName}</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-xl relative z-10">
                <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-6"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Beta-Weighted Delta by Symbol</h3>
                <div className="h-[250px] md:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" />
                      <RechartsTooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                      <Bar dataKey="betaDelta" radius={[4, 4, 4, 4]} barSize={30}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.betaDelta >= 0 ? "#3b82f6" : "#ef4444"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}