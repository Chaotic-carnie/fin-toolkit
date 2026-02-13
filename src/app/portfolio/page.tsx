"use client";

import React, { useEffect } from "react";
import { PortfolioHeader } from "@/features/portfolio/components/PortfolioHeader";
import { usePortfolioStore } from "@/features/portfolio/store";
import { Filter, Layers } from "lucide-react"; // Added Layers icon for title
import { Button } from "@/components/ui/button";
import { PortfolioGrid } from "@/features/portfolio/components/PortfolioGrid";
import { PayoffChart } from "@/features/portfolio/components/PayoffChart";
import { TradeSheet } from "@/features/portfolio/components/TradeSheet";
import { Heatmap } from "@/features/portfolio/components/Heatmap";
import { SimulationControls } from "@/features/portfolio/components/SimulationControls";

export default function PortfolioPage() {
  const hydrate = usePortfolioStore(state => state.refreshComputation);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="h-screen w-full bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      
      

      {/* 2. WORKSPACE TITLE BAR (NEW - Matches Tax/Macro Theme) */}
      <div className="shrink-0 px-6 py-4 border-b border-white/5 bg-[#020617] flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
            Portfolio <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-2">
            <Layers className="w-3 h-3 text-blue-500" /> Real-time Risk & PnL Engine
          </p>
        </div>
        
        {/* Optional: Summary stats or mode indicator can go here */}
        <div className="hidden md:block">
           <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/5">
             LIVE ENVIRONMENT
           </span>
        </div>
      </div>
      {/* 1. GLOBAL NAV (Existing) */}
      <PortfolioHeader />
      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANE: Trade Grid (65%) */}
        <section className="flex-[0.65] border-r border-white/5 flex flex-col min-w-0 bg-[#020617]">
          <div className="h-12 shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/30">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Active Positions
            </h2>
            <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors"
                  onClick={() => usePortfolioStore.getState().clearPortfolio()} 
                >
                    <Filter className="w-3 h-3 mr-1.5" />
                    Clear Desk
                </Button>
                <TradeSheet /> 
            </div>
          </div>
          <div className="flex-1 overflow-y-auto dark-scrollbar bg-[#020617] relative">
             {/* Radial gradient backing for the grid area */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#1e3a8a05_0%,_transparent_50%)] pointer-events-none" />
             <div className="relative z-10">
                <PortfolioGrid />
             </div>
          </div>
        </section>

        {/* RIGHT PANE: Analysis (35%) */}
        <section className="flex-[0.35] flex flex-col bg-[#020617] min-w-[350px] border-l border-white/5">
            <div className="h-12 shrink-0 border-b border-white/5 flex items-center px-6 bg-slate-950/30">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Risk Profile
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto dark-scrollbar p-6 space-y-6">
                
                {/* 1. SIMULATION DECK */}
                <SimulationControls />

                {/* 2. Payoff Chart Card */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Expiration PnL
                        </h3>
                    </div>
                    <div className="h-48 w-full relative"> 
                        <PayoffChart />
                    </div>
                </div>

                {/* 3. Heatmap Card */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 shadow-xl pb-8"> 
                    <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Risk Matrix
                          </h3>
                    </div>
                    <div className="w-full overflow-x-auto dark-scrollbar pb-2">
                        <Heatmap />
                    </div>
                </div>

                <div className="h-12" />
            </div>
        </section>
      </div>
    </div>
  );
}