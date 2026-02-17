"use client";

// 1. Add Suspense to imports
import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { recommendStrategies, normalizeView, pnlMetrics } from "~/features/strategy/engine";
import { computePortfolioMetrics } from "~/features/portfolio/engine";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Settings2, Activity, TrendingUp, Target, ListChecks, BarChart3, Info, Layers } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { usePortfolioStore } from "~/features/portfolio/store"; 
import { useSearchParams, useRouter } from "next/navigation";
import nextDynamic from "next/dynamic"; // <--- 2. Rename this import
import type { Step, CallBackProps } from "react-joyride";

// Forces Next.js to ignore this during the build phase
const Joyride = nextDynamic(() => import("react-joyride"), { ssr: false });
import { Presentation } from "lucide-react";
import { Download, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image"; 
import { toast } from "sonner";

// 3. Add Force Dynamic
export const dynamic = "force-dynamic";

// --- Tour Steps ---
const TOUR_STEPS: Step[] = [
  {
    target: ".tour-market-inputs",
    content: "Start by defining the current market environment. Set the spot price, implied volatility, and risk-free rate.",
    title: "1. Market Environment",
    disableBeacon: true,
    placement: "bottom", 
  },
  {
    target: ".tour-view-settings",
    content: "Define your market thesis. Are you bullish, bearish, or neutral? Enter your expected move percentage and your investment horizon.",
    title: "2. Your View",
    placement: "bottom",
  },
  {
    target: ".tour-constraints",
    content: "Set your risk parameters here. Do you want strictly defined-risk trades? What's your max acceptable loss?",
    title: "3. Constraints",
    placement: "top", 
  },
  {
    target: ".tour-compute-button",
    content: "Click here to generate strategies! The engine will scan thousands of combinations to find structures that perfectly match your view.",
    title: "4. Run Engine",
    spotlightClicks: true, 
    hideFooter: true,      
    placement: "top",      
  },
  {
    target: ".tour-candidate-results",
    content: "These are your optimal candidate structures! Select one, then click the 'Scenarios' tab to see its payoff profile and risk matrix.",
    title: "5. Analyze Candidates",
    placement: "top",
  }
];

// --- 4. MAIN LOGIC (Renamed to StrategyContent) ---
function StrategyContent() {
  // 1. Inputs
  const [market, setMarket] = useState({ spot: 100, vol: 0.20, rate: 0.03, dividend: 0.0, skew: 0.15 });
  const [view, setView] = useState({ 
    direction: "bullish" as "bullish"|"bearish"|"neutral", moveMode: "pct" as "pct"|"target",
    movePct: 5 as string | number, targetPrice: "" as string | number,
    horizonDays: 30 as string | number, volView: "flat" as "flat"|"up"|"down", 
    volShift: 0.0 as string | number, confidence: "" as ""|"low"|"medium"|"high", event: false 
  });
  const [constraints, setConstraints] = useState({ 
    maxLoss: "" as string | number, maxLegs: 4, definedRiskOnly: true, allowMultiExpiry: true, incomeVsConvexity: 0.5 
  });
  const [gen, setGen] = useState({ 
    method: "black_scholes" as "black_scholes"|"binomial_crr", strikeStep: 1 as string | number, 
    expiryDays: 90 as string | number, longExpiryDays: 120 as string | number, widthPct: "" as string | number, treeSteps: 200 
  });

  const [isComputing, setIsComputing] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selIdx, setSelIdx] = useState(0);
  
  const [isHydrated, setIsHydrated] = useState(false);

  // --- Joyride State ---
  const searchParams = useSearchParams();
  const router = useRouter();
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Restore state from previous session
  useEffect(() => {
    const saved = sessionStorage.getItem("strategyBuilderState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMarket(parsed.market);
        setView(parsed.view);
        setConstraints(parsed.constraints);
        setGen(parsed.gen);
        if (parsed.hasRun) setHasRun(true);
        if (parsed.candidates) setCandidates(parsed.candidates);
        if (parsed.selIdx !== undefined) setSelIdx(parsed.selIdx);
      } catch (e) {
        console.error("Failed to parse saved strategy state");
      }
    }
    setIsHydrated(true);

    if (searchParams?.get("demo") === "true") {
      setTimeout(() => {
        setStepIndex(0);
        setRunTour(true);
      }, 500);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem("strategyBuilderState", JSON.stringify({
        market, view, constraints, gen, hasRun, candidates, selIdx
      }));
    }
  }, [market, view, constraints, gen, hasRun, candidates, selIdx, isHydrated]);

  // NEW SCROLL FIX
  useEffect(() => {
    if (runTour) {
      const targetSelector = TOUR_STEPS[stepIndex]?.target as string;
      if (targetSelector) {
        setTimeout(() => {
          const element = document.querySelector(targetSelector) as HTMLElement;
          const sidebarScroll = document.getElementById('sidebar-scroll');
          const mainScroll = document.getElementById('main-scroll');
          
          if (element) {
            const container = (sidebarScroll && sidebarScroll.scrollHeight > sidebarScroll.clientHeight) 
                              ? sidebarScroll 
                              : mainScroll;
            
            if (container) {
              const containerRect = container.getBoundingClientRect();
              const elementRect = element.getBoundingClientRect();
              const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 80;
              container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
            }
          }
        }, 100); 
      }
    }
  }, [stepIndex, runTour]);

  // Safe Parsing for Engine
  const parsedMarket = { spot: Number(market.spot)||0, vol: Number(market.vol)||0, rate: Number(market.rate)||0, dividend: Number(market.dividend)||0, skew: Number(market.skew)||0 };
  const parsedView = {
    ...view, targetPrice: view.moveMode === "target" ? Number(view.targetPrice) || null : null,
    movePct: view.moveMode === "pct" ? Number(view.movePct) || 0 : undefined,
    horizonDays: Number(view.horizonDays) || 30, volShift: Number(view.volShift) || 0
  };
  const parsedConstraints = { ...constraints, maxLoss: constraints.maxLoss === "" ? null : Number(constraints.maxLoss) };
  const parsedGen = {
    ...gen, strikeStep: Number(gen.strikeStep) || 1, expiryDays: Number(gen.expiryDays) || 90,
    longExpiryDays: Number(gen.longExpiryDays) || 120, widthPct: gen.widthPct === "" ? null : Number(gen.widthPct)
  };

  const active = candidates[selIdx];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;
    // @ts-ignore
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
    setStepIndex(0);
    setRunTour(true);
  };

  const handleCompute = () => {
    setIsComputing(true);
    setHasRun(true);

    const worker = new Worker(new URL("../../features/strategy/worker.ts", import.meta.url));

    worker.onmessage = (e) => {
      if (e.data.error) {
        console.error("Engine Error:", e.data.error);
        alert("Failed to compute strategies. Check parameters.");
      } else {
        setCandidates(e.data.candidates);
        setSelIdx(0); 
      }
      setIsComputing(false);
      worker.terminate(); 

      // ADVANCE TOUR AFTER RUN COMPLETES
      if (runTour && stepIndex === 3) {
        setTimeout(() => setStepIndex(4), 400); 
      }
    };

    worker.onerror = (err) => {
      console.error("Worker Thread Error:", err);
      setIsComputing(false);
      worker.terminate();
    };

    worker.postMessage({
      market: parsedMarket,
      view: parsedView,
      gen: parsedGen,
      constraints: parsedConstraints
    });
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = () => {
    setIsGeneratingPdf(true); 
  };

  useEffect(() => {
    if (!isGeneratingPdf) return;

    const generate = async () => {
      const reportContainer = reportRef.current;
      if (!reportContainer) return;

      try {
        toast.info("Generating report... (Please wait)");
        
        await new Promise(resolve => setTimeout(resolve, 2500));

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const sections = reportContainer.querySelectorAll(".report-section");

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement;
          
          await new Promise(resolve => setTimeout(resolve, 100));

          const dataUrl = await toJpeg(section, {
            quality: 0.8,
            pixelRatio: 2,
            backgroundColor: "#020617",
            width: 1000,
            style: { 
                fontFamily: 'sans-serif',
                overflow: 'hidden' 
            }
          });

          if (!dataUrl || dataUrl === 'data:,') {
             console.warn(`Skipping empty section index ${i}`);
             continue;
          }

          const imgProps = pdf.getImageProperties(dataUrl);
          const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
          
          let heightLeft = imgHeight;
          let position = 0;
          let firstPageOfSection = true;

          while (heightLeft > 0) {
            if (i > 0 || !firstPageOfSection) {
               pdf.addPage();
            }
            
            pdf.setFillColor(2, 6, 23);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");

            pdf.addImage(dataUrl, "JPEG", 0, position, pageWidth, imgHeight);
            
            heightLeft -= pageHeight;
            position -= pageHeight; 
            firstPageOfSection = false;
          }
        }

        const dateStr = new Date().toISOString().split('T')[0];
        pdf.save(`Strategy_Report_${dateStr}.pdf`);
        toast.success("PDF Exported Successfully");

      } catch (err) {
        console.error("PDF Gen Error:", err);
        toast.error("Failed to generate report. Check console.");
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    generate();
  }, [isGeneratingPdf]);

    if (!isHydrated) return null;

  return (
<main className="flex flex-col h-screen overflow-hidden pt-28 lg:pt-2 bg-[#020617] text-white font-sans">      
      {/* --- JOYRIDE COMPONENT --- */}
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
            spotlightPadding: 8, 
          },
          tooltipContainer: { textAlign: 'left' },
          buttonNext: { backgroundColor: '#2563eb', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonBack: { color: '#94a3b8', marginRight: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonSkip: { color: '#ef4444', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }
        }}
      />

      <div id="main-scroll" className="flex-1 flex flex-col xl:flex-row dark-scrollbar overflow-y-auto xl:overflow-hidden w-full">
        
        {/* ================= LEFT SIDEBAR (INPUTS) ================= */}
        <aside className="w-full xl:w-[350px] border-b xl:border-b-0 xl:border-r border-slate-800/60 bg-[#020617] flex flex-col shrink-0 relative z-10">
          <div className="p-4 md:p-5 border-b border-slate-800/60 shrink-0 bg-slate-950/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-500" /> Builder Config
              </h2>
              <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase font-bold text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" onClick={startManualDemo}>
                <Presentation className="w-3 h-3 mr-1.5" /> Demo
              </Button>
            </div>
            
            <div className="tour-compute-button rounded-lg">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 xl:h-9 tracking-widest text-[11px] uppercase" 
                onClick={handleCompute} disabled={isComputing}
              >
                {isComputing ? "Computing..." : "Find Candidates"}
              </Button>
            </div>
          </div>

          <div id="sidebar-scroll" className="flex-1 xl:overflow-y-auto p-4 md:p-5 space-y-6 dark-scrollbar bg-transparent xl:bg-slate-950/20 scroll-smooth js-print-scroll">

            <section className="tour-market-inputs rounded-lg p-2 -mt-2 pt-2 -mx-2">
              <SidebarHeader label="Market Inputs" icon={<Activity className="w-3.5 h-3.5"/>} color="text-blue-400" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <CommitField label="Spot" value={market.spot} onCommit={(v: any) => setMarket({...market, spot: v})} />
                <CommitField label="Vol (σ)" value={market.vol} onCommit={(v: any) => setMarket({...market, vol: v})} />
                <CommitField label="Rate (r)" value={market.rate} onCommit={(v: any) => setMarket({...market, rate: v})} />
                <CommitField label="Dividend (q)" value={market.dividend} onCommit={(v: any) => setMarket({...market, dividend: v})} />
                <CommitField label="Skew factor" value={market.skew} onCommit={(v: any) => setMarket({...market, skew: v})} />
              </div>
            </section>

            <section className="pt-4 border-t border-slate-800/40 tour-view-settings rounded-lg p-2 -mx-2">
              <SidebarHeader label="View & Horizon" icon={<TrendingUp className="w-3.5 h-3.5"/>} color="text-emerald-400" />
              <div className="space-y-4 mt-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Direction</label>
                  <select className="w-full bg-[#020617] border border-slate-800 rounded h-10 xl:h-9 text-xs px-2 text-white outline-none focus:border-blue-500" value={view.direction} onChange={e => setView({...view, direction: e.target.value as any})}>
                    <option value="bullish">Bullish</option><option value="neutral">Neutral</option><option value="bearish">Bearish</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Move input</label>
                    <select className="w-full bg-[#020617] border border-slate-800 rounded h-10 xl:h-9 text-xs px-2 text-white outline-none focus:border-blue-500" value={view.moveMode} onChange={e => setView({...view, moveMode: e.target.value as any})}>
                      <option value="pct">% Move</option><option value="target">Target Price</option>
                    </select>
                  </div>
                  <CommitField label={view.moveMode === "target" ? "Target" : "Move (%)"} value={view.moveMode === "target" ? view.targetPrice : view.movePct} onCommit={(v: any) => setView({...view, [view.moveMode === "target" ? 'targetPrice' : 'movePct']: v})} />
                </div>
                <CommitField label="Horizon (days)" value={view.horizonDays} onCommit={(v: any) => setView({...view, horizonDays: v})} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">IV View</label>
                    <select className="w-full bg-[#020617] border border-slate-800 rounded h-10 xl:h-9 text-xs px-2 text-white outline-none focus:border-blue-500" value={view.volView} onChange={e => setView({...view, volView: e.target.value as any})}>
                      <option value="flat">Flat</option><option value="up">Up</option><option value="down">Down</option>
                    </select>
                  </div>
                  <CommitField label="IV shift" value={view.volShift} onCommit={(v: any) => setView({...view, volShift: v})} />
                </div>
              </div>
            </section>

            <section className="pt-4 border-t border-slate-800/40 tour-constraints rounded-lg p-2 -mx-2 mb-10">
              <SidebarHeader label="Constraints" icon={<Target className="w-3.5 h-3.5"/>} color="text-rose-400" />
              <div className="grid grid-cols-2 gap-3 mt-3 mb-4">
                <CommitField label="Max loss" value={constraints.maxLoss} onCommit={(v: any) => setConstraints({...constraints, maxLoss: v === 0 ? "" : v})} placeholder="opt" />
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Max legs</label>
                  <select className="w-full bg-[#020617] border border-slate-800 rounded h-10 xl:h-9 text-xs px-2 text-white outline-none focus:border-blue-500" value={constraints.maxLegs} onChange={e => setConstraints({...constraints, maxLegs: Number(e.target.value)})}>
                    <option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option>
                  </select>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="dr" checked={constraints.definedRiskOnly} onChange={e => setConstraints({...constraints, definedRiskOnly: e.target.checked})} className="accent-blue-500 w-4 h-4 xl:w-3.5 xl:h-3.5" />
                  <label htmlFor="dr" className="text-xs xl:text-[11px] text-slate-300">Defined-risk only</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="me" checked={constraints.allowMultiExpiry} onChange={e => setConstraints({...constraints, allowMultiExpiry: e.target.checked})} className="accent-blue-500 w-4 h-4 xl:w-3.5 xl:h-3.5" />
                  <label htmlFor="me" className="text-xs xl:text-[11px] text-slate-300">Allow multi-expiry</label>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Income ↔ Convexity</label>
                  <span className="font-mono text-[10px]">{constraints.incomeVsConvexity.toFixed(2)}</span>
                </div>
                <Slider value={[constraints.incomeVsConvexity]} min={0} max={1} step={0.01} onValueChange={v => setConstraints({...constraints, incomeVsConvexity: v[0] || 0})} className="py-2" />
              </div>
            </section>

            <section className="pt-4 border-t border-slate-800/40">
              <SidebarHeader label="Construction" icon={<Settings2 className="w-3.5 h-3.5"/>} color="text-purple-400" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Method</label>
                  <select className="w-full bg-[#020617] border border-slate-800 rounded h-10 xl:h-9 text-xs px-2 text-white outline-none focus:border-blue-500" value={gen.method} onChange={e => setGen({...gen, method: e.target.value as any})}>
                    <option value="black_scholes">Closed Form</option><option value="binomial_crr">Tree (CRR)</option>
                  </select>
                </div>
                <CommitField label="Strike step" value={gen.strikeStep} onCommit={(v: any) => setGen({...gen, strikeStep: v})} />
                <CommitField label="Expiry (d)" value={gen.expiryDays} onCommit={(v: any) => setGen({...gen, expiryDays: v})} />
                <CommitField label="Long Exp (d)" value={gen.longExpiryDays} onCommit={(v: any) => setGen({...gen, longExpiryDays: v})} disabled={!constraints.allowMultiExpiry} />
                <CommitField label="Width override" value={gen.widthPct} onCommit={(v: any) => setGen({...gen, widthPct: v})} placeholder="auto" />
              </div>
            </section>

            <div className="pb-10 shrink-0" />
          </div>
        </aside>

        {/* ================= RIGHT MAIN AREA (TABS) ================= */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#020617] shrink-0">
          
          <div className="shrink-0 px-4 md:px-8 py-5 border-b border-slate-800/60 bg-[#020617] flex justify-between items-end">
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                Strategy <span className="text-blue-600">Builder</span>
              </h1>
              <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-2">
                <Layers className="w-3 h-3 text-blue-500" /> Options Discovery & Analysis Engine
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[9px] uppercase font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                onClick={handleExportPDF}
                disabled={isGeneratingPdf} 
                data-html2canvas-ignore="true"
              >
                {isGeneratingPdf ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Download className="w-3 h-3 mr-1.5" />}
                {isGeneratingPdf ? "Generating..." : "Export Report"}
              </Button>
            <div className="hidden lg:block">
              <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/10 tracking-widest">
                QUANT ENVIRONMENT
              </span>
            </div>
            </div>
          </div>

          <Tabs defaultValue="candidates" className="flex-1 flex flex-col min-h-0">
            
            <div className="shrink-0 px-4 md:px-8 pt-4 border-b border-slate-800/60 bg-[#020617] overflow-x-auto dark-scrollbar">
              <TabsList className="bg-transparent h-10 gap-6 md:gap-8 px-0 justify-start w-max">
                <TabsTrigger value="candidates" className="uppercase text-[11px] font-bold tracking-widest !bg-transparent !shadow-none !border-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:!bg-transparent data-[state=active]:!text-white rounded-none pb-3 text-slate-500 hover:!text-slate-300 hover:!bg-transparent transition-colors">
                  <ListChecks className="w-3.5 h-3.5 mr-2" /> Candidates
                </TabsTrigger>
                <TabsTrigger value="scenarios" disabled={!hasRun || candidates.length === 0} className="uppercase text-[11px] font-bold tracking-widest !bg-transparent !shadow-none !border-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:!bg-transparent data-[state=active]:!text-white rounded-none pb-3 text-slate-500 hover:!text-slate-300 hover:!bg-transparent transition-colors disabled:opacity-50 disabled:hover:!text-slate-500">
                  <BarChart3 className="w-3.5 h-3.5 mr-2" /> Scenarios
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="candidates" className="tour-candidate-results flex-1 xl:overflow-y-auto p-4 md:p-8 dark-scrollbar mt-0 js-print-scroll">              <div className="max-w-[1000px] mx-auto">
                {!hasRun || candidates.length === 0 ? (
                  <div className="h-[300px] md:h-[400px] flex items-center justify-center text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest text-center px-4">
                    Set parameters and click "Find Candidates"
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Showing Top {candidates.length} Matches</div>
                    {candidates.map((c, i) => (
                      <ReplicaCandidateCard 
                        key={c.candidate_id || i} 
                        cand={c} 
                        idx={i} 
                        active={selIdx === i} 
                        onClick={() => setSelIdx(i)} 
                        method={gen.method}
                      />
                    ))}
                    <div className="h-20 xl:h-32 shrink-0" />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="flex-1 xl:overflow-y-auto p-4 md:p-8 dark-scrollbar mt-0 js-print-scroll">
              {active ? (
                <ScenarioAnalysisDashboard 
                  cand={active} 
                  market={parsedMarket} 
                  view={parsedView} 
                  gen={parsedGen} 
                />
              ) : (
                 <div className="flex h-[300px] md:h-[400px] items-center justify-center text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest text-center px-4">
                   No active strategy selected.
                 </div>
              )}
            </TabsContent>

          </Tabs>
        </section>
      </div>
      {/* ================= GHOST REPORT (OFF-SCREEN) ================= */}
      {isGeneratingPdf && (
        <div 
          ref={reportRef} 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left:0, 
            width: '1000px', 
            zIndex: -50,
            opacity: 0,
            pointerEvents: 'none'
          }}
          className="bg-[#020617] text-white font-sans"
        >
          {/* CSS TO REMOVE SCROLLBARS FROM PDF */}
          <style>{`
            .report-section ::-webkit-scrollbar { display: none; }
            .report-section { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          
          {/* --- SECTION 1: SUMMARY --- */}
          <div className="report-section p-10 flex flex-col gap-8 bg-[#020617] min-h-screen">
             <div className="border-b border-blue-500/30 pb-6 mb-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Strategy <span className="text-blue-500">Report</span></h1>
                <p className="text-slate-400 font-bold tracking-widest mt-2 uppercase">Generated on {new Date().toLocaleDateString()}</p>
             </div>

             <div className="grid grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                   <h3 className="text-emerald-400 font-black uppercase tracking-widest mb-4 border-b border-emerald-500/20 pb-2">Market Data</h3>
                   <div className="space-y-2 font-mono text-sm">
                      <div className="flex justify-between"><span>Spot:</span> <span className="text-white">{parsedMarket.spot}</span></div>
                      <div className="flex justify-between"><span>Vol (IV):</span> <span className="text-white">{(parsedMarket.vol * 100).toFixed(1)}%</span></div>
                      <div className="flex justify-between"><span>Rate:</span> <span className="text-white">{(parsedMarket.rate * 100).toFixed(1)}%</span></div>
                   </div>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                   <h3 className="text-blue-400 font-black uppercase tracking-widest mb-4 border-b border-blue-500/20 pb-2">View & Constraints</h3>
                   <div className="space-y-2 font-mono text-sm">
                      <div className="flex justify-between"><span>Direction:</span> <span className="text-white uppercase">{view.direction}</span></div>
                      <div className="flex justify-between"><span>Target:</span> <span className="text-white">{view.moveMode === 'target' ? view.targetPrice : `+${view.movePct}%`}</span></div>
                      <div className="flex justify-between"><span>Horizon:</span> <span className="text-white">{view.horizonDays} Days</span></div>
                   </div>
                </div>
             </div>

             <div className="mt-4">
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-300 mb-6">Top 5 Candidates</h3>
                <div className="space-y-4">
                   {candidates.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
                         <div className="flex items-center gap-4">
                            <span className="text-2xl font-black text-slate-600">0{i+1}</span>
                            <div>
                               <div className="font-bold text-lg text-white">{c.name}</div>
                               <div className="text-xs text-slate-400 uppercase tracking-wider">{c.rationale}</div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-emerald-400 font-mono font-bold">{c.fit_score} Score</div>
                            <div className="text-xs text-slate-500">Max PnL: {c.max_profit?.toFixed(2) || 'Inf'}</div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          {/* --- SECTIONS 2-6: INDIVIDUAL SCENARIOS --- */}
          {candidates.slice(0, 5).map((cand, i) => (
             <div key={cand.id || i} className="report-section p-10 flex flex-col bg-[#020617] border-t-4 border-slate-800 min-h-screen">
                <div className="mb-8 flex items-center justify-between">
                   <h2 className="text-3xl font-black text-white flex items-center gap-4">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded text-xl">#{i+1}</span>
                      {cand.name}
                   </h2>
                   <span className="font-mono text-slate-500">Detailed Analysis</span>
                </div>
                
                <div className="space-y-8">
                   <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl">
                      <ScenarioAnalysisDashboard 
                          cand={cand}
                          market={parsedMarket}
                          view={parsedView}
                          gen={parsedGen}
                      />
                   </div>
                </div>
             </div>
          ))}

        </div>
      )}
    </main>
  );
}

// --- 5. NEW WRAPPER COMPONENT ---
export default function StrategyPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#020617] text-slate-500 font-mono text-sm">LOADING STRATEGY ENGINE...</div>}>
      <StrategyContent />
    </Suspense>
  );
}

/* ================= EXACT REPLICA SUB-COMPONENTS ================= */

function ReplicaCandidateCard({ cand, idx, active, onClick, method }: any) {
  const isCredit = cand.net_premium < 0;
  const isDefinedRisk = cand.max_loss !== null;
  const delta = cand.total_greeks.delta;
  
  let accentClass = "border-l-slate-700";
  if (delta > 0.05) accentClass = "border-l-emerald-500";
  else if (delta < -0.05) accentClass = "border-l-rose-500";
  else accentClass = "border-l-blue-500";

  let scoreClass = "bg-slate-800 text-slate-400 border-slate-700";
  if (cand.fit_score >= 80) scoreClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  else if (cand.fit_score >= 50) scoreClass = "bg-blue-500/10 text-blue-400 border-blue-500/30";

  return (
    <div 
      onClick={onClick} 
      className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer ${accentClass} ${
        active 
          ? `border-y-blue-500/50 border-r-blue-500/50 bg-blue-900/10 shadow-[0_0_20px_rgba(59,130,246,0.05)]` 
          : `border-y-slate-800 border-r-slate-800 bg-[#0B1120] hover:bg-slate-900/50`
      }`}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
         <div className="flex items-center gap-2">
           <span className="font-black text-[14px] md:text-[16px] text-white tracking-tight">{idx + 1}. {cand.name}</span>
           <Info className="w-3.5 h-3.5 text-slate-500 hidden md:block" />
         </div>
         <div className={`w-fit border rounded px-2.5 py-1 text-[10px] font-black tracking-widest uppercase ${scoreClass}`}>
           Score {cand.fit_score}
         </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-5">
         <Badge variant="outline" className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border-white/10 ${isCredit ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
            {isCredit ? 'Net Credit' : 'Net Debit'}
         </Badge>
         <Badge variant="outline" className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border-white/10 ${isDefinedRisk ? 'text-blue-400 bg-blue-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
            {isDefinedRisk ? 'Defined Risk' : 'Undefined Risk'}
         </Badge>
         
         {cand.pop && (
           <Badge variant="outline" className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border-white/10 ${cand.pop > 50 ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-400 bg-slate-800'}`}>
              POP: {cand.pop.toFixed(1)}%
           </Badge>
         )}

         <span className="text-[10px] md:text-[11px] text-slate-400 ml-1 font-bold uppercase w-full md:w-auto mt-1 md:mt-0">{cand.rationale}</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-5 bg-black/20 p-3 md:p-4 rounded-xl border border-white/5">
        <VerticalStat label={`Premium (${isCredit ? 'CR' : 'DR'})`} value={Math.abs(cand.net_premium).toFixed(4)} valColor={isCredit ? "text-emerald-400" : "text-amber-400"} />
        <VerticalStat label="Max loss" value={cand.max_loss !== null ? cand.max_loss.toFixed(4) : 'Unlimited'} valColor={cand.max_loss !== null ? "text-slate-200" : "text-rose-400"} />
        <VerticalStat label="Max profit" value={cand.max_profit !== null ? cand.max_profit.toFixed(4) : 'Unlimited'} valColor={cand.max_profit !== null ? "text-emerald-400" : "text-purple-400"} />
        <VerticalStat label="Breakevens" value={cand.breakevens.length ? cand.breakevens.map((b: number) => b.toFixed(2)).join(', ') : '—'} valColor="text-cyan-400" />
      </div>

      <div className="flex justify-between items-center pt-3 md:pt-1 border-t border-slate-800/50 mt-2 md:mt-4">
        <div className="flex gap-4">
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase font-bold tracking-widest">
            Δ <span className={cand.total_greeks.delta >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}>{cand.total_greeks.delta.toFixed(2)}</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase font-bold tracking-widest">
            ν <span className="text-purple-400/70">{cand.total_greeks.vega.toFixed(2)}</span>
          </div>
        </div>
        {active ? (
          <Button className="h-7 text-[9px] md:text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 font-black px-4 md:px-6">SELECTED</Button>
        ) : (
          <Button variant="ghost" className="h-7 text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 font-bold px-4 md:px-6 border border-white/5">Select</Button>
        )}
      </div>
    </div>
  );
}

function VerticalStat({ label, value, valColor = "text-white" }: { label: string, value: string, valColor?: string }) {
  return (
    <div>
      <div className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-widest mb-1.5 font-bold truncate">{label}</div>
      <div className={`font-mono text-xs md:text-[14px] font-bold tracking-tight ${valColor} truncate`}>{value}</div>
    </div>
  );
}

function SidebarHeader({ label, icon, color }: any) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-2">
      <div className={color}>{icon}</div>
      <span className="text-[12px] font-black uppercase tracking-widest text-slate-300">{label}</span>
    </div>
  );
}

function CommitField({ label, value, onCommit, disabled, placeholder }: any) {
  const [local, setLocal] = useState(value === null || value === undefined ? "" : value.toString());
  useEffect(() => { setLocal(value === null || value === undefined ? "" : value.toString()); }, [value]);

  const commit = () => {
    if (local === "") { onCommit(""); return; }
    const num = parseFloat(local);
    if (!isNaN(num)) onCommit(num);
    else setLocal(value === null || value === undefined ? "" : value.toString()); 
  };

  return (
    <div>
      <label className="text-[10px] text-slate-400 font-bold mb-1.5 block uppercase tracking-widest">{label}</label>
      <Input 
        type="text" inputMode="decimal" value={local} 
        onChange={e => setLocal(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()}
        disabled={disabled} placeholder={placeholder}
        className="w-full bg-[#020617] border border-slate-800 rounded h-10 xl:h-9 text-xs font-mono px-3 text-white outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
      />
    </div>
  );
}

/* ================= SCENARIO ANALYSIS COMPONENTS ================= */

function ScenarioAnalysisDashboard({ cand, market, view, gen }: any) {
  const [customLegs, setCustomLegs] = useState(cand.legs);
  const [isCommitting, setIsCommitting] = useState(false);
  
  useEffect(() => { setCustomLegs(cand.legs); }, [cand]);

  const analyzed = useMemo(() => {
    const { metrics } = computePortfolioMetrics(customLegs, 0, 0, 0);
    const premium = metrics?.totalValue || 0;
    const greeks = metrics?.netGreeks || { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
    
    const norm = normalizeView(view, market);
    const pnlStats = pnlMetrics(customLegs, premium, market, norm.expectedSpot, norm.moveMagPct, norm.horizonYears);

    return { premium, greeks, ...pnlStats, norm };
  }, [customLegs, market, view]);

  const analysis = useMemo(() => {
    const { norm } = analyzed;
    const spots: number[] = [];
    for (let i = 0; i <= 100; i++) spots.push(market.spot * (0.7 + (i/100) * 0.6));

    const payoffData = spots.map(s => {
      let expPnl = 0;
      customLegs.forEach((l: any) => {
        const k = l.params.strike || s;
        if (l.params.option_type === "call") expPnl += l.quantity * Math.max(0, s - k);
        else if (l.params.option_type === "put") expPnl += l.quantity * Math.max(0, k - s);
      });
      return { spot: s, value: expPnl - analyzed.premium };
    });

    const horizonData = spots.map(s => {
      const hLegs = customLegs.map((l: any) => ({
        ...l, params: {
          ...l.params, spot: s, vol: Math.max(0.0001, l.params.vol + norm.signedVolShift),
          time_to_expiry: Math.max(0.0001, l.params.time_to_expiry - norm.horizonYears)
        }
      }));
      const { metrics } = computePortfolioMetrics(hLegs, 0, 0, 0);
      return { spot: s, value: (metrics?.totalValue || 0) - analyzed.premium };
    });

    const legDetails = customLegs.map((l: any) => {
      const { metrics } = computePortfolioMetrics([l], 0, 0, 0);
      const total = metrics?.totalValue || 0;
      return { ...l, pricePerUnit: l.quantity === 0 ? 0 : Math.abs(total / l.quantity), total, ok: !!metrics };
    });

    return { payoffData, horizonData, legDetails };
  }, [customLegs, analyzed, market]);

  const updateLeg = (index: number, field: string, value: any) => {
    const newLegs = [...customLegs];
    if (field === "quantity") newLegs[index].quantity = value;
    else if (field === "strike") newLegs[index].params.strike = value;
    else if (field === "option_type") newLegs[index].params.option_type = value;
    setCustomLegs(newLegs);
  };

  const handleCommitToPortfolio = () => {
    setIsCommitting(true);
    
    const portfolioPayload = customLegs.map((leg: any) => ({
      ...leg,
      id: crypto.randomUUID(), 
      tags: [...(leg.tags || []), `Builder: ${cand.name}`]
    }));

    usePortfolioStore.getState().addStrategy(
      `${cand.name} (Custom)`, 
      portfolioPayload,        
      cand.name                
    );

    setTimeout(() => {
      setIsCommitting(false);
      alert(`Successfully committed ${customLegs.length} legs to Portfolio as a grouped strategy!`);
    }, 400);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6">
      
      {/* Overview Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div className="flex flex-col md:flex-row justify-between items-start mb-4 md:mb-6 gap-4">
          <div>
            <h2 className="text-base md:text-lg font-black text-white flex flex-wrap items-center gap-2">
              {cand.name} 
              <span className="text-[9px] md:text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 whitespace-nowrap">Live Workspace</span>
            </h2>
            <p className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase mt-1">Customized Structure Analysis</p>
          </div>
          
          <div className="flex w-full md:w-auto items-center md:flex-col md:items-end gap-3 md:gap-2 justify-between">
            {analyzed.pop && (
              <Badge variant="outline" className="text-[10px] md:text-[12px] uppercase tracking-widest px-2 md:px-3 py-1 text-cyan-400 bg-cyan-400/10 border-cyan-400/30">
                  POP: {analyzed.pop.toFixed(1)}%
              </Badge>
            )}
            <Button 
              onClick={handleCommitToPortfolio}
              disabled={isCommitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] h-8 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              {isCommitting ? "Committing..." : "Commit"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <VerticalStat label="Net Premium" value={analyzed.premium.toFixed(4)} valColor={analyzed.premium < 0 ? "text-emerald-400" : "text-amber-400"} />
          <VerticalStat label="Breakevens" value={analyzed.breakevens.length ? analyzed.breakevens.map((b:number) => b.toFixed(2)).join(", ") : "—"} valColor="text-cyan-400" />
          <VerticalStat label="Max Profit" value={analyzed.maxPnl !== null ? analyzed.maxPnl.toFixed(4) : "Unlimited"} valColor="text-emerald-400" />
          <VerticalStat label="Max Loss" value={analyzed.minPnl !== null && analyzed.minPnl < 0 ? Math.abs(analyzed.minPnl).toFixed(4) : "0.0000"} valColor="text-rose-400" />
        </div>
      </div>

      {/* Structure Legs Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 overflow-hidden flex flex-col">
        <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Structure Legs (Editable)</h3>
        
        {/* MOBILE FIX: Wrapped Table in overflow-x-auto */}
        <div className="w-full overflow-x-auto dark-scrollbar pb-2">
          <Table className="min-w-[600px]">
            <TableHeader className="border-slate-800/50">
              <TableRow className="hover:bg-transparent border-slate-800/50">
                <TableHead className="text-[10px] uppercase font-bold text-slate-500 w-24 px-4">Type</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-500 w-32 px-4">Strike</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-500 w-32 px-4">Qty (+L/-S)</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right px-4">Price/Unit</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right px-4">Total Prm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.legDetails.map((l: any, i: number) => (
                <TableRow key={i} className="hover:bg-white/5 border-slate-800/50 group">
                  <TableCell className="px-4">
                    <select 
                      className="bg-[#020617] border border-slate-700 rounded text-xs font-bold text-slate-300 p-1.5 outline-none focus:border-blue-500 uppercase w-full min-h-[36px]"
                      value={l.params.option_type}
                      onChange={(e) => updateLeg(i, 'option_type', e.target.value)}
                    >
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                    </select>
                  </TableCell>
                  <TableCell className="px-4">
                    <TweakerCell value={l.params.strike} step={gen.strikeStep} onChange={(v: number) => updateLeg(i, 'strike', v)} />
                  </TableCell>
                  <TableCell className="px-4">
                    <TweakerCell value={l.quantity} step={1} onChange={(v: number) => updateLeg(i, 'quantity', v)} />
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-400 text-right px-4">{l.pricePerUnit.toFixed(4)}</TableCell>
                  <TableCell className={`text-xs font-mono font-bold text-right px-4 ${l.total < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {l.total.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Greeks Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6">
        <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Greeks (Total)</h3>
        {/* MOBILE FIX: Use grid-cols-2 or 3 on mobile, 7 on desktop */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 md:gap-3 font-mono">
           <GreekStat label="Δ Delta" value={analyzed.greeks.delta} type="delta" />
           <GreekStat label="Γ Gamma" value={analyzed.greeks.gamma} type="gamma" />
           <GreekStat label="ν Vega" value={analyzed.greeks.vega} type="vega" />
           <GreekStat label="θ Theta" value={analyzed.greeks.theta} type="theta" />
           <GreekStat label="ρ Rho" value={analyzed.greeks.rho} type="rho" />
           <GreekStat label="Vanna" value={analyzed.greeks.vanna} type="vanna" />
           <GreekStat label="Volga" value={analyzed.greeks.volga} type="volga" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 h-[300px] md:h-[400px] flex flex-col">
          <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Payoff (Expiry) P&L</h3>
          <div className="h-[300px] w-full"> 
            <InteractiveLineChart data={analysis.payoffData} spot={market.spot} color="#3b82f6" />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 h-[300px] md:h-[400px] flex flex-col">
          <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Mark-to-Model at Horizon</h3>
          <div className="h-[300px] w-full"> 
            <InteractiveLineChart data={analysis.payoffData} spot={market.spot} color="#3b82f6" />
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 overflow-hidden flex flex-col">
        <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Spot × Vol Heatmap</h3>
        <div className="w-full overflow-x-auto dark-scrollbar pb-2">
           <ScenarioHeatmap legs={customLegs} market={market} initialPremium={analyzed.premium} view={view} />
        </div>
      </div>

      {/* Scenario Pack */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 overflow-hidden flex flex-col">
        <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Scenario Pack</h3>
        <div className="w-full overflow-x-auto dark-scrollbar pb-2">
           <ScenarioPackTable cand={{...cand, legs: customLegs, net_premium: analyzed.premium}} market={market} view={view} />
        </div>
      </div>
      
      <div className="h-20 xl:h-32 shrink-0" />
    </div>
  );
  
}

// Interactive Nudge Component for Legs
function TweakerCell({ value, onChange, step = 1 }: any) {
  const [val, setVal] = useState(value.toString());
  useEffect(() => { setVal(value.toString()); }, [value]);

  const commit = (newVal: number) => {
    setVal(newVal.toString());
    onChange(newVal);
  };

  return (
    <div className="flex items-center gap-1">
      <button 
        className="w-7 h-7 md:w-5 md:h-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center text-slate-300 font-bold active:bg-blue-600 transition-colors" 
        onClick={() => commit(Number(value) - Number(step))}
      >
        -
      </button>
      <input 
        type="number" 
        className="w-16 md:w-14 h-8 md:h-6 bg-[#020617] text-center font-mono text-xs text-white border border-slate-700 rounded outline-none focus:border-blue-500" 
        value={val} 
        onChange={e => setVal(e.target.value)}
        onBlur={() => commit(parseFloat(val) || 0)}
        onKeyDown={e => e.key === 'Enter' && commit(parseFloat(val) || 0)}
      />
      <button 
        className="w-7 h-7 md:w-5 md:h-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center text-slate-300 font-bold active:bg-blue-600 transition-colors" 
        onClick={() => commit(Number(value) + Number(step))}
      >
        +
      </button>
    </div>
  );
}

// Shadcn/Recharts Component
function InteractiveLineChart({ data, spot, color }: { data: any[], spot: number, color: string }) {
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  
  const gradientOffset = () => {
    const dataMax = max;
    const dataMin = min;
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  };
  const off = gradientOffset();

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`splitColor-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset={off} stopColor="#10b981" stopOpacity={0.3} />
            <stop offset={off} stopColor="#f43f5e" stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id={`splitStroke-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset={off} stopColor="#10b981" stopOpacity={1} />
            <stop offset={off} stopColor="#f43f5e" stopOpacity={1} />
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="spot" stroke="#475569" fontSize={10} tickFormatter={v => v.toFixed(0)} minTickGap={30} />
        <YAxis stroke="#475569" fontSize={10} domain={[min * 1.1, max * 1.1]} width={40} tickFormatter={v => v.toFixed(0)} />
        <RechartsTooltip 
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
          itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
          labelStyle={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}
          formatter={(val: number) => [<span className={val >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{val > 0 ? '+' : ''}{val.toFixed(2)}</span>, "PnL"]}
          labelFormatter={(lbl) => `Spot: ${Number(lbl).toFixed(2)}`}
        />
        <ReferenceLine x={spot} stroke="#64748b" strokeDasharray="4 4" label={{ value: "Now", fill: "#64748b", fontSize: 10, position: 'insideTopLeft' }} />
        <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
        
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={`url(#splitStroke-${color})`} 
          strokeWidth={2}
          fill={`url(#splitColor-${color})`} 
          isAnimationActive={false} 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ScenarioPackTable({ cand, market, view }: any) {
  const scenarios = [
    { label: "Spot -10%", ds: -10, dv: 0, dr: 0 },
    { label: "Spot -5%", ds: -5, dv: 0, dr: 0 },
    { label: "Spot +5%", ds: 5, dv: 0, dr: 0 },
    { label: "Spot +10%", ds: 10, dv: 0, dr: 0 },
    { label: "Vol -5%", ds: 0, dv: -0.05, dr: 0 },
    { label: "Vol +5%", ds: 0, dv: 0.05, dr: 0 },
    { label: "Rate -25bp", ds: 0, dv: 0, dr: -25 },
    { label: "Rate +25bp", ds: 0, dv: 0, dr: 25 },
  ];

  const horizonYears = Math.max(1/365, view.horizonDays / 365);

  return (
    <Table className="min-w-[600px]">
      <TableHeader className="border-slate-800/50">
        <TableRow className="hover:bg-transparent border-slate-800/50">
          <TableHead className="text-[10px] uppercase font-bold text-slate-500 px-4">Scenario</TableHead>
          <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right px-4">Spot Shift</TableHead>
          <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right px-4">Δvol</TableHead>
          <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right px-4">Δr (bp)</TableHead>
          <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right px-4">Total</TableHead>
          <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right px-4">PnL vs initial</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scenarios.map((s, i) => {
          const shockedLegs = cand.legs.map((l: any) => ({
             ...l, 
             params: { 
               ...l.params, 
               spot: market.spot * (1 + s.ds/100), 
               vol: Math.max(0.0001, market.vol + s.dv),
               risk_free_rate: market.rate + (s.dr / 10000),
               time_to_expiry: Math.max(0.0001, l.params.time_to_expiry - horizonYears)
             }
          }));
          const { metrics } = computePortfolioMetrics(shockedLegs, 0, 0, 0);
          const total = metrics?.totalValue || 0;
          const pnl = total - cand.net_premium;

          return (
            <TableRow key={i} className="hover:bg-white/5 border-slate-800/50">
              <TableCell className="text-[11px] md:text-xs font-bold text-slate-300 px-4 whitespace-nowrap">{s.label}</TableCell>
              <TableCell className="font-mono text-slate-400 text-[11px] md:text-xs text-right px-4">{s.ds}%</TableCell>
              <TableCell className="font-mono text-slate-400 text-[11px] md:text-xs text-right px-4">{s.dv.toFixed(4)}</TableCell>
              <TableCell className="font-mono text-slate-400 text-[11px] md:text-xs text-right px-4">{s.dr.toFixed(2)}</TableCell>
              <TableCell className="font-mono text-white text-[11px] md:text-xs text-right font-bold px-4">{total.toFixed(4)}</TableCell>
              <TableCell className={`font-mono font-bold text-right text-[11px] md:text-sm px-4 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pnl.toFixed(4)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ScenarioHeatmap({ legs, market, initialPremium, view }: any) {
  const spotShifts = [-20, -10, -5, 0, 5, 10, 20];
  const volShifts = [0.10, 0.05, 0, -0.05, -0.10]; 

  const grid = useMemo(() => {
    let maxAbs = 0;
    const horizonYears = Math.max(1/365, view.horizonDays / 365);
    
    const matrix = volShifts.map(dv => {
      return spotShifts.map(ds => {
        const shockedLegs = legs.map((l: any) => ({
           ...l, params: { ...l.params, spot: market.spot * (1 + ds/100), vol: Math.max(0.0001, market.vol + dv), time_to_expiry: Math.max(0.0001, l.params.time_to_expiry - horizonYears) }
        }));
        const { metrics } = computePortfolioMetrics(shockedLegs, 0, 0, 0);
        const pnl = (metrics?.totalValue || 0) - initialPremium;
        if (Math.abs(pnl) > maxAbs) maxAbs = Math.abs(pnl);
        return pnl;
      });
    });
    return { matrix, maxAbs: maxAbs || 1 };
  }, [legs, market, initialPremium, view]);

  const getColor = (pnl: number) => {
    const ratio = Math.abs(pnl) / grid.maxAbs;
    const opacity = Math.max(0.1, Math.min(ratio, 0.9));
    return pnl > 0 ? `rgba(16, 185, 129, ${opacity})` : pnl < 0 ? `rgba(244, 63, 94, ${opacity})` : 'transparent';
  };

  return (
    <table className="w-full text-center border-collapse min-w-[600px]">
      <thead>
        <tr>
          <th className="p-2 md:p-3 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 border-b border-r border-slate-800 whitespace-nowrap">Δ Vol \ Spot</th>
          {spotShifts.map(ds => (
            <th key={ds} className="p-2 md:p-3 text-[9px] md:text-[10px] font-bold text-slate-300 uppercase bg-slate-900/50 border-b border-slate-800">{ds > 0 ? `+${ds}` : ds}%</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {volShifts.map((dv, r) => (
          <tr key={dv}>
            <td className="p-2 md:p-3 text-[9px] md:text-[10px] font-bold text-slate-300 bg-slate-900/50 border-r border-b border-slate-800">
              {dv > 0 ? `+${(dv*100).toFixed(0)}` : (dv*100).toFixed(0)}%
            </td>
            {spotShifts.map((ds, c) => {
              const pnl = grid.matrix[r][c];
              return (
                <td key={ds} className="p-2 md:p-3 text-[10px] md:text-xs font-mono font-bold border-b border-slate-800/50 text-white" style={{ backgroundColor: getColor(pnl) }}>
                  {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GreekStat({ label, value, type }: { label: string, value: number, type: string }) {
  let color = "text-white";
  if (Math.abs(value) < 0.0001) {
    color = "text-slate-500"; 
  } else {
    if (type === "delta") color = value > 0 ? "text-emerald-400" : "text-rose-400"; 
    else if (type === "gamma") color = value > 0 ? "text-cyan-400" : "text-orange-400"; 
    else if (type === "vega") color = value > 0 ? "text-purple-400" : "text-amber-400";
    else if (type === "theta") color = value > 0 ? "text-emerald-400" : "text-rose-400"; 
    else if (type === "rho") color = value > 0 ? "text-blue-400" : "text-red-400"; 
    else if (type === "vanna") color = value > 0 ? "text-fuchsia-400" : "text-pink-400";
    else if (type === "volga") color = value > 0 ? "text-indigo-400" : "text-violet-400";
  }

  return (
    <div className="bg-[#020617] p-2 md:p-3 rounded-xl border border-white/5 flex flex-col items-center md:items-start text-center md:text-left">
      <div className="text-[8px] md:text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1.5 whitespace-nowrap">{label}</div>
      <div className={`text-xs md:text-sm font-bold tracking-tight ${color}`}>
        {value === undefined || value === null ? "—" : value.toFixed(3)}
      </div>
    </div>
  );
}