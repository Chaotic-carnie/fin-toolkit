"use client";

// 1. Move imports to the top
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import nextDynamic from "next/dynamic";
import type { Step, CallBackProps } from "react-joyride";
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

// Forces Next.js to ignore this during the build phase
export const dynamic = "force-dynamic";

const Joyride = nextDynamic(() => import("react-joyride"), { ssr: false });

const TOUR_STEPS: Step[] = [
  {
    target: ".tour-add-trade-btn",
    content: "Welcome to the Portfolio Workbench! Click here to instantly load a sample trade onto your desk.",
    title: "1. Load a Trade",
    disableBeacon: true,
    spotlightClicks: true, 
    hideFooter: true,      
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

// --- 2. RENAME MAIN LOGIC COMPONENT (Internal Only) ---
function PortfolioContent() {
  const hydrate = usePortfolioStore(state => state.refreshComputation);
  const trades = usePortfolioStore(state => state.trades);
  const clearPortfolio = usePortfolioStore(state => state.clearPortfolio);
  
  // Hooks are safe here because this component is wrapped below
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
    setMounted(true);
    
    if (searchParams?.get("demo") === "true") {
      clearPortfolio(); 
      setTimeout(() => {
        setStepIndex(0);
        setRunTour(true);
      }, 500);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [hydrate, searchParams, clearPortfolio]);

  useEffect(() => {
    if (runTour && stepIndex === 0 && trades.length > 0) {
      setTimeout(() => setStepIndex(1), 300); 
    }
  }, [trades.length, runTour, stepIndex]);

  useEffect(() => {
    if (runTour && mounted && stepIndex > 0) {
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
    // @ts-ignore - Joyride types are tricky sometimes
    if (['finished', 'skipped'].includes(status) || action === 'close') {
      setRunTour(false);
      setStepIndex(0);
      return; 
    } 
    // @ts-ignore
    if (type === 'step:after') {
      // @ts-ignore
      if (action === 'next') setStepIndex(index + 1);
      // @ts-ignore
      else if (action === 'prev') setStepIndex(index - 1);
    }
  };

  const startManualDemo = () => {
    clearPortfolio(); 
    setStepIndex(0);
    setRunTour(true);
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
    <div ref={containerRef} id="portfolio-export-area" className="h-screen w-full flex flex-col overflow-hidden bg-[#020617] text-white font-sans pt-28 lg:pt-2">
      
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
           <Button 
             variant="outline" 
             size="sm" 
             className="h-7 text-[9px] uppercase font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
             onClick={handleExportPDF}
             disabled={isExporting}
             data-html2canvas-ignore="true"
           >
             {isExporting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Download className="w-3 h-3 mr-1.5" />}
             {isExporting ? "Generating..." : "Export Report"}
           </Button>

           <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase font-bold text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" onClick={startManualDemo}>
             <Presentation className="w-3 h-3 mr-1.5" /> Demo
           </Button>
           <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/5 hidden md:block">
             LIVE ENVIRONMENT
           </span>
        </div>
      </div>

      <div className="tour-stats-banner w-full overflow-x-auto dark-scrollbar border-b border-white/5 shrink-0 z-10 relative bg-[#020617]">
        <div className="min-w-[800px]">
          <PortfolioHeader />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden w-full dark-scrollbar mb-20">
        
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
          
          <div className="flex-1 lg:overflow-y-auto dark-scrollbar bg-[#020617] relative js-print-scroll">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#1e3a8a05_0%,_transparent_50%)] pointer-events-none" />
              <div className="relative z-10 p-4 lg:p-0 h-full">
                 <PortfolioGrid />
              </div>
          </div>
        </section>

        <section className="w-full lg:w-auto lg:flex-[0.35] flex flex-col min-w-0 shrink-0 bg-[#020617]">
            <div className="h-12 shrink-0 border-b border-white/5 flex items-center px-4 lg:px-6 bg-slate-950/30">
                <h2 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Risk Profile
                </h2>
            </div>

            <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-4 lg:p-6 space-y-6 pb-24 lg:pb-6 relative z-0 js-print-scroll">
                
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

// --- 3. THE NEW WRAPPER (This is what Next.js sees) ---
export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#020617] text-slate-500 font-mono text-sm">LOADING PORTFOLIO ENGINE...</div>}>
      <PortfolioContent />
    </Suspense>
  );
}