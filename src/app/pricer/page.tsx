"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { Info, Loader2, Activity, Tag, Presentation, ChevronRight, Binary, Cpu, Download } from "lucide-react";
import { PRICER_CATALOG } from "@/features/pricing/config";
import { computeResult, PricingResult } from "@/features/pricing/engine";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image"; // Changed from toPng
import { toast } from "sonner"; 

// --- Types ---
interface PricingRequest {
  instrument: string;
  method: string;
  market: Record<string, number>;
  params: Record<string, any>;
}

interface PricingResponse extends PricingResult {
  latency: number;
}

// --- Sub-components ---

const LoadingValue = () => (
  <div className="h-5 w-24 bg-white/10 animate-pulse rounded" />
);

const DataRow = ({ label, value, loading, colorFn, suffix = "" }: { label: string, value: number | null | undefined, loading: boolean, colorFn?: (v: number) => string, suffix?: string }) => {
  const displayColor = (typeof value === 'number' && colorFn) ? colorFn(value) : "text-slate-200";
  
  return (
    <div className="flex justify-between items-center py-3 px-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded-lg group">
      <span className="text-xs uppercase font-bold text-slate-500 group-hover:text-slate-400 transition-colors">{label}</span>
      {loading ? (
        <LoadingValue />
      ) : (
        <span className={`font-mono font-medium tracking-tight ${displayColor}`}>
          {typeof value === 'number' ? value.toFixed(6) : "-"}
          {suffix && <span className="text-slate-600 ml-1 text-[10px]">{suffix}</span>}
        </span>
      )}
    </div>
  );
};

// --- Tour Steps ---
const TOUR_STEPS: Step[] = [
  {
    target: ".tour-instrument-select",
    content: "Select your financial instrument here. The engine supports Vanilla Options, Forwards, and Exotics like Barrier and Asian options.",
    title: "1. Select Instrument",
    disableBeacon: true,
  },
  {
    target: ".tour-pricing-method",
    content: "Choose your pricing model. Depending on the instrument, you can select Closed-Form (Black-Scholes) or numerical methods like Binomial Trees.",
    title: "2. Pricing Method",
  },
  {
    target: ".tour-instrument-params",
    content: "Configure the specific parameters for your chosen instrument (e.g., Strike, Time to Expiry, or Barrier Levels).",
    title: "3. Configure Parameters",
  },
  {
    target: ".tour-compute-button",
    content: "Click this button to run the pricing model. The tour will wait for the calculation to finish.",
    title: "4. Compute Price",
    spotlightClicks: true, 
    hideFooter: true,      
    placement: "top"
  },
  {
    target: ".tour-theoretical-price",
    content: "Here is your calculated theoretical price and total position value, along with the computation latency.",
    title: "5. Theoretical Price",
  },
  {
    target: ".tour-greeks",
    content: "And here are your exact first and second-order Greeks, calculated instantly alongside the premium.",
    title: "6. Risk Sensitivities",
    placement: "left"
  }
];

export default function PricerPage() {
  const [instKey, setInstKey] = useState(PRICER_CATALOG.instruments[0].key);
  const [methodKey, setMethodKey] = useState(PRICER_CATALOG.instruments[0].methods[0].key);
  const [quantity, setQuantity] = useState(1);
  const [marketParams, setMarketParams] = useState<Record<string, number>>({ S: 100, r: 0.05, q: 0, sigma: 0.2 });
  const [instrumentParams, setInstrumentParams] = useState<Record<string, any>>({});
  
  const [result, setResult] = useState<PricingResult | null>(null);
  const [runMetadata, setRunMetadata] = useState<{ instrumentLabel: string, methodLabel: string } | null>(null);
  const [calcTime, setCalcTime] = useState<number | null>(null);
  const [runQuantity, setRunQuantity] = useState(1);
  const [isComputing, setIsComputing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const currentInstrument = PRICER_CATALOG.instruments.find((i) => i.key === instKey)!;
  const currentMethod = currentInstrument.methods.find((m) => m.key === methodKey) || currentInstrument.methods[0];

  // --- Joyride State ---
  const searchParams = useSearchParams();
  const router = useRouter();
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (searchParams?.get("demo") === "true") {
      setTimeout(() => {
        setStepIndex(0);
        setRunTour(true);
      }, 500);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Dynamic Scroll Fix for Mobile
  useEffect(() => {
    if (runTour && mounted) {
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
    setStepIndex(0);
    setRunTour(true);
  };

  useEffect(() => {
    const defaultMethod = currentInstrument.methods[0];
    setMethodKey(defaultMethod.key);
    const newParams: Record<string, any> = {};
    currentInstrument.base_params.forEach(p => newParams[p.key] = p.default);
    defaultMethod.extra_params.forEach(p => newParams[p.key] = p.default);
    setInstrumentParams(newParams);
  }, [instKey]);

  useEffect(() => {
     setInstrumentParams(prev => {
       const next = { ...prev };
       currentMethod.extra_params.forEach(p => next[p.key] = p.default);
       return next;
     });
  }, [methodKey]);

  // --- PDF Export Logic (Optimized JPEG) ---
  const handleExportPDF = async () => {
    // FIX: Use getElementById instead of containerRef for the Pricer page
    const printArea = document.getElementById("pricer-export-area");
    if (!printArea) {
      toast.error("Error: Could not find the dashboard area to print.");
      return;
    }

    try {
      setIsExporting(true);
      toast.info("Generating PDF... (optimizing size)");

      // 1. Wait for UI to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Capture as JPEG
      const dataUrl = await toJpeg(printArea, {
        quality: 0.75,
        pixelRatio: 1.5,
        backgroundColor: "#020617", 
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === "true") {
            return false;
          }
          return true;
        }
      });
      
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const pdfHeight = (printArea.offsetHeight * pdfWidth) / printArea.offsetWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.setFillColor(2, 6, 23); 
      pdf.rect(0, 0, pdfWidth, pageHeight, "F");

      pdf.addImage(dataUrl, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        
        pdf.setFillColor(2, 6, 23); 
        pdf.rect(0, 0, pdfWidth, pageHeight, "F");
        
        pdf.addImage(dataUrl, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Pricer_Report_${dateStr}.pdf`);
      toast.success("PDF Exported Successfully");

    } catch (error) {
      console.error("PDF Export failed:", error);
      toast.error("Failed to generate PDF. See console.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCompute = async () => {
    setIsComputing(true);
    setRunQuantity(quantity);
    
    // EXPLICIT MAPPING: Ensure UI keys match Engine expectations
    // Engine expects 'sigma', 'r', 'q', 'S', 'K', 'T', and 'option_type'
    const combinedInputs = {
      ...marketParams,
      ...instrumentParams,
      sigma: marketParams.sigma, 
      option_type: instrumentParams.type || instrumentParams.option_type || 'call', // Correct fallback
      barrierType: instrumentParams.barrierType || 'up-out',
      quantity: quantity
    };

    console.log("🚀 SENDING TO ENGINE:", { instKey, methodKey, combinedInputs });

    try {
      // 1. Try API first
      const response = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: instKey,
          method: methodKey,
          market: marketParams, 
          params: instrumentParams
        }),
      });

      if (!response.ok) throw new Error('API route not found or failed');
      const data: PricingResponse = await response.json();
      setResult(data);
      setCalcTime(data.latency); 
      
    } catch (error) {
      // 2. FALLBACK to Local Engine
      console.warn("⚠️ API Failed, using local engine fallback...");
      
      try {
        const localResult = await computeResult(methodKey, instKey, combinedInputs);
        
        console.log("✅ ENGINE RETURNED:", localResult);
        setResult(localResult);
        setCalcTime(2); // Mock latency
      } catch (localErr) {
        console.error("❌ Local fallback failed:", localErr);
      }
    } finally {
      setIsComputing(false);
      setRunMetadata({
        instrumentLabel: currentInstrument.label,
        methodLabel: currentMethod.label
      });
      if (runTour && stepIndex === 3) {
        setTimeout(() => setStepIndex(4), 400); 
      }
    }
  };

  const getGreekColor = (val: number) => {
    if (val > 0.000001) return "text-emerald-400";
    if (val < -0.000001) return "text-rose-400";
    return "text-slate-400";
  };

  if (!mounted) return null;

  return (
    // Added ID "pricer-export-area" for PDF generation and "dark-scrollbar" class is already here
    <main id="pricer-export-area" className="flex flex-col lg:flex-row w-full bg-[#020617] text-white pt-10 lg:pt-4 px-4 lg:px-6 gap-6 h-screen overflow-y-auto lg:overflow-hidden font-sans dark-scrollbar selection:bg-blue-500/30">

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
            spotlightPadding: 6,
          },
          tooltipContainer: { textAlign: 'left' },
          buttonNext: { backgroundColor: '#2563eb', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonBack: { color: '#94a3b8', marginRight: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
          buttonSkip: { color: '#ef4444', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }
        }}
      />

      <section className="w-full lg:w-[55%] flex flex-col bg-slate-900/20 border border-white/10 rounded-3xl p-4 md:p-6 lg:overflow-hidden shrink-0 lg:mb-20 ">
        <div className="flex flex-col md:flex-row md:justify-between items-start mb-6 md:mb-8 gap-2">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              INSTRUMENT<span className="text-blue-600"> PRICER</span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400 pt-1">Choose an instrument, pick a method, enter inputs → get a result.</p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
             {/* PDF EXPORT BUTTON */}
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-html2canvas-ignore="true" // Ignore the button itself during print
            >
               {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} 
               {isExporting ? "Saving..." : "Export"}
            </button>

            <button 
              onClick={startManualDemo}
              className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <Presentation className="w-3 h-3" /> Demo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6">
          <div className="tour-instrument-select sm:col-span-4 space-y-1.5 rounded-lg">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <Tag className="w-2.5 h-2.5" /> Instrument
            </label>
            <select 
              className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-xs md:text-sm focus:border-blue-600 outline-none transition-colors"
              value={instKey}
              onChange={(e) => setInstKey(e.target.value)}
            >
              {PRICER_CATALOG.instruments.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </div>

          <div className="tour-pricing-method sm:col-span-4 space-y-1.5 rounded-lg">
            <div className="flex items-center gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Binary className="w-2.5 h-2.5" /> Method
                </label>
                <div className="relative group cursor-help z-20">
                    <Info className="w-3 h-3 text-slate-600 group-hover:text-blue-500 transition-colors" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-xs text-slate-300 p-3 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all">
                        {currentMethod.note}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                </div>
            </div>
            
            <select 
                className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-xs md:text-sm focus:border-blue-600 outline-none transition-colors"
                value={methodKey}
                onChange={(e) => setMethodKey(e.target.value)}
              >
                {currentInstrument.methods.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
          </div>

          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quantity</label>
            <input 
              type="number"
              className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-xs md:text-sm focus:border-blue-600 outline-none font-mono"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 flex-1 lg:overflow-hidden">
          
          <div className="tour-instrument-params bg-slate-900/40 border border-white/10 p-4 md:p-5 rounded-2xl flex flex-col h-auto lg:h-full lg:overflow-hidden relative z-10">
            <div className="border-b border-white/5 pb-2 mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-blue-500" />
                Parameters
              </h3>
              <p className="text-[10px] text-slate-500 leading-tight">Inputs depend on the selected instrument + method.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:overflow-y-auto dark-scrollbar pr-1">
                {currentInstrument.base_params.map((param) => (
                  <div key={param.key} className="col-span-1">
                    <label className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">{param.label}</label>
                    {param.type === 'select' ? (
                      <select 
                        className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2 md:p-2.5 text-xs md:text-sm outline-none"
                        value={instrumentParams[param.key] || param.default}
                        onChange={(e) => setInstrumentParams(prev => ({...prev, [param.key]: e.target.value}))}
                      >
                        {/* @ts-ignore */}
                        {param.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="number"
                        step={param.step}
                        className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2 md:p-2.5 text-xs md:text-sm outline-none font-mono"
                        value={instrumentParams[param.key] ?? ''} 
                        onChange={(e) => setInstrumentParams(prev => ({...prev, [param.key]: Number(e.target.value)}))}
                      />
                    )}
                  </div>
                ))}

                {currentMethod.extra_params.map((param) => (
                  <div key={param.key} className="col-span-1">
                    <label className="text-[9px] md:text-[10px] uppercase font-bold text-blue-400/80 tracking-wider block mb-1.5">{param.label}</label>
                    <input 
                      type="number"
                      step={param.step}
                      className="w-full bg-[#0B1121] border border-blue-500/20 rounded-lg p-2 md:p-2.5 text-xs md:text-sm outline-none font-mono text-blue-200"
                      value={instrumentParams[param.key] ?? ''}
                      onChange={(e) => setInstrumentParams(prev => ({...prev, [param.key]: Number(e.target.value)}))}
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/10 p-4 md:p-5 rounded-2xl flex flex-col h-auto lg:h-full lg:overflow-hidden">
            <div className="border-b border-white/5 pb-2 mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-blue-500" />
                Market
              </h3>
              <p className="text-[10px] text-slate-500 leading-tight">Single set of market inputs used for this instrument.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:overflow-y-auto no-scrollbar pr-1">
              {PRICER_CATALOG.market_params.map(p => (
                <div key={p.key}>
                  <label className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">{p.label}</label>
                    <input 
                      type="number"
                      step={p.step}
                      className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2 md:p-2.5 text-xs md:text-sm outline-none font-mono"
                      value={marketParams[p.key]}
                      onChange={(e) => setMarketParams(prev => ({...prev, [p.key]: Number(e.target.value)}))}
                    />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 shrink-0 tour-compute-button rounded-xl relative z-10">
          <button 
            onClick={handleCompute}
            disabled={isComputing}
            className="w-full md:w-auto px-6 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold uppercase tracking-widest text-xs md:text-sm rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isComputing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Compute Price"}
          </button>
        </div>

      </section>

      {/* ================= RIGHT COLUMN: OUTPUTS ================= */}
      <section className="w-full lg:w-[40%] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 md:p-6 flex flex-col relative shrink-0 min-h-fit transition-all mb-20 lg:pb-10">

         <div className="flex justify-between items-start mb-4 md:mb-6 pb-4 border-b border-white/5 min-h-[50px] shrink-0">
           {runMetadata ? (
             <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   <Tag className="w-3 h-3 text-blue-500" />
                   <span className="text-[10px] md:text-xs font-bold text-white tracking-wide">{runMetadata.instrumentLabel}</span>
                </div>
                <span className="text-[9px] md:text-[10px] font-mono text-slate-400 uppercase tracking-wider pl-5">{runMetadata.methodLabel}</span>
             </div>
           ) : (
             <div className="flex items-center gap-2 h-full">
               <div className="w-2 h-2 rounded-full bg-slate-600" />
               <span className="text-[9px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest">NO RUN DATA</span>
             </div>
           )}

           <div className="text-right">
             <div className="flex items-center justify-end gap-2 text-[9px] md:text-[10px] font-mono text-slate-500 mb-1">
               {isComputing && <Loader2 className="w-3 h-3 animate-spin" />}
               <span>{isComputing ? "COMPUTING" : "STATUS: OK"}</span>
             </div>
             {calcTime !== null && !isComputing && (
                <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-mono text-emerald-500 justify-end">
                  <Activity className="w-3 h-3" />
                  <span>{calcTime}ms</span>
                </div>
             )}
           </div>
         </div>

         <div className="tour-theoretical-price bg-[#0B1121] border border-white/10 rounded-xl p-4 md:p-5 mb-6 shadow-2xl relative overflow-hidden shrink-0 z-10">
            <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            
            <div className="flex flex-col md:flex-row md:justify-between md:items-end relative z-10 gap-4 md:gap-0">
               <div>
                  <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 mb-1">Theoretical Price</p>
                  {isComputing ? (
                    <div className="h-8 md:h-10 w-24 md:w-32 bg-white/10 animate-pulse rounded" />
                  ) : (
                    <div className="text-3xl md:text-4xl lg:text-5xl font-black font-mono tracking-tighter text-white">
                      {typeof result?.price === 'number' ? result.price.toFixed(4) : "---"}
                    </div>
                  )}
               </div>
               
               <div className="md:text-right">
                 <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 mb-1">Total Position ({runQuantity}x)</p>
                  {isComputing ? (
                    <div className="h-5 md:h-6 w-20 md:w-24 bg-white/10 animate-pulse rounded md:ml-auto" />
                  ) : (
                    <div className="text-lg md:text-xl font-bold font-mono text-blue-400">
                        {typeof result?.price === 'number' ? (result.price * runQuantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : "---"}
                    </div>
                  )}
               </div>
            </div>
         </div>

         <div className="tour-greeks flex-1 lg:overflow-y-auto no-scrollbar bg-slate-900/20 border border-white/5 rounded-xl p-2 space-y-1 relative z-10">
            <DataRow label="Delta" value={result?.delta ?? null} loading={isComputing} colorFn={getGreekColor} suffix="Δ" />
            <DataRow label="Gamma" value={result?.gamma ?? null} loading={isComputing} colorFn={getGreekColor} suffix="Γ" />
            <DataRow label="Vega" value={result?.vega ?? null} loading={isComputing} colorFn={getGreekColor} suffix="ν" />
            <DataRow label="Theta" value={result?.theta ?? null} loading={isComputing} colorFn={getGreekColor} suffix="Θ" />
            <DataRow label="Rho" value={result?.rho ?? null} loading={isComputing} colorFn={getGreekColor} suffix="ρ" />
         </div>
         
         <div className="mt-4 pt-4 border-t border-white/5 text-[9px] md:text-[10px] text-slate-600 flex justify-between shrink-0 m-10">
           <span>* Vega (1% vol change) | Theta (1-day decay)</span>
         </div>

      </section>
    </main>
  );
}