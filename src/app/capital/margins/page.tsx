"use client";

import React, { useState } from "react";
import { useMarginStore } from "@/features/margin/store";
import { MarginComputeRequest, MarginComputeResponse } from "@/app/api/docs/schemas";

import { 
  Calculator, Layers, Filter, Plus, Minus, RefreshCw, AlertCircle, Play, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from "recharts";

// --- Strict Formatter (Guards against Null/NaN Trap) ---
const formatMetric = (val: number | null | undefined, isPct: boolean = false, decimals: number = 2): string => {
  if (val !== undefined && val !== null && !isNaN(val)) {
    return isPct ? `${(val * 100).toFixed(decimals)}%` : Number(val).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return "—";
};

export default function MarginPage() {
  const store = useMarginStore();
  const [activeTab, setActiveTab] = useState("overview");

  const handleCompute = async () => {
    store.setField("isLoading", true);
    store.setField("error", null);

    try {
      const payload: MarginComputeRequest = {
        spot_price: store.spotPrice,
        legs: store.legs,
      };

      const res = await fetch("/api/margin/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to compute margin.");
      }

      const data: MarginComputeResponse = await res.json();
      store.setField("result", data);
    } catch (err: any) {
      store.setField("error", err.message);
    } finally {
      store.setField("isLoading", false);
    }
  };

  // Prepare chart data for Recharts
  const marginChartData = store.result?.leg_margins.map((margin, i) => ({
    name: `Leg ${i + 1}`,
    marginReq: margin,
    desc: `${store.legs[i].action.toUpperCase()} ${store.legs[i].quantity}x ${store.legs[i].strike} ${store.legs[i].type.toUpperCase()}`
  })) || [];

  return (
    // MOBILE FIX: Use `h-screen` but let the contents dictate scrolling, removed `min-h-0` restriction at top level
    <div className="h-full w-full bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      
      {/* TITLE BAR */}
      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-white/5 bg-[#020617] flex flex-col md:flex-row md:justify-between items-start md:items-end gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2 md:gap-3">
            Margin & <span className="text-blue-500">Buying Power</span>
          </h1>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1.5 md:gap-2">
            <ShieldAlert className="w-3 h-3 text-blue-500" /> Reg T Capital Requirement Engine
          </p>
        </div>
        <div className="hidden lg:block">
           <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/5">
             CAPITAL MODULE
           </span>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      {/* MOBILE FIX: flex-col for stacking, let it scroll on Y axis naturally. Revert to fixed on lg: */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden w-full dark-scrollbar">
        
        {/* LEFT PANE */}
        {/* MOBILE FIX: Let it expand to full width, drop the fixed 35% flex basis on mobile */}
        <section className="w-full lg:flex-[0.35] lg:min-w-[400px] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col bg-[#020617] z-10 shrink-0">
          
          <div className="h-12 shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-slate-950/30">
            <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">Trade Setup</h2>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-[9px] md:text-[10px] uppercase font-bold text-slate-500 hover:bg-white/5 hover:text-blue-400 transition-colors" onClick={store.loadSample}>
                    <Play className="w-3 h-3 mr-1.5" /> Sample
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[9px] md:text-[10px] uppercase font-bold text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors" onClick={store.clearResults}>
                    <Filter className="w-3 h-3 mr-1.5" /> Clear
                </Button>
            </div>
          </div>

          <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6 relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#3b82f605_0%,_transparent_50%)] pointer-events-none" />
             
             <div className="relative z-10 space-y-6">
                
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Underlying Spot Price</label>
                  <Input type="number" step="0.01" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono w-full md:w-1/2" value={store.spotPrice} onChange={(e) => store.setSpotPrice(parseFloat(e.target.value) || 0)} />
                </div>

                {/* Option Legs Builder */}
                <div className="space-y-3 pb-6"> 
                  <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Strategy Legs
                    </span>
                    <button className="p-1.5 md:p-1 bg-blue-500/10 hover:bg-blue-500/20 md:bg-transparent md:hover:bg-white/10 rounded text-blue-400 transition-colors flex items-center text-[9px] md:text-[10px] font-bold uppercase tracking-wider" onClick={store.addLeg}>
                      <Plus className="w-3 h-3 mr-1" /> Add Leg
                    </button>
                  </div>
                  
                  <div className="space-y-3"> 
                    {store.legs.map((leg, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl md:rounded-md space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] md:text-[10px] font-mono font-bold text-slate-400">Leg {idx + 1}</span>
                          <button className="text-red-400/50 hover:text-red-400 transition-colors p-1" onClick={() => store.removeLeg(idx)}><Minus className="w-4 h-4 md:w-3 md:h-3" /></button>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          <Select value={leg.action} onValueChange={(val: any) => store.updateLeg(idx, "action", val)}>
                            <SelectTrigger className={`h-8 md:h-7 text-[10px] md:text-xs font-bold uppercase border-none ${leg.action === 'buy' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#0f172a] border-white/10 text-white"><SelectItem value="buy">Buy</SelectItem><SelectItem value="sell">Sell</SelectItem></SelectContent>
                          </Select>
                          
                          <Input type="number" placeholder="Qty" className="h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-mono" value={leg.quantity} onChange={(e) => store.updateLeg(idx, "quantity", parseFloat(e.target.value) || 0)} />
                          
                          <Select value={leg.type} onValueChange={(val: any) => store.updateLeg(idx, "type", val)}>
                            <SelectTrigger className="h-8 md:h-7 text-[10px] md:text-xs font-bold uppercase border-white/5 bg-black/20 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#0f172a] border-white/10 text-white"><SelectItem value="call">Call</SelectItem><SelectItem value="put">Put</SelectItem></SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                             <label className="text-[8px] md:text-[9px] uppercase tracking-widest text-slate-500">Strike</label>
                             <Input type="number" step="0.5" className="h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-mono" value={leg.strike} onChange={(e) => store.updateLeg(idx, "strike", parseFloat(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[8px] md:text-[9px] uppercase tracking-widest text-slate-500">Premium</label>
                             <Input type="number" step="0.01" className="h-8 md:h-7 bg-black/20 border-white/5 text-[10px] md:text-xs font-mono" value={leg.premium} onChange={(e) => store.updateLeg(idx, "premium", parseFloat(e.target.value) || 0)} />
                          </div>
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
          </div>

          {/* ACTION BAR */}
          <div className="shrink-0 p-4 border-t border-white/5 bg-[#020617] relative z-20">
            <Button 
              className="w-full h-12 md:h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider text-xs shadow-lg shadow-blue-900/20" 
              onClick={handleCompute} disabled={store.isLoading || store.legs.length === 0}
            >
              {store.isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
              COMPUTE MARGIN
            </Button>
            {store.error && (
              <div className="mt-3 text-[10px] text-red-400 flex items-center uppercase tracking-wider font-bold bg-red-500/10 p-2 rounded border border-red-500/20">
                <AlertCircle className="w-3 h-3 mr-2 shrink-0" /> {store.error}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANE: Analysis */}
        {/* MOBILE FIX: Let it expand full width on mobile, taking up the remaining space */}
        <section className="w-full lg:flex-[0.65] flex flex-col bg-[#020617] relative z-0 shrink-0">
          <div className="h-12 shrink-0 border-b border-t lg:border-t-0 border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
              <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">Capital Analysis</h2>
          </div>

          {!store.result ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 flex-col min-h-[300px]">
              <ShieldAlert className="w-10 h-10 md:w-12 md:h-12 mb-4 opacity-20" />
              <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold">Awaiting Setup</p>
            </div>
          ) : (
            <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 md:p-6 space-y-6 relative pb-24 lg:pb-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3b82f603_0%,_transparent_70%)] pointer-events-none" />

              {/* Top Summary Info */}
              <div className="flex justify-between items-end border-b border-white/10 pb-4 relative z-10">
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">{store.result.strategy_classification}</h2>
                  <p className="text-slate-500 text-[9px] md:text-[10px] uppercase tracking-widest mt-1 font-mono">Run: {store.result.run_id}</p>
                </div>
              </div>

              {/* KPI Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 relative z-10">
                <div className="bg-white/5 backdrop-blur-sm border border-red-500/20 rounded-xl p-4 md:p-5 shadow-lg">
                  <p className="text-[9px] uppercase tracking-widest text-red-400 font-bold mb-1">Total Margin Required</p>
                  <p className="text-xl md:text-2xl font-mono font-black text-white">${formatMetric(store.result.total_margin_req)}</p>
                </div>
                <div className={`bg-white/5 backdrop-blur-sm border rounded-xl p-4 md:p-5 shadow-lg ${store.result.net_premium > 0 ? 'border-emerald-500/20' : 'border-blue-500/20'}`}>
                  <p className={`text-[9px] uppercase tracking-widest font-bold mb-1 ${store.result.net_premium > 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {store.result.net_premium > 0 ? 'Net Credit Received' : 'Net Debit Paid'}
                  </p>
                  <p className="text-xl md:text-2xl font-mono font-black text-white">${formatMetric(Math.abs(store.result.net_premium))}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-lg sm:col-span-2 md:col-span-1">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Max Return on Capital</p>
                  <p className="text-xl md:text-2xl font-mono font-black text-white">{formatMetric(store.result.max_return_on_capital, true)}</p>
                </div>
              </div>

              {/* Margin Breakdown Chart */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-xl relative z-10 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Margin Allocation by Leg
                  </h3>
                </div>
                
                {/* Ensure responsive height based on screen size */}
                <div className="h-[200px] md:h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marginChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(val) => `$${val}`} />
                      <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" width={40} />
                      <RechartsTooltip 
                        cursor={{ fill: "rgba(255,255,255,0.05)" }} 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px", color: "#fff" }}
                        formatter={(value: number, name: string, props: any) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, props.payload.desc]}
                      />
                      <Bar dataKey="marginReq" radius={[0, 4, 4, 0]} barSize={20}>
                        {marginChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#ef4444" fillOpacity={0.8} />
                        ))}
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