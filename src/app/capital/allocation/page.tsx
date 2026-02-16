"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAllocationStore } from "@/features/allocation/store";
import type { AllocationComputeRequest, AllocationComputeResponse } from "@/app/api/docs/schemas";
import dynamic from "next/dynamic";
// Rename the default import to something unique like 'JoyrideTour'
import JoyrideTour, { type Step,type CallBackProps, STATUS, ACTIONS, EVENTS } from "react-joyride";
// Forces Next.js to ignore this during the build phase
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

import { 
  Calculator, Layers, Filter, RefreshCw, AlertCircle, Play, TrendingUp, Presentation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

const formatMetric = (val: number | null | undefined, isPct: boolean = false, decimals: number = 2): string => {
  if (val !== undefined && val !== null && !isNaN(val)) {
    return isPct ? `${(val * 100).toFixed(decimals)}%` : Number(val).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return "—";
};

// --- Controlled Tour Steps ---
const TOUR_STEPS: Step[] = [
  {
    target: ".tour-edge-settings",
    content: "Define your strategy's statistical edge. The engine needs your win rate and average payoff ratio (Win Size / Loss Size) to calculate expected value.",
    title: "1. Statistical Edge",
    disableBeacon: true,
  },
  {
    target: ".tour-capital-settings",
    content: "Enter your starting bankroll and your 'Ruin Level'. This is the maximum drawdown percentage you are willing to tolerate before halting the strategy.",
    title: "2. Capital & Risk",
  },
  {
    target: ".tour-run-button",
    content: "Click this button to run the Monte Carlo simulation. The tour will automatically continue once the computation is complete!",
    title: "3. Run Simulation",
    spotlightClicks: true, // Crucial: Allows the user to actually click the button beneath the spotlight!
    hideFooter: true,      // Crucial: Hides 'Next' so the user is forced to click Run to advance.
  },
  {
    target: ".tour-results",
    content: "Analyze your results. You'll get your exact optimal Kelly fraction for sizing, your probability of hitting ruin, and a visualization of simulated equity paths.",
    title: "4. Analyze the Output",
  }
];

export default function AllocationPage() {
  const store = useAllocationStore();
  const searchParams = useSearchParams();

  // --- Controlled Joyride State ---
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (searchParams.get("demo") === "true") {
      setTimeout(() => {
        setStepIndex(0);
        setRunTour(true);
      }, 500);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // FIXED: Handles all exit states cleanly to prevent stuck tooltips
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;
    
    // If the tour is finished, skipped, or the user hits the close action
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any) || action === ACTIONS.CLOSE) {
      setRunTour(false);
      setStepIndex(0);
      return; 
    } 
    
    // Step increment logic
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }
  };

  const startManualDemo = () => {
    setStepIndex(0);
    setRunTour(true);
  };

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
        throw new Error((await res.json()).error || "Failed to run simulation.");
      }

      const data: AllocationComputeResponse = await res.json();
      store.setField("result", data);
    } catch (err: any) {
      store.setField("error", err.message);
    } finally {
      store.setField("isLoading", false);
      
      // AUTO-ADVANCE TOUR AFTER RUN COMPLETES
      if (runTour && stepIndex === 2) {
        setTimeout(() => setStepIndex(3), 300); // 300ms delay ensures DOM paints the results first
      }
    }
  };

  const chartData: any[] = [];
  if (store.result && store.result.simulated_paths.length > 0) {
    const numTrades = store.result.simulated_paths[0]?.length ?? 0;
    for (let t = 0; t < numTrades; t++) {
      const dataPoint: any = { trade: `Trade ${t}` };
      store.result.simulated_paths.forEach((path, idx) => { dataPoint[`run${idx}`] = path[t]; });
      chartData.push(dataPoint);
    }
  }

  const ruinLevelAmount = store.startingCapital * (1 - store.ruinDrawdownPct);

  if (!mounted) return null;

  return (
    <div className="h-full w-full bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      
      <JoyrideTour
        callback={handleJoyrideCallback}
        continuous
        stepIndex={stepIndex} 
        run={runTour}
        disableScrolling={true} 
        showProgress
        showSkipButton
        hideCloseButton={true} // FIXED: Removed the redundant 'X' button
        steps={TOUR_STEPS}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#2563eb', 
            backgroundColor: '#0f172a', 
            textColor: '#f8fafc', 
            arrowColor: '#0f172a',
            overlayColor: 'rgba(0, 0, 0, 0.75)',
          },
          tooltipContainer: { textAlign: 'left' },
          buttonNext: { backgroundColor: '#2563eb', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonBack: { color: '#94a3b8', marginRight: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonSkip: { color: '#ef4444', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }
        }}
      />

      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-white/5 bg-[#020617] flex flex-col md:flex-row md:justify-between items-start md:items-end gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2 md:gap-3">
            Position <span className="text-blue-500">Sizing</span>
          </h1>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1.5 md:gap-2">
            <Layers className="w-3 h-3 text-blue-500" /> Kelly Criterion & Risk of Ruin Engine
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden w-full dark-scrollbar">
        
        <section className="w-full lg:flex-[0.35] lg:min-w-[350px] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col bg-[#020617] z-10 shrink-0">
          
          <div className="h-14 lg:h-12 shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-slate-950/30 overflow-x-auto dark-scrollbar">
            <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400 shrink-0 mr-4">Strategy Parameters</h2>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="h-7 text-[9px] md:text-[10px] uppercase font-bold text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" onClick={startManualDemo}>
                    <Presentation className="w-3 h-3 mr-1.5" /> Demo
                </Button>
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
                
                <div className="tour-edge-settings relative z-10">
                  <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
                    <TrendingUp className="w-3 h-3" /> Statistical Edge
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Win Rate (Dec)</label>
                      <Input type="number" step="0.01" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.winRate} onChange={(e) => store.setField("winRate", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Payoff Ratio</label>
                      <Input type="number" step="0.01" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.payoffRatio} onChange={(e) => store.setField("payoffRatio", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

                <div className="tour-capital-settings relative z-10 pt-2">
                  <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
                    <Calculator className="w-3 h-3" /> Capital & Risk
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Starting Capital</label>
                      <Input type="number" step="1000" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.startingCapital} onChange={(e) => store.setField("startingCapital", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Ruin Level (Dec)</label>
                      <Input type="number" step="0.01" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono" value={store.ruinDrawdownPct} onChange={(e) => store.setField("ruinDrawdownPct", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2 pb-6">
                  <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                    <Layers className="w-3 h-3" /> Simulation Engine
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Sim Runs</label>
                      <Input type="number" step="100" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono text-slate-400" value={store.simRuns} onChange={(e) => store.setField("simRuns", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Trades per Run</label>
                      <Input type="number" step="10" className="h-9 md:h-8 bg-white/5 border-white/10 text-xs font-mono text-slate-400" value={store.simTrades} onChange={(e) => store.setField("simTrades", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

             </div>
          </div>

          <div className="shrink-0 p-4 border-t border-white/5 bg-[#020617] relative z-20">
            <Button 
              className="tour-run-button w-full h-12 md:h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider text-xs shadow-lg shadow-blue-900/20" 
              onClick={handleCompute} disabled={store.isLoading}
            >
              {store.isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              RUN MONTE CARLO SIMULATION
            </Button>
          </div>
        </section>

        <section className="tour-results w-full lg:flex-[0.65] flex flex-col bg-[#020617] relative z-0 shrink-0">
          <div className="h-12 shrink-0 border-b border-t lg:border-t-0 border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
              <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">Simulation Results</h2>
          </div>

          {!store.result ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 flex-col min-h-[300px]">
              <Layers className="w-10 h-10 md:w-12 md:h-12 mb-4 opacity-20" />
              <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold">Awaiting Execution</p>
            </div>
          ) : (
            <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 md:p-6 space-y-6 relative pb-24 lg:pb-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3b82f603_0%,_transparent_70%)] pointer-events-none" />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
                {[
                  { label: "Optimal Kelly", val: formatMetric(store.result.kelly_pct, true), color: "text-white" },
                  { label: "Half-Kelly (Rec)", val: formatMetric(store.result.half_kelly_pct, true), color: "text-blue-400" },
                  { label: "Trade Allocation", val: `$${formatMetric(store.result.recommended_alloc_amount)}`, color: "text-blue-400" },
                  { label: `Risk of Ruin`, val: formatMetric(store.result.risk_of_ruin_prob, true), color: store.result.risk_of_ruin_prob > 0.05 ? "text-red-400" : "text-emerald-400" },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-lg">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">{kpi.label}</p>
                    <p className={`text-xl md:text-2xl font-mono font-black ${kpi.color}`}>{kpi.val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-xl relative z-10">
                <div className="h-[300px] md:h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="trade" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(val) => val.replace("Trade ", "")} minTickGap={30} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" domain={['auto', 'auto']} tickFormatter={(val) => `$${val/1000}k`} />
                      <RechartsTooltip cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.2)" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} labelStyle={{ color: "#94a3b8", marginBottom: "4px" }} formatter={(value: any) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Equity"]} />
                      <ReferenceLine y={ruinLevelAmount} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'insideBottomLeft', value: 'Ruin Level', fill: '#ef4444', fontSize: 10 }} />
                      <ReferenceLine y={store.startingCapital} stroke="rgba(255,255,255,0.2)" />
                      {store.result.simulated_paths.map((_, idx) => (
                        <Line key={`run${idx}`} type="monotone" dataKey={`run${idx}`} stroke={idx % 3 === 0 ? "#3b82f6" : idx % 3 === 1 ? "#60a5fa" : "#1d4ed8"} strokeWidth={1.5} strokeOpacity={0.6} dot={false} isAnimationActive={false} />
                      ))}
                    </LineChart>
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