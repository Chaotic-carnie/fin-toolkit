"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { PortfolioHeader } from "@/features/portfolio/components/PortfolioHeader";
import { usePortfolioStore } from "@/features/portfolio/store";
import { Filter, Layers, Presentation } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { PortfolioGrid } from "@/features/portfolio/components/PortfolioGrid";
import { PayoffChart } from "@/features/portfolio/components/PayoffChart";
import { TradeSheet } from "@/features/portfolio/components/TradeSheet";
import { Heatmap } from "@/features/portfolio/components/Heatmap";
import { SimulationControls } from "@/features/portfolio/components/SimulationControls";

// --- Updated Tour Steps ---
const TOUR_STEPS: Step[] = [
  {
    target: ".tour-add-trade-btn",
    content: "Welcome to the Portfolio Workbench! Click here to instantly load a sample trade onto your desk.",
    title: "1. Load a Trade",
    disableBeacon: true,
    spotlightClicks: true, // Forces the user to click the button!
    hideFooter: true,      // Hides "Next" so they can't skip adding the trade
  },
  {
    target: ".tour-active-positions",
    content: "Your trade is now live. You can adjust the quantity, view the leg's specific Delta and Vega, or remove it.",
    title: "2. Trade Desk",
    placement: "right",
  },
  {
    target: ".tour-stats-banner",
    content: "Notice how the Global Risk Matrix instantly updated? It aggregates your Net Liquidation Value, total Greeks, and calculates your 95% VaR.",
    title: "3. Global Risk Matrix",
    placement: "bottom",
  },
  {
    target: ".tour-payoff-chart",
    content: "Scroll down to see your exact payoff curve. It models your expected PnL across a range of underlying spot prices.",
    title: "4. Payoff & PnL",
    placement: "left",
  },
  {
    target: ".tour-risk-matrix",
    content: "Finally, stress-test your portfolio. This matrix shows your PnL under simultaneous Spot and Volatility shocks.",
    title: "5. Scenario Heatmap",
    placement: "left",
  }
];

export default function PortfolioPage() {
  const hydrate = usePortfolioStore(state => state.refreshComputation);
  const trades = usePortfolioStore(state => state.trades);
  const clearPortfolio = usePortfolioStore(state => state.clearPortfolio);
  
  // --- Joyride State ---
  const searchParams = useSearchParams();
  const router = useRouter();
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    hydrate();
    setMounted(true);
    
    // Auto-start tour if coming from homepage
    if (searchParams?.get("demo") === "true") {
      clearPortfolio(); // Clear it so they start with an empty desk!
      setTimeout(() => {
        setStepIndex(0);
        setRunTour(true);
      }, 500);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [hydrate, searchParams, clearPortfolio]);

  // ADVANCE FROM STEP 1 TO STEP 2 WHEN TRADE IS ADDED
  useEffect(() => {
    if (runTour && stepIndex === 0 && trades.length > 0) {
      setTimeout(() => setStepIndex(1), 300); // Small delay to let the DOM paint the grid
    }
  }, [trades.length, runTour, stepIndex]);

  // Dynamic Scroll Fix
  useEffect(() => {
    if (runTour && mounted && stepIndex > 0) { // Don't scroll on step 0, it's centered already
      const targetSelector = TOUR_STEPS[stepIndex]?.target as string;
      if (targetSelector) {
        setTimeout(() => {
          const element = document.querySelector(targetSelector) as HTMLElement;
          if (element) {
            let container = element.parentElement;
            while (container && container.scrollHeight <= container.clientHeight && container.tagName !== 'BODY') {
              container = container.parentElement;
            }
            if (container && container.tagName !== 'BODY') {
              const containerRect = container.getBoundingClientRect();
              const elementRect = element.getBoundingClientRect();
              const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 100;
              container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
            }
          }
        }, 150); 
      }
    }
  }, [stepIndex, runTour, mounted]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any) || action === ACTIONS.CLOSE) {
      setRunTour(false);
      setStepIndex(0);
      return; 
    } 
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) setStepIndex(index + 1);
      else if (action === ACTIONS.PREV) setStepIndex(index - 1);
    }
  };

  const startManualDemo = () => {
    clearPortfolio(); // Clear it so they start with an empty desk!
    setStepIndex(0);
    setRunTour(true);
  };

  if (!mounted) return null;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#020617] text-white font-sans pt-28 lg:pt-2">
      
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        stepIndex={stepIndex} 
        run={runTour}
        disableScrolling={true} 
        showProgress
        showSkipButton
        hideCloseButton={true}
        steps={TOUR_STEPS}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#2563eb', 
            backgroundColor: '#0f172a', 
            textColor: '#f8fafc', 
            arrowColor: '#0f172a',
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            spotlightPadding: 6,
          },
          tooltipContainer: { textAlign: 'left' },
          buttonNext: { backgroundColor: '#2563eb', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonBack: { color: '#94a3b8', marginRight: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonSkip: { color: '#ef4444', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }
        }}
      />

      {/* 2. WORKSPACE TITLE BAR */}
      <div className="shrink-0 px-4 lg:px-6 py-4 border-b border-white/5 bg-[#020617] flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2 md:gap-3">
            Portfolio <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1.5 md:gap-2">
            <Layers className="w-3 h-3 text-blue-500" /> Real-time Risk & PnL Engine
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
           <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase font-bold text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" onClick={startManualDemo}>
              <Presentation className="w-3 h-3 mr-1.5" /> Demo
           </Button>
           <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/5 hidden md:block">
             LIVE ENVIRONMENT
           </span>
        </div>
      </div>

      {/* 3. GLOBAL NAV (Stats Banner) */}
      <div className="tour-stats-banner w-full overflow-x-auto dark-scrollbar border-b border-white/5 shrink-0 z-10 relative bg-[#020617]">
        <div className="min-w-[800px]">
          <PortfolioHeader />
        </div>
      </div>

      {/* 4. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden w-full dark-scrollbar mb-20">
        
        {/* LEFT PANE: Trade Grid (65%) */}
        <section className="tour-active-positions w-full lg:w-auto lg:flex-[0.65] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col min-w-0 shrink-0 bg-[#020617] relative z-0">
          <div className="h-12 shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-slate-950/30">
            <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Active Positions
            </h2>
            <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[9px] md:text-[10px] uppercase font-bold text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors"
                  onClick={() => clearPortfolio()} 
                >
                    <Filter className="w-3 h-3 mr-1.5" />
                    Clear Desk
                </Button>
                <TradeSheet /> 
            </div>
          </div>
          
          <div className="flex-1 lg:overflow-y-auto dark-scrollbar bg-[#020617] relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#1e3a8a05_0%,_transparent_50%)] pointer-events-none" />
             <div className="relative z-10 p-4 lg:p-0 h-full">
                <PortfolioGrid />
             </div>
          </div>
        </section>

        {/* RIGHT PANE: Analysis (35%) */}
        <section className="w-full lg:w-auto lg:flex-[0.35] flex flex-col min-w-0 shrink-0 bg-[#020617]">
            <div className="h-12 shrink-0 border-b border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
                <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Risk Profile
                </h2>
            </div>

            <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6 pb-24 lg:pb-6 relative z-0">
                
                <SimulationControls />

                <div className="tour-payoff-chart bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Expiration PnL
                        </h3>
                    </div>
                    <div className="h-56 md:h-48 w-full relative"> 
                        <PayoffChart />
                    </div>
                </div>

                <div className="tour-risk-matrix bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-5 shadow-xl"> 
                    <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Risk Matrix
                          </h3>
                    </div>
                    <div className="w-full overflow-x-auto dark-scrollbar pb-2">
                        <Heatmap />
                    </div>
                </div>

            </div>
        </section>

      </div>
    </div>
  );
}