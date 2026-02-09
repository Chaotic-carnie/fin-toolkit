"use client";

import React, { useEffect } from "react";
import { PortfolioHeader } from "@/features/portfolio/components/PortfolioHeader";
import { usePortfolioStore } from "@/features/portfolio/store";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioGrid } from "@/features/portfolio/components/PortfolioGrid";
import { PayoffChart } from "@/features/portfolio/components/PayoffChart";
import { TradeSheet } from "@/features/portfolio/components/TradeSheet";
import { Heatmap } from "@/features/portfolio/components/Heatmap";
import { SimulationControls } from "@/features/portfolio/components/SimulationControls"; // NEW IMPORT

export default function PortfolioPage() {
  const hydrate = usePortfolioStore(state => state.refreshComputation);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="h-screen w-full bg-[#020617] text-white flex flex-col overflow-hidden font-sans">
      
      {/* 1. HEADS-UP DISPLAY */}
      <PortfolioHeader />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANE: Trade Grid (65%) */}
        <section className="flex-[0.65] border-r border-white/5 flex flex-col min-w-0">
          <div className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/50">
            <h2 className="text-sm font-semibold tracking-wide text-slate-300">
              Active Positions
            </h2>
            <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={() => usePortfolioStore.getState().clearPortfolio()} 
                >
                    <Filter className="w-3 h-3 mr-2" />
                    Clear All
                </Button>
                <TradeSheet /> 
            </div>
          </div>
          <div className="flex-1 overflow-y-auto dark-scrollbar bg-[#020617]">
             <PortfolioGrid />
          </div>
        </section>

        {/* RIGHT PANE: Analysis (35%) */}
        <section className="flex-[0.35] flex flex-col bg-[#020617] min-w-[350px]">
            <div className="h-14 shrink-0 border-b border-white/5 flex items-center px-6 bg-slate-950/50">
                <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                Performance Profile
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto dark-scrollbar p-6 space-y-4">
                
                {/* 1. SIMULATION DECK (NEW) */}
                <SimulationControls />

                {/* 2. Payoff Chart Card */}
                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Expiration PnL</h3>
                    </div>
                    <div className="h-48 w-full"> 
                        <PayoffChart />
                    </div>
                </div>

                {/* 3. Heatmap Card */}
                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 shadow-sm pb-8"> 
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Risk Matrix (Spot vs Vol)</h3>
                    </div>
                    <div className="w-full overflow-x-auto dark-scrollbar pb-2">
                        <Heatmap />
                    </div>
                </div>

                <div className="h-8" />
            </div>
        </section>
      </div>
    </div>
  );
}