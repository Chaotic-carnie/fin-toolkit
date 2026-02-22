"use client";

import React, { useState } from "react";
import { useCapBudStore } from "@/features/capbud/store";
import type { CapBudComputeRequest, CapBudComputeResponse } from "@/app/api/docs/schemas";

import { 
  Calculator, Layers, Filter, Plus, Minus, RefreshCw, AlertCircle, Play, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";

// --- Strict Formatter (Guards against Null/NaN Trap) ---
const formatMetric = (val: number | null | undefined, isPct: boolean = false, decimals: number = 2): string => {
  if (val !== undefined && val !== null && !isNaN(val)) {
    return isPct ? `${(val * 100).toFixed(decimals)}%` : Number(val).toFixed(decimals);
  }
  return "—";
};

export default function CapBudPage() {
  const store = useCapBudStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [showWacc, setShowWacc] = useState(false);

  const handleCompute = async () => {
    store.setField("isLoading", true);
    store.setField("error", null);

    try {
      const payload: CapBudComputeRequest = {
        project_name: store.projectName,
        currency: store.currency,
        discount_rate: store.discountRate,
        convention: store.convention,
        cashflows: store.cashflows,
        finance_rate: store.financeRate,
        reinvest_rate: store.reinvestRate,
      };

      const res = await fetch("/api/capbud/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to compute metrics.");
      }

      const data: CapBudComputeResponse = await res.json();
      store.setField("result", data);
    } catch (err: any) {
      store.setField("error", err.message);
    } finally {
      store.setField("isLoading", false);
    }
  };

  const cashflowChartData = store.result?.cashflow_table.years.map((yr, i) => ({
    year: `t=${yr}`,
    amount: store.result!.cashflow_table.cashflows[i],
  })) || [];

  const npvProfileData = store.result?.npv_profile.rates.map((rate, i) => ({
    rate: rate * 100,
    npv: store.result!.npv_profile.npvs[i],
  })) || [];

  return (
    // MOBILE FIX: Use `h-full` to let it dictate natural scrolling on mobile, removing `min-h-0` restriction at the top level
    <div className="min-h-full lg:h-full w-full bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      
      {/* TITLE BAR */}
      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-white/5 bg-[#020617] flex flex-col md:flex-row md:justify-between items-start md:items-end gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2 md:gap-3">
            Capital <span className="text-blue-500">Budgeting</span>
          </h1>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1.5 md:gap-2">
            <Layers className="w-3 h-3 text-blue-500" /> Project Finance & NPV Engine
          </p>
        </div>
        <div className="hidden lg:block">
           <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/5">
             CAPITAL MODULE
           </span>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      {/* MOBILE FIX: flex-col for stacking on mobile, let it scroll on Y axis naturally. Revert to flex-row and hidden overflow on lg: */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden w-full dark-scrollbar">
        
        {/* LEFT PANE */}
        {/* MOBILE FIX: Let it expand to full width, drop the fixed 35% flex basis on mobile */}
        <section className="w-full lg:flex-[0.35] lg:min-w-[350px] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col bg-[#020617] z-10 shrink-0">
          
          <div className="h-12 shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-slate-950/30">
            <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Project Parameters
            </h2>
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Project Name</label>
                      <Input className="h-9 md:h-8 bg-white/5 border-white/10 text-xs" value={store.projectName} onChange={(e) => store.setField("projectName", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Currency</label>
                      <Select value={store.currency} onValueChange={(val) => store.setField("currency", val)}>
                        <SelectTrigger className="h-9 md:h-8 bg-white/5 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Discount Rate (Dec)</label>
                      <Input type="number" step="0.001" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.discountRate} onChange={(e) => store.setField("discountRate", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Convention</label>
                      <Select value={store.convention} onValueChange={(val: any) => store.setField("convention", val)}>
                        <SelectTrigger className="h-9 md:h-8 bg-white/5 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                          <SelectItem value="end_of_period">End of Period</SelectItem>
                          <SelectItem value="mid_year">Mid-Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* WACC Helper */}
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <button onClick={() => setShowWacc(!showWacc)} className="w-full px-4 py-3 md:py-2 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                      <Calculator className="w-3 h-3 text-blue-500" /> WACC Calculator
                    </span>
                    {showWacc ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                  </button>
                  {showWacc && (
                    <div className="p-4 space-y-3 bg-black/20">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div className="space-y-1"><label className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-500">Cost of Eq (Re)</label><Input type="number" step="0.01" className="h-8 md:h-7 text-xs bg-white/5 border-white/10 font-mono" value={store.waccRe} onChange={(e)=>store.setField("waccRe", +e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-500">Cost of Debt (Rd)</label><Input type="number" step="0.01" className="h-8 md:h-7 text-xs bg-white/5 border-white/10 font-mono" value={store.waccRd} onChange={(e)=>store.setField("waccRd", +e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-500">Tax Rate</label><Input type="number" step="0.01" className="h-8 md:h-7 text-xs bg-white/5 border-white/10 font-mono" value={store.waccTax} onChange={(e)=>store.setField("waccTax", +e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-500">Eq Weight (wE)</label><Input type="number" step="0.01" className="h-8 md:h-7 text-xs bg-white/5 border-white/10 font-mono" value={store.waccWe} onChange={(e)=>store.setField("waccWe", +e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-500">Debt Weight (wD)</label><Input type="number" step="0.01" className="h-8 md:h-7 text-xs bg-white/5 border-white/10 font-mono" value={store.waccWd} onChange={(e)=>store.setField("waccWd", +e.target.value)} /></div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 md:pt-1">
                        <Button size="sm" className="flex-1 h-8 md:h-7 text-[9px] md:text-[10px] bg-white/10 hover:bg-white/20 text-white" onClick={store.calculateWacc}>Compute</Button>
                        {store.computedWacc !== null && (
                          <Button size="sm" className="flex-1 h-8 md:h-7 text-[9px] md:text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30" onClick={store.applyWaccToDiscount}>Use: {(store.computedWacc * 100).toFixed(2)}%</Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cashflows Editor */}
                <div className="space-y-3 pb-6"> 
                  <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Cashflow Schedule
                    </span>
                    <div className="flex gap-1">
                      <button className="p-1.5 md:p-1 hover:bg-white/10 rounded text-slate-400 transition-colors" onClick={store.addYear}><Plus className="w-4 h-4 md:w-3 md:h-3" /></button>
                      <button className="p-1.5 md:p-1 hover:bg-white/10 rounded text-slate-400 transition-colors" onClick={store.removeYear}><Minus className="w-4 h-4 md:w-3 md:h-3" /></button>
                    </div>
                  </div>
                  
                  <div className="space-y-2"> 
                    {store.cashflows.map((cf, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/5 border border-white/5 p-2 md:p-1.5 rounded-md">
                        <div className={`w-12 text-center text-[10px] font-mono font-bold py-1.5 md:py-1 rounded ${idx === 0 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          t = {idx}
                        </div>
                        <Input 
                          type="number" step="0.01"
                          className="h-8 md:h-7 bg-transparent border-none text-right font-mono text-sm focus-visible:ring-0 px-2"
                          value={cf}
                          onChange={(e) => store.updateCashflow(idx, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

             </div>
          </div>

          <div className="shrink-0 p-4 border-t border-white/5 bg-[#020617] relative z-20">
            <Button 
              className="w-full h-12 md:h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider text-xs shadow-lg shadow-blue-900/20" 
              onClick={handleCompute} disabled={store.isLoading}
            >
              {store.isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              RUN COMPUTATION
            </Button>
            {store.error && (
              <div className="mt-3 text-[10px] text-red-400 flex items-center uppercase tracking-wider font-bold bg-red-500/10 p-2 rounded border border-red-500/20">
                <AlertCircle className="w-3 h-3 mr-2 shrink-0" /> {store.error}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANE */}
        {/* MOBILE FIX: Let it expand full width on mobile, taking up the remaining space */}
        <section className="w-full lg:flex-[0.65] flex flex-col bg-[#020617] relative z-0 shrink-0">
          <div className="h-12 shrink-0 border-b border-t lg:border-t-0 border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
              <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Investment Analysis
              </h2>
          </div>

          {!store.result ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 flex-col min-h-[300px]">
              <Calculator className="w-10 h-10 md:w-12 md:h-12 mb-4 opacity-20" />
              <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold">Awaiting Execution</p>
            </div>
          ) : (
            <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 md:p-6 space-y-6 relative pb-24 lg:pb-6">
              
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3b82f603_0%,_transparent_70%)] pointer-events-none" />

              {/* Top Summary Info */}
              <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 border-b border-white/10 pb-4 relative z-10">
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">{store.result.project_name}</h2>
                  <p className="text-slate-500 text-[9px] md:text-[10px] uppercase tracking-widest mt-1 font-mono">Run: {store.result.run_id}</p>
                </div>
                <div className={`px-3 py-1.5 md:py-1 rounded border text-[10px] md:text-[11px] font-bold uppercase tracking-widest w-fit ${store.result.npv > 0 ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  {store.result.decision.split(":")[0]}
                </div>
              </div>

              {/* KPI Ribbon */}
              {/* MOBILE FIX: Horizontal scroll for KPIs if they don't fit on tiny screens */}
              <div className="w-full overflow-x-auto dark-scrollbar pb-2 relative z-10">
                <div className="flex md:grid md:grid-cols-5 gap-3 min-w-max md:min-w-0">
                  {[
                    { label: "Net Present Value", val: `${store.currency} ${formatMetric(store.result.npv)}`, color: store.result.npv > 0 ? "text-blue-400" : "text-red-400" },
                    { label: "IRR", val: formatMetric(store.result.irr, true), color: "text-white" },
                    { label: "MIRR", val: formatMetric(store.result.mirr, true), color: "text-white" },
                    { label: "Payback (Yrs)", val: formatMetric(store.result.payback_period), color: "text-white" },
                    { label: "Profitability Idx", val: formatMetric(store.result.profitability_index, false, 4), color: "text-white" },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 md:p-4 shadow-lg min-w-[140px] md:min-w-0">
                      <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">{kpi.label}</p>
                      <p className={`text-sm md:text-lg font-mono font-bold ${kpi.color}`}>{kpi.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* View Toggles */}
              <div className="flex gap-4 border-b border-white/10 pt-2 relative z-10">
                {["overview", "table", "sensitivity"].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 text-[9px] md:text-[10px] uppercase tracking-widest font-bold transition-colors border-b-2 ${activeTab === tab ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* TAB: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6 relative z-10 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Bar Chart */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-xl">
                      <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Cashflow Profile
                      </h3>
                      <div className="h-[200px] md:h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cashflowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="year" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(val) => `${val/1000}k`} />
                            <RechartsTooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                            <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                              {cashflowChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={(entry.amount ?? 0) >= 0 ? "#3b82f6" : "#ef4444"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Line Chart */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-xl">
                      <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> NPV vs Discount Rate
                      </h3>
                      <div className="h-[200px] md:h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={npvProfileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="rate" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(val) => `${val}%`} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" />
                            <RechartsTooltip cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.2)" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                            <Line type="monotone" dataKey="npv" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {store.result.notes.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <h4 className="text-[9px] md:text-[10px] uppercase tracking-widest text-amber-500 font-bold flex items-center mb-2">
                        <AlertCircle className="w-3 h-3 mr-2" /> Analytical Notes
                      </h4>
                      <ul className="list-disc pl-5 text-[10px] md:text-[11px] text-amber-500/80 space-y-1 font-mono">
                        {store.result.notes.map((note, i) => <li key={i}>{note}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: TABLE */}
              {activeTab === "table" && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-xl relative z-10 animate-in fade-in duration-300">
                  <div className="overflow-x-auto dark-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-[8px] md:text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                          <th className="p-3">Year</th>
                          <th className="p-3 text-right">Cashflow</th>
                          <th className="p-3 text-right">Discounted PV</th>
                          <th className="p-3 text-right">Cumulative CF</th>
                          <th className="p-3 text-right">Cumulative PV</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px] md:text-xs font-mono">
                        {store.result.cashflow_table.years.map((yr, i) => (
                          <tr key={yr} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-3 text-slate-500">t = {yr}</td>
                            <td className={`p-3 text-right ${(store.result!.cashflow_table.cashflows[i] ?? 0) < 0 ? 'text-red-400' : 'text-blue-400'}`}>{formatMetric(store.result!.cashflow_table.cashflows[i])}</td>
                            <td className="p-3 text-right text-slate-300">{formatMetric(store.result!.cashflow_table.discounted_cashflows[i])}</td>
                            <td className="p-3 text-right text-slate-500">{formatMetric(store.result!.cashflow_table.cumulative_cashflows[i])}</td>
                            <td className="p-3 text-right text-slate-500">{formatMetric(store.result!.cashflow_table.cumulative_discounted_cashflows[i])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: SENSITIVITY */}
              {activeTab === "sensitivity" && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-xl pb-4 relative z-10 animate-in fade-in duration-300">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Two-Way NPV Sensitivity Grid
                    </h3>
                  </div>
                  <div className="overflow-x-auto dark-scrollbar p-4">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="text-[8px] md:text-[9px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/10">
                          <th className="p-2 w-[100px] md:w-[120px]">CF Scale \ Rate</th>
                          {store.result.sensitivity.rate_shifts.map((rs, i) => (
                            <th key={i} className="p-2 text-right">
                              {rs > 0 ? "+" : ""}{(rs * 100).toFixed(0)} bps
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-[10px] md:text-xs font-mono">
                        {store.result.sensitivity.scale_shifts.map((ss, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-2 font-bold text-slate-500">
                              {ss > 0 ? "+" : ""}{(ss * 100).toFixed(0)}%
                            </td>
                            {(store.result?.sensitivity?.npv_grid?.[rowIdx] || []).map((npv, colIdx) => (
                              <td key={colIdx} className={`p-2 text-right ${npv < 0 ? 'text-red-400/80' : 'text-blue-400/80'}`}>
                                {formatMetric(npv)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </section>

      </div>
    </div>
  );
}