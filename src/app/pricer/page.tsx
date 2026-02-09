"use client";

import React, { useState, useEffect } from "react";
import { Info, Loader2, Activity, Tag } from "lucide-react";
import { PRICER_CATALOG } from "@/features/pricing/config";
import { computeResult, PricingResult } from "@/features/pricing/engine";

// --- Sub-components ---

const LoadingValue = () => (
  <div className="h-5 w-24 bg-white/10 animate-pulse rounded" />
);

const DataRow = ({ label, value, loading, colorFn, suffix = "" }: { label: string, value: number | null, loading: boolean, colorFn?: (v: number) => string, suffix?: string }) => {
  const displayColor = value && colorFn ? colorFn(value) : "text-slate-200";
  
  return (
    <div className="flex justify-between items-center py-3 px-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded-lg group">
      <span className="text-xs uppercase font-bold text-slate-500 group-hover:text-slate-400 transition-colors">{label}</span>
      {loading ? (
        <LoadingValue />
      ) : (
        <span className={`font-mono font-medium tracking-tight ${displayColor}`}>
          {value !== null ? value.toFixed(6) : "-"}
          {suffix && <span className="text-slate-600 ml-1 text-[10px]">{suffix}</span>}
        </span>
      )}
    </div>
  );
};

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

  const currentInstrument = PRICER_CATALOG.instruments.find((i) => i.key === instKey)!;
  const currentMethod = currentInstrument.methods.find((m) => m.key === methodKey) || currentInstrument.methods[0];

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

  const handleCompute = async () => {
    setIsComputing(true);
    setRunQuantity(quantity);
    
    // 1. Build the Safe Request Object
    const payload: PricingRequest = {
      instrument: instKey,
      method: methodKey,
      market: marketParams, // Matches the schema structure
      params: instrumentParams
    };

    try {
      // 2. Call the API
      const response = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Calculation Failed');

      const data: PricingResponse = await response.json();

      // 3. Update UI
      setResult({
        price: data.price,
        delta: data.delta,
        gamma: data.gamma,
        vega: data.vega,
        theta: data.theta,
        rho: data.rho
      });
      
      setCalcTime(data.latency); // Use server-reported latency!
      
      setRunMetadata({
        instrumentLabel: currentInstrument.label,
        methodLabel: currentMethod.label
      });
      
    } catch (error) {
      console.error(error);
      // Optional: Add an error toast here
    } finally {
      setIsComputing(false);
    }
  };

  const getGreekColor = (val: number) => {
    if (val > 0.000001) return "text-emerald-400";
    if (val < -0.000001) return "text-rose-400";
    return "text-slate-400";
  };

  return (
    <main className="h-[calc(100dvh-64px)] w-full bg-[#020617] text-white p-4 lg:p-6 flex gap-6 overflow-hidden font-sans selection:bg-blue-500/30">
      
      <section className="w-[60%] flex flex-col bg-slate-900/20 border border-white/10 rounded-3xl p-6 overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-xl font-bold text-white tracking-tight">INSTRUMENT<span className="text-blue-600"> PRICER</span></h1>
          <p className="text-xs text-slate-400 pt-1">Choose an instrument, pick a method, enter inputs → get a result.</p>
        </div>

        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-4 space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Instrument</label>
            <select 
              className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-sm focus:border-blue-600 outline-none transition-colors"
              value={instKey}
              onChange={(e) => setInstKey(e.target.value)}
            >
              {PRICER_CATALOG.instruments.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </div>

          <div className="col-span-4 space-y-1.5">
            {/* Tooltip & Label Wrapper */}
            <div className="flex items-center gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Method</label>
                {/* TOOLTIP TARGET */}
                <div className="relative group cursor-help">
                    <Info className="w-3 h-3 text-slate-600 group-hover:text-blue-500 transition-colors" />
                    {/* TOOLTIP CONTENT */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-xs text-slate-300 p-3 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20">
                        {currentMethod.note}
                        {/* Triangle Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                </div>
            </div>
            
            <select 
                className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-sm focus:border-blue-600 outline-none transition-colors"
                value={methodKey}
                onChange={(e) => setMethodKey(e.target.value)}
              >
                {currentInstrument.methods.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
          </div>

          <div className="col-span-4 space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quantity</label>
            <input 
              type="number"
              className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-sm focus:border-blue-600 outline-none font-mono"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
          <div className="bg-slate-900/40 border border-white/10 p-5 rounded-2xl flex flex-col overflow-hidden">
            <div className="border-b border-white/5 pb-2 mb-4">
              <h3 className="text-sm font-bold text-white">Parameters</h3>
              <p className="text-[10px] text-slate-500 leading-tight">Inputs depend on the selected instrument + method.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar pr-1">
                {currentInstrument.base_params.map((param) => (
                  <div key={param.key} className="col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">{param.label}</label>
                    {param.type === 'select' ? (
                      <select 
                        className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-sm outline-none"
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
                        className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-sm outline-none font-mono"
                        value={instrumentParams[param.key] || ''}
                        onChange={(e) => setInstrumentParams(prev => ({...prev, [param.key]: Number(e.target.value)}))}
                      />
                    )}
                  </div>
                ))}

                {currentMethod.extra_params.map((param) => (
                  <div key={param.key} className="col-span-1">
                    <label className="text-[10px] uppercase font-bold text-blue-400/80 tracking-wider block mb-1.5">{param.label}</label>
                    <input 
                      type="number"
                      step={param.step}
                      className="w-full bg-[#0B1121] border border-blue-500/20 rounded-lg p-2.5 text-sm outline-none font-mono text-blue-200"
                      value={instrumentParams[param.key] || ''}
                      onChange={(e) => setInstrumentParams(prev => ({...prev, [param.key]: Number(e.target.value)}))}
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/10 p-5 rounded-2xl flex flex-col overflow-hidden">
            <div className="border-b border-white/5 pb-2 mb-4">
              <h3 className="text-sm font-bold text-white">Market</h3>
              <p className="text-[10px] text-slate-500 leading-tight">Single set of market inputs used for this instrument.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar pr-1">
              {PRICER_CATALOG.market_params.map(p => (
                <div key={p.key}>
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">{p.label}</label>
                    <input 
                      type="number"
                      step={p.step}
                      className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-2.5 text-sm outline-none font-mono"
                      value={marketParams[p.key]}
                      onChange={(e) => setMarketParams(prev => ({...prev, [p.key]: Number(e.target.value)}))}
                    />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button 
            onClick={handleCompute}
            disabled={isComputing}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isComputing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Compute Price"}
          </button>
        </div>

      </section>

      <section className="w-[40%] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden h-full transition-all">
         
         <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/5 min-h-[50px]">
           {runMetadata ? (
             <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   <Tag className="w-3 h-3 text-blue-500" />
                   <span className="text-xs font-bold text-white tracking-wide">{runMetadata.instrumentLabel}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pl-5">{runMetadata.methodLabel}</span>
             </div>
           ) : (
             <div className="flex items-center gap-2 h-full">
               <div className="w-2 h-2 rounded-full bg-slate-600" />
               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">NO RUN DATA</span>
             </div>
           )}

           <div className="text-right">
             <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-slate-500 mb-1">
               {isComputing && <Loader2 className="w-3 h-3 animate-spin" />}
               <span>{isComputing ? "COMPUTING" : "STATUS: OK"}</span>
             </div>
             {calcTime !== null && !isComputing && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-500">
                  <Activity className="w-3 h-3" />
                  <span>{calcTime}ms</span>
                </div>
             )}
           </div>
         </div>

         <div className="bg-[#0B1121] border border-white/10 rounded-xl p-5 mb-6 shadow-2xl relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            
            <div className="flex justify-between items-end relative z-10">
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Theoretical Price</p>
                  {isComputing ? (
                    <div className="h-10 w-32 bg-white/10 animate-pulse rounded" />
                  ) : (
                    <div className="text-4xl lg:text-5xl font-black font-mono tracking-tighter text-white">
                      {result ? result.price.toFixed(4) : "---"}
                    </div>
                  )}
               </div>
               
               <div className="text-right">
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Total Position ({runQuantity}x)</p>
                  {isComputing ? (
                    <div className="h-6 w-24 bg-white/10 animate-pulse rounded ml-auto" />
                  ) : (
                    <div className="text-xl font-bold font-mono text-blue-400">
                       {result ? (result.price * runQuantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : "---"}
                    </div>
                  )}
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-900/20 border border-white/5 rounded-xl p-2 space-y-1">
            <DataRow label="Delta" value={result?.delta ?? null} loading={isComputing} colorFn={getGreekColor} suffix="Δ" />
            <DataRow label="Gamma" value={result?.gamma ?? null} loading={isComputing} colorFn={getGreekColor} suffix="Γ" />
            <DataRow label="Vega" value={result?.vega ?? null} loading={isComputing} colorFn={getGreekColor} suffix="ν" />
            <DataRow label="Theta" value={result?.theta ?? null} loading={isComputing} colorFn={getGreekColor} suffix="Θ" />
            <DataRow label="Rho" value={result?.rho ?? null} loading={isComputing} colorFn={getGreekColor} suffix="ρ" />
         </div>
         
         <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-slate-600 flex justify-between shrink-0">
           <span>* Vega (1% vol change) | Theta (1-day decay)</span>
         </div>

      </section>
    </main>
  );
}