"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TourProvider, useTour } from '@reactour/tour';
import { Filter, Layers, Presentation, Download, Loader2 } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { PortfolioHeader } from "@/features/portfolio/components/PortfolioHeader";
import { usePortfolioStore } from "@/features/portfolio/store";
import { PortfolioGrid } from "@/features/portfolio/components/PortfolioGrid";
import { PayoffChart } from "@/features/portfolio/components/PayoffChart";
import { TradeSheet } from "@/features/portfolio/components/TradeSheet";
import { Heatmap } from "@/features/portfolio/components/Heatmap";
import { SimulationControls } from "@/features/portfolio/components/SimulationControls";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

// --- NEW 5-STEP TOUR SEQUENCE ---
const TOUR_STEPS = [
  {
    selector: ".tour-add-trade-btn",
    content: () => (
      <div>
        <h3 className="font-bold text-sm text-blue-400 mb-1 uppercase tracking-wider">1. Add a Trade</h3>
        <p className="text-xs text-slate-300 leading-relaxed">Welcome to the Workbench! Click the button highlighted here to open the Trade Desk menu.</p>
      </div>
    ),
  },
  {
    // Highlighting the body allows the user to see the pop-out sheet clearly
    selector: "body", 
    content: () => (
      <div>
        <h3 className="font-bold text-sm text-blue-400 mb-1 uppercase tracking-wider">2. Select an Option</h3>
        <p className="text-xs text-slate-300 leading-relaxed">From the slide-out menu, add any of the 4 available instrument options (Vanilla, Digital, Barrier, or Asian) to your desk, then click Next.</p>
      </div>
    ),
  },
  {
    selector: ".tour-active-positions",
    content: () => (
      <div>
        <h3 className="font-bold text-sm text-blue-400 mb-1 uppercase tracking-wider">3. Active Positions</h3>
        <p className="text-xs text-slate-300 leading-relaxed">Your live trades will appear here. You can adjust quantities, view leg-specific Greeks, or clear the desk.</p>
      </div>
    ),
  },
  {
    selector: ".tour-stats-banner",
    content: () => (
      <div>
        <h3 className="font-bold text-sm text-blue-400 mb-1 uppercase tracking-wider">4. Risk & Greeks</h3>
        <p className="text-xs text-slate-300 leading-relaxed">This top section aggregates your Net Liquidation Value, total portfolio Greeks, and calculates your overall Risk together.</p>
      </div>
    ),
  },
  {
    selector: ".tour-payoff-chart",
    content: () => (
      <div>
        <h3 className="font-bold text-sm text-blue-400 mb-1 uppercase tracking-wider">5. Payoff & PnL</h3>
        <p className="text-xs text-slate-300 leading-relaxed">Scroll down to see your exact payoff curve. It visually models your expected Profit and Loss across a range of underlying spot prices.</p>
      </div>
    ),
  },
  {
    selector: ".tour-risk-matrix",
    content: () => (
      <div>
        <h3 className="font-bold text-sm text-blue-400 mb-1 uppercase tracking-wider">6. Scenario Heatmap</h3>
        <p className="text-xs text-slate-300 leading-relaxed">Finally, stress-test your portfolio. This matrix calculates your exact PnL under simultaneous Spot and Volatility shocks.</p>
      </div>
    ),
  }
];

function PortfolioContent() {
  // FIX 1: Grab isOpen and currentStep from the hook
  const { setIsOpen, setCurrentStep, isOpen, currentStep } = useTour();
  const hydrate = usePortfolioStore(state => state.refreshComputation);
  const trades = usePortfolioStore(state => state.trades);
  const clearPortfolio = usePortfolioStore(state => state.clearPortfolio);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
    setMounted(true);
    
    if (searchParams?.get("demo") === "true") {
      clearPortfolio(); 
      setTimeout(() => {
        setCurrentStep(0);
        setIsOpen(true);
      }, 500);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [hydrate, searchParams, clearPortfolio, setCurrentStep, setIsOpen]);

  useEffect(() => {
    // If tour is running, we are on Step 2 (index 1), and a trade is successfully added
    if (isOpen && currentStep === 1 && trades.length > 0) {
      // Wait 400ms for the slide-out menu to close, then jump to Step 3 (index 2)
      setTimeout(() => setCurrentStep(2), 400); 
    }
  }, [trades.length, isOpen, currentStep, setCurrentStep]);

  const startManualDemo = () => {
    clearPortfolio(); 
    setCurrentStep(0);
    setIsOpen(true);
  };

  const handleExportPDF = async () => {
    const printArea = containerRef.current;
    if (!printArea) {
      toast.error("Error: Could not find the dashboard area to print.");
      return;
    }

    try {
      setIsExporting(true);
      toast.info("Generating PDF report...");

      const scrollableElements = printArea.querySelectorAll('.js-print-scroll') as NodeListOf<HTMLElement>;
      const originalStyles: { element: HTMLElement, height: string, overflow: string }[] = [];

      scrollableElements.forEach((el) => {
        originalStyles.push({
          element: el,
          height: el.style.height,
          overflow: el.style.overflow
        });
        el.style.height = 'auto';      
        el.style.overflow = 'visible'; 
      });

      const mainOriginalHeight = printArea.style.height;
      const mainOriginalOverflow = printArea.style.overflow;
      printArea.style.height = 'auto';
      printArea.style.overflow = 'visible';

      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(printArea, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#020617", 
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === "true") {
            return false;
          }
          return true;
        }
      });

      originalStyles.forEach((item) => {
        item.element.style.height = item.height;
        item.element.style.overflow = item.overflow;
      });
      
      printArea.style.height = mainOriginalHeight;
      printArea.style.overflow = mainOriginalOverflow;

      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (printArea.offsetHeight * pdfWidth) / printArea.offsetWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.setFillColor(2, 6, 23); 
      pdf.rect(0, 0, pdfWidth, pageHeight, "F");
      pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.setFillColor(2, 6, 23); 
        pdf.rect(0, 0, pdfWidth, pageHeight, "F");
        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Portfolio_Risk_Report_${dateStr}.pdf`);
      toast.success("PDF Exported Successfully");

    } catch (error) {
      console.error("PDF Export failed:", error);
      toast.error("Failed to generate PDF. See console.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div ref={containerRef} id="portfolio-export-area" className="flex flex-col w-full bg-[#020617] text-white font-sans h-[calc(100dvh-64px)] overflow-y-auto lg:overflow-hidden">
      
      {/* --- Header Section --- */}
      <div className="shrink-0 px-4 lg:px-6 py-4 border-b border-white/5 bg-[#020617] flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2 md:gap-3">
            Portfolio <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1.5 md:gap-2">
            <Layers className="w-3 h-3 text-blue-500" /> Real-time Risk & PnL Engine
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
           <Button 
             variant="outline" 
             size="sm" 
             className="flex-1 sm:flex-none h-8 text-[9px] uppercase font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
             onClick={handleExportPDF}
             disabled={isExporting}
             data-html2canvas-ignore="true"
           >
             {isExporting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Download className="w-3 h-3 mr-1.5" />}
             {isExporting ? "Saving..." : "Export"}
           </Button>

           <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-8 text-[9px] uppercase font-bold text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" onClick={startManualDemo}>
             <Presentation className="w-3 h-3 mr-1.5" /> Demo
           </Button>
           
           <span className="hidden lg:flex h-8 items-center text-[9px] font-mono text-slate-600 bg-white/5 px-3 rounded border border-white/5">
             LIVE ENV
           </span>
        </div>
      </div>

      {/* --- Risk Matrix Banner --- */}
      <div className="tour-stats-banner w-full border-b border-white/5 shrink-0 bg-[#020617] z-10">
        <div className="px-4 lg:px-6 py-4">
          <PortfolioHeader />
        </div>
      </div>

      {/* --- Main Content Split --- */}
      <div className="flex flex-col lg:flex-row lg:flex-1 min-h-0 w-full relative z-0">
        
        {/* === LEFT PANEL (Active Positions) === */}
        <section className="tour-active-positions flex flex-col w-full lg:w-[65%] lg:h-full border-b lg:border-b-0 lg:border-r border-white/5 bg-[#020617]">
          
          <div className="shrink-0 h-12 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-slate-950/30">
            <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Active Positions
            </h2>
            <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[9px] uppercase font-bold text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors"
                  onClick={() => clearPortfolio()} 
                >
                    <Filter className="w-3 h-3 mr-1.5" />
                    Clear Desk
                </Button>
                {/* The specific target for Step 1 */}
                {/* FIX 3: Catch the click and manually advance the tour to Step 2 */}
                <div 
                  className="tour-add-trade-btn"
                  onClick={() => {
                    if (isOpen && currentStep === 0) {
                      // 100ms delay ensures the menu animation starts before the tour moves
                      setTimeout(() => setCurrentStep(1), 100); 
                    }
                  }}
                >
                  <TradeSheet /> 
                </div>
            </div>
          </div>
          
          <div className="flex-1 lg:overflow-y-auto dark-scrollbar relative p-4 lg:p-0 js-print-scroll pb-10 lg:pb-32">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#1e3a8a05_0%,_transparent_50%)] pointer-events-none" />
              <div className="relative z-10 h-full">
                 <PortfolioGrid />
              </div>
          </div>
        </section>

        {/* === RIGHT PANEL (Risk Profile) === */}
        <section className="flex flex-col w-full lg:w-[35%] lg:h-full bg-[#020617]">
            
            <div className="shrink-0 h-12 border-b border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
                <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Risk Profile
                </h2>
            </div>

            <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6 pb-20 lg:pb-32 relative z-0 js-print-scroll">
                
                <SimulationControls />

                {/* The specific wrapper for Step 5 that groups both graph and table together */}
                <div className="space-y-6 w-full">
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

            </div>
        </section>
      </div>
    </div>
  );
}

// --- NEW WRAPPER COMPONENT: INJECTS THE TOUR CONTEXT ---
export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#020617] text-slate-500 font-mono text-sm">LOADING PORTFOLIO ENGINE...</div>}>
      <TourProvider 
        steps={TOUR_STEPS}
        onClickMask={() => {}} 
        styles={{
          popover: (base) => ({
            ...base,
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            padding: '24px'
          }),
          maskArea: (base) => ({ ...base, rx: 8 }),
          badge: (base) => ({ ...base, backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: 'bold' }),
          close: (base) => ({ ...base, color: '#64748b', right: 16, top: 16 }),
          dot: (base, state) => ({
            ...base,
            backgroundColor: state?.current ? '#3b82f6' : '#334155',
          }),
        }}
      >
        <PortfolioContent />
      </TourProvider>
    </Suspense>
  );
}