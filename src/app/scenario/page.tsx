"use client";

import React, { useState, useEffect } from "react";
import { Play, Activity, ArrowRight, Layers, BarChart2, Zap, Settings2, Plus, Trash2 } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  Tooltip as RechartsTooltip, ReferenceLine 
} from "recharts";
import { calculatePriceDetails } from "@/features/pricing/engine";
import { usePortfolioStore } from "@/features/portfolio/store";
import { toast } from "sonner";

// --- Types ---
interface LegParams {
  id: string;
  instrumentClass: "vanilla" | "american" | "barrier" | "asian";
  type: "call" | "put";
  quantity: number;
  S: number;       
  K: number;       
  r: number;       
  q: number;       
  sigma: number;   
  T: number;       
  // Exotics
  H?: number; 
  barrierType?: "up-out" | "up-in" | "down-out" | "down-in";
  steps?: number; 
  paths?: number; 
  fixings?: number; 
}

interface Shocks {
  spotPct: number;
  volAbs: number;
  rateBps: number;
  skewFactor: number; // Vol increase per 10% spot drop
}

interface PricingOutput {
  price: number; total: number; delta: number; gamma: number; vega: number; theta: number; rho: number; vanna: number; volga: number;
}

interface ScenarioResult {
  runId: string;
  base: PricingOutput;
  shocked: PricingOutput;
  diff: PricingOutput;
}

interface ChartPoint {
  spot: number;
  baseValue: number;
  shockedValue: number;
}

const STRESS_PRESETS = [
  { label: "Clear", shocks: { spotPct: 0, volAbs: 0, rateBps: 0, skewFactor: 0 }, color: "bg-slate-800 hover:bg-slate-700 text-slate-300" },
  { label: "Market Crash", shocks: { spotPct: -15, volAbs: 0.10, rateBps: -50, skewFactor: 0.05 }, color: "bg-rose-950/50 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50" },
  { label: "Inflation Spike", shocks: { spotPct: -5, volAbs: 0.05, rateBps: 100, skewFactor: 0.02 }, color: "bg-amber-950/50 hover:bg-amber-900/50 text-amber-400 border border-amber-900/50" },
  { label: "Bull Rally", shocks: { spotPct: 10, volAbs: -0.04, rateBps: 10, skewFactor: 0.01 }, color: "bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/50" },
];

// Helper to generate a default leg
const createDefaultLeg = (): LegParams => ({
  id: crypto.randomUUID(),
  instrumentClass: "vanilla", type: "call", quantity: 10,
  S: 100, K: 100, r: 0.04, q: 0, sigma: 0.22, T: 0.75,
  H: 110, barrierType: "up-out", steps: 100, paths: 5000, fixings: 252,
});

export default function ScenarioRepricePage() {
  const { setSimulation } = usePortfolioStore();
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [legs, setLegs] = useState<LegParams[]>([createDefaultLeg()]);
  const [shocks, setShocks] = useState<Shocks>({ spotPct: 5, volAbs: 0.01, rateBps: 25, skewFactor: 0.02 });
  
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const savedLegs = sessionStorage.getItem("scenario_legs");
    const savedShocks = sessionStorage.getItem("scenario_shocks");
    
    if (savedLegs) {
      const parsed = JSON.parse(savedLegs);
      setLegs(parsed.map((l: any) => ({ ...createDefaultLeg(), ...l })));
    }
    
    if (savedShocks) {
      const parsed = JSON.parse(savedShocks);
      setShocks(prev => ({ ...prev, ...parsed, skewFactor: parsed.skewFactor ?? 0.02 }));
    }
    
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem("scenario_legs", JSON.stringify(legs));
      sessionStorage.setItem("scenario_shocks", JSON.stringify(shocks));
    }
  }, [legs, shocks, isHydrated]);

  const updateLeg = (id: string, updates: Partial<LegParams>) => {
    setLegs(legs.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const addLeg = () => setLegs([...legs, createDefaultLeg()]);
  const removeLeg = (id: string) => setLegs(legs.filter(l => l.id !== id));

  const handleRun = () => {
    if (legs.length === 0) return toast.error("Add at least one leg.");

    const aggregateOutput = (): PricingOutput => ({ 
      price: 0, total: 0, delta: 0, gamma: 0, vega: 0, 
      theta: 0, rho: 0, vanna: 0, volga: 0 
    });
    
    const baseAgg = aggregateOutput();
    const shockedAgg = aggregateOutput();

    const getMethod = (cls: string) => {
      const map: Record<string, string> = {
        vanilla: "black_scholes",
        american: "binomial_crr",
        barrier: "mc_discrete",
        asian: "arithmetic_mc"
      };
      return map[cls] || "black_scholes";
    };

    const skewVolAdjustment = shocks.skewFactor * (shocks.spotPct / -10);

    legs.forEach(leg => {
      const safeS = Math.max(0.01, leg.S);
      const safeSigma = Math.max(0.0001, leg.sigma);
      const safeT = Math.max(0.0001, leg.T);
      const method = getMethod(leg.instrumentClass);
      const key = leg.instrumentClass;

      const baseRaw = calculatePriceDetails(method, key, { ...leg, S: safeS, sigma: safeSigma, T: safeT });
      
      baseAgg.price += baseRaw.price;
      baseAgg.total += baseRaw.price * leg.quantity;
      baseAgg.delta += baseRaw.delta * leg.quantity;
      baseAgg.gamma += baseRaw.gamma * leg.quantity;
      baseAgg.vega += baseRaw.vega * leg.quantity;
      baseAgg.theta += baseRaw.theta * leg.quantity;
      baseAgg.rho += baseRaw.rho * leg.quantity;
      baseAgg.vanna += baseRaw.vanna * leg.quantity;
      baseAgg.volga += baseRaw.volga * leg.quantity;

      const isTarget = selectedLegId === null || selectedLegId === leg.id;

      const shockedS = isTarget 
        ? Math.max(0.01, safeS * (1 + shocks.spotPct / 100)) 
        : safeS;
      const shockedSigma = isTarget 
        ? Math.max(0.0001, safeSigma + shocks.volAbs + skewVolAdjustment) 
        : safeSigma;
      const shockedR = isTarget 
        ? leg.r + shocks.rateBps / 10000 
        : leg.r;

      const shockedRaw = calculatePriceDetails(method, key, { ...leg, S: shockedS, sigma: shockedSigma, r: shockedR, T: safeT });
      
      shockedAgg.price += shockedRaw.price;
      shockedAgg.total += shockedRaw.price * leg.quantity;
      shockedAgg.delta += shockedRaw.delta * leg.quantity;
      shockedAgg.gamma += shockedRaw.gamma * leg.quantity;
      shockedAgg.vega += shockedRaw.vega * leg.quantity;
      shockedAgg.theta += shockedRaw.theta * leg.quantity;
      shockedAgg.rho += shockedRaw.rho * leg.quantity;
      shockedAgg.vanna += shockedRaw.vanna * leg.quantity;
      shockedAgg.volga += shockedRaw.volga * leg.quantity;
    });

    const anchorSpot = Math.max(0.01, legs[0].S);
    const points: ChartPoint[] = [];
    const minS = anchorSpot * 0.7;
    const maxS = anchorSpot * 1.3;
    const step = (maxS - minS) / 40;

    for (let s = minS; s <= maxS; s += step) {
      let bTotal = 0; 
      let sTotal = 0;
      
      const pointSpotPct = ((s - anchorSpot) / anchorSpot) * 100;
      const pointSkewAdj = shocks.skewFactor * (pointSpotPct / -10);

      legs.forEach(leg => {
        const method = getMethod(leg.instrumentClass);
        const chartParams = { ...leg, paths: leg.paths ? Math.min(leg.paths, 500) : undefined };
        
        bTotal += calculatePriceDetails(method, leg.instrumentClass, { ...chartParams, S: s }).price * leg.quantity;
        
        const isTarget = selectedLegId === null || selectedLegId === leg.id;

        const sShockedSigma = isTarget 
          ? Math.max(0.0001, leg.sigma + shocks.volAbs + pointSkewAdj) 
          : leg.sigma;
        const sShockedRate = isTarget 
          ? leg.r + shocks.rateBps / 10000 
          : leg.r;
        const sShockedSpot = isTarget 
          ? s * (1 + shocks.spotPct / 100) 
          : s;

        sTotal += calculatePriceDetails(method, leg.instrumentClass, { 
          ...chartParams, 
          S: sShockedSpot, 
          sigma: sShockedSigma, 
          r: sShockedRate 
        }).price * leg.quantity;
      });

      points.push({ 
        spot: Number(s.toFixed(2)), 
        baseValue: Number(bTotal.toFixed(2)), 
        shockedValue: Number(sTotal.toFixed(2)) 
      });
    }

    setChartData(points);
    setResult({
      runId: crypto.randomUUID(),
      base: baseAgg,
      shocked: shockedAgg,
      diff: {
        price: shockedAgg.price - baseAgg.price,
        total: shockedAgg.total - baseAgg.total,
        delta: shockedAgg.delta - baseAgg.delta,
        gamma: shockedAgg.gamma - baseAgg.gamma,
        vega: shockedAgg.vega - baseAgg.vega,
        theta: shockedAgg.theta - baseAgg.theta, 
        rho: shockedAgg.rho - baseAgg.rho,
        vanna: shockedAgg.vanna - baseAgg.vanna,
        volga: shockedAgg.volga - baseAgg.volga
      },
    });
  };

  const applyPreset = (presetShocks: Shocks) => { setShocks(presetShocks); setTimeout(handleRun, 50); };
  const handleApplyToPortfolio = () => { 
      setSimulation({ 
        priceShock: shocks.spotPct, 
        volShock: shocks.volAbs,
        targetLegId: selectedLegId 
      }); 
      
      const message = selectedLegId 
        ? `Targeted shock (Leg ${legs.findIndex(l => l.id === selectedLegId) + 1}) sent to global matrix`
        : "Global shocks sent to global matrix";
        
      toast.success(message); 
    };

  const fmt = (num: number, dec = 4) => (num || 0).toFixed(dec);
  const fmtDiff = (num: number, dec = 4) => {
    const sign = num > 0 ? "+" : "";
    const color = num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-400";
    return <span className={`font-mono ${color}`}>{sign}{(num || 0).toFixed(dec)}</span>;
  };

  if (!isHydrated) return null; 

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#020617] text-slate-300 pt-15 lg:pt-2 pb-15">
      
      {/* 1. THEMED TITLE BAR */}
      <div className="shrink-0 px-4 lg:px-6 py-4 border-b border-white/5 bg-[#020617] flex justify-between items-end">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
            Scenario <span className="text-blue-600">Engine</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-2">
            <Activity className="w-3 h-3 text-blue-500" /> Multi-Leg Stress Testing & Skew Modeling
          </p>
        </div>
      </div>

      {/* 2. DUAL-PANE WORKSPACE */}
      {/* MOBILE FIX: flex-col on mobile, flex-row on desktop. overflow-y-auto ensures the whole container scrolls on phone */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden dark-scrollbar w-full">
        
        {/* ================= LEFT PANEL: Strategy Builder (Input) ================= */}
        {/* MOBILE FIX: w-full on mobile, lg:w-[45%] on desktop. shrink-0 guarantees it doesn't collapse */}
        <section className="w-full lg:w-[45%] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col min-w-0 bg-[#020617] shrink-0">
          <div className="h-10 shrink-0 border-b border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Structure Configuration</h2>
          </div>

          {/* MOBILE FIX: Removed internal overflow-y-auto on mobile, kept it on lg desktop */}
          <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6">
            <div className="space-y-4">
              {legs.map((leg, idx) => (
                <div 
                  key={leg.id} 
                  onClick={() => setSelectedLegId(selectedLegId === leg.id ? null : leg.id)}
                  className={`bg-slate-900/50 border rounded-lg p-4 relative group cursor-pointer transition-all ${
                    selectedLegId === leg.id 
                      ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedLegId === leg.id ? 'bg-blue-500' : 'bg-slate-700'}`} />
                      <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Leg {idx + 1}</div>
                    </div>
                    {selectedLegId === leg.id && <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">Targeted</span>}
                  </div>
                  
                  <div className="absolute top-2 right-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); removeLeg(leg.id); }} disabled={legs.length === 1} className="text-slate-500 hover:text-rose-400 disabled:opacity-30"><Trash2 size={14} /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400">Class</label>
                      <select className="w-full bg-[#020617] border border-slate-700 rounded p-1.5 text-xs text-slate-200 h-9" value={leg.instrumentClass} onChange={e => updateLeg(leg.id, { instrumentClass: e.target.value as any })}>
                        <option value="vanilla">Vanilla</option><option value="american">American</option><option value="barrier">Barrier</option><option value="asian">Asian</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400">Type</label>
                      <select className="w-full bg-[#020617] border border-slate-700 rounded p-1.5 text-xs text-slate-200 h-9" value={leg.type} onChange={e => updateLeg(leg.id, { type: e.target.value as any })}>
                        <option value="call">Call</option><option value="put">Put</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400">Qty</label>
                      <input type="number" className="w-full bg-[#020617] border border-slate-700 rounded p-1.5 text-xs font-mono text-slate-200 h-9" value={leg.quantity} onChange={e => updateLeg(leg.id, { quantity: Number(e.target.value) })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1"><label className="text-[10px] uppercase text-slate-400">Spot</label><input type="number" className="w-full bg-[#020617] border border-slate-700 rounded p-1.5 text-xs h-9" value={leg.S} onChange={e => updateLeg(leg.id, { S: Number(e.target.value) })} /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase text-slate-400">Strike</label><input type="number" className="w-full bg-[#020617] border border-slate-700 rounded p-1.5 text-xs h-9" value={leg.K} onChange={e => updateLeg(leg.id, { K: Number(e.target.value) })} /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase text-slate-400">Vol</label><input type="number" className="w-full bg-[#020617] border border-slate-700 rounded p-1.5 text-xs h-9" value={leg.sigma} onChange={e => updateLeg(leg.id, { sigma: Number(e.target.value) })} /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase text-slate-400">Time</label><input type="number" className="text-xs w-full bg-[#020617] border border-slate-700 rounded p-1.5 h-9" value={leg.T} onChange={e => updateLeg(leg.id, { T: Number(e.target.value) })} /></div>
                  </div>
                </div>
              ))}
              <button onClick={addLeg} className="w-full py-3 lg:py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 text-xs hover:text-blue-400 transition-all flex justify-center items-center gap-2">
                <Plus size={14} /> Add Strategy Leg
              </button>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 shadow-lg">
              <div className="flex justify-between items-end border-b border-slate-800/80 pb-3 mb-5">
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <Zap size={16} className="text-rose-500" /> Shock Regime 
                  <span className="text-[10px] text-slate-500 normal-case tracking-normal ml-2">
                    ({selectedLegId ? 'Targeted' : 'Global'})
                  </span>
                </h2>
                {selectedLegId && (
                  <button onClick={() => setSelectedLegId(null)} className="text-[9px] font-bold text-blue-500 hover:text-blue-400 uppercase">Reset to Global</button>
                )}
              </div>
              
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {STRESS_PRESETS.map(preset => (
                    <button key={preset.label} onClick={() => applyPreset(preset.shocks)} className={`text-[10px] uppercase tracking-wider font-semibold py-1.5 px-3 lg:py-1 lg:px-2 rounded transition-colors ${preset.color}`}>
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-400">Spot Shock (%)</label><input type="number" className="w-full bg-[#020617] border border-slate-700 rounded-md p-2 text-sm font-mono text-slate-200 h-10" value={shocks.spotPct} onChange={e => setShocks({...shocks, spotPct: Number(e.target.value)})} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-400">Vol Shock</label><input type="number" className="w-full bg-[#020617] border border-slate-700 rounded-md p-2 text-sm font-mono text-slate-200 h-10" value={shocks.volAbs} onChange={e => setShocks({...shocks, volAbs: Number(e.target.value)})} /></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button onClick={handleRun} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-3 lg:py-2.5 rounded transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex justify-center items-center gap-2"><Play size={14} /> Calculate</button>
                  <button onClick={handleApplyToPortfolio} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-3 lg:py-2.5 rounded border border-slate-700 flex justify-center items-center gap-2"><Layers size={14} /> Apply Global</button>
                </div>
              </div>
            </div>
            {/* Added spacer for mobile scroll clearance */}
            <div className="h-6 lg:hidden w-full shrink-0"></div>
          </div>
        </section>

        {/* ================= RIGHT PANEL: Results & Chart (Output) ================= */}
        {/* MOBILE FIX: w-full on mobile, lg:w-[55%] on desktop. */}
        <section className="w-full lg:w-[55%] flex flex-col bg-[#020617] min-w-0 shrink-0">
          <div className="h-10 shrink-0 border-b border-t lg:border-t-0 border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Analytics & Payoff</h2>
          </div>

          <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
            {!result ? (
              <div className="flex items-start gap-3 p-5 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm bg-slate-900/20">
                <ArrowRight size={16} className="mt-0.5 text-slate-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-400 block mb-1">Awaiting Computation</span>
                  Construct your strategy, define the market regime, and calculate the net structural payoff.
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border border-slate-800 rounded-lg bg-[#0f172a] p-4 lg:p-5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Base Net Position</div>
                    <div className="mb-6">
                      <div className="text-[10px] uppercase text-slate-500 mb-1">Total Position Value</div>
                      <div className="font-mono text-slate-200 text-lg">{fmt(result.base.total)}</div>
                    </div>
                    <div className="space-y-2 text-sm pt-4 border-t border-slate-800/80">
                      {['delta', 'gamma', 'vega', 'theta', 'vanna', 'volga'].map((g) => (
                        <div key={g} className="flex justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Net {g}</span>
                          <span className="font-mono text-slate-300">{fmt(result.base[g as keyof PricingOutput], 2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-lg bg-[#0f172a] p-4 lg:p-5">
                    <div className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-widest mb-4">Shocked Position</div>
                    <div className="mb-6">
                      <div className="text-[10px] uppercase text-slate-500 mb-1">Total Position Value</div>
                      <div className="font-mono text-slate-200 text-lg">{fmt(result.shocked.total)}</div>
                    </div>
                    <div className="space-y-2 text-sm pt-4 border-t border-slate-800/80">
                      {['delta', 'gamma', 'vega', 'theta', 'vanna', 'volga'].map((g) => (
                        <div key={g} className="flex justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Net {g}</span>
                          <span className="font-mono text-slate-300">{fmt(result.shocked[g as keyof PricingOutput], 2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-blue-900/50 bg-[#0f172a] rounded-lg p-4 lg:p-5 relative overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.05)] sm:col-span-2 md:col-span-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] pointer-events-none" />
                    <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-4">Attribution Δ</div>
                    <div className="mb-6 relative z-10">
                      <div className="text-[10px] uppercase text-slate-500 mb-1">Net PnL</div>
                      <div className="text-lg">{fmtDiff(result.diff.total, 2)}</div>
                    </div>
                    <div className="space-y-2 text-sm pt-4 border-t border-slate-800/80 relative z-10">
                      {['delta', 'gamma', 'vega', 'theta', 'vanna', 'volga'].map((g) => (
                        <div key={g} className="flex justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Δ {g}</span>
                          {fmtDiff(result.diff[g as keyof PricingOutput], 2)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 lg:p-5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-6 flex items-center gap-2">
                    <BarChart2 size={16} className="text-blue-500" /> Structural Payoff Value (±30% Spot)
                  </h3>
                  <div className="h-[250px] md:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="spot" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '13px', fontFamily: 'monospace' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                          formatter={(val: number) => [val.toFixed(2), undefined]}
                          labelFormatter={(label) => `Spot: ${label}`}
                        />
                        <ReferenceLine x={legs[0]?.S || 100} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.5} />
                        <Line type="monotone" dataKey="baseValue" name="Base Net Value" stroke="#94a3b8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="shockedValue" name="Shocked Net Value" stroke="#f43f5e" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}