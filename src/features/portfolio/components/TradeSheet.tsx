"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Layers, Wand2 } from "lucide-react";
import { usePortfolioStore } from "../store";
import { buildStrategy, StrategyType } from "../strategy-builder";

export function TradeSheet() {
  const addTrade = usePortfolioStore((state) => state.addTrade);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("single"); 

  const [config, setConfig] = useState({
    instrument: "vanilla",
    asset: "BTC",
    spot: 46000,
    vol: 0.65,
    rate: 0.05,
    dividend: 0, 
    expiry: 0.1,
    quantity: 1,
    strike: 46000,
    strike2: 44000, 
    strike3: 48000, 
    strike4: 42000, 
    type: "call",
    payout: 100,
    barrier: 42000,
    barrierType: "down-out",
  });

  const handleAutoFill = () => {
      const stratType = mode === "condor" ? "iron_condor" : mode as StrategyType;
      const legs = buildStrategy(stratType, {
          asset: config.asset,
          spot: Number(config.spot),
          vol: Number(config.vol),
          expiry: Number(config.expiry),
          rate: Number(config.rate),
          quantity: Number(config.quantity),
          view: "neutral"
      });
      if (legs.length > 0) {
          const strikes = legs.map(l => l.params.strike);
          strikes.sort((a, b) => (a||0) - (b||0));
          if (mode === "condor" && strikes.length === 4) {
              setConfig(prev => ({
                  ...prev,
                  strike4: strikes[0] || 0,
                  strike2: strikes[1] || 0,
                  strike: strikes[2] || 0,
                  strike3: strikes[3] || 0
              }));
          } else if (mode === "strangle" && strikes.length === 2) {
              setConfig(prev => ({ ...prev, strike2: strikes[0] || 0, strike: strikes[1] || 0 }));
          } else if (mode === "straddle") {
              setConfig(prev => ({ ...prev, strike: strikes[0] || 0 }));
          }
      }
  };

  const handleSubmit = () => {
    const common = {
        asset: config.asset,
        spot: Number(config.spot),
        time_to_expiry: Number(config.expiry),
        vol: Number(config.vol),
        risk_free_rate: Number(config.rate),
        dividend_yield: Number(config.dividend),
        payout: Number(config.payout),
        barrier: Number(config.barrier),
        barrier_type: config.barrierType,
    };
    const qty = Number(config.quantity);
    const instr = config.instrument as any;

    if (mode === "single") {
        addTrade({
            id: crypto.randomUUID(), instrument: instr, method: "black_scholes", quantity: qty, active: true,
            params: { ...common, strike: Number(config.strike), option_type: config.type },
        });
    } else if (mode === "condor") {
        addTrade({ id: crypto.randomUUID(), name: "Short Call", instrument: "vanilla", method: "black_scholes", quantity: -qty, active: true, params: { ...common, strike: Number(config.strike), option_type: "call" }});
        addTrade({ id: crypto.randomUUID(), name: "Short Put", instrument: "vanilla", method: "black_scholes", quantity: -qty, active: true, params: { ...common, strike: Number(config.strike2), option_type: "put" }});
        addTrade({ id: crypto.randomUUID(), name: "Long Call Wing", instrument: "vanilla", method: "black_scholes", quantity: qty, active: true, params: { ...common, strike: Number(config.strike3), option_type: "call" }});
        addTrade({ id: crypto.randomUUID(), name: "Long Put Wing", instrument: "vanilla", method: "black_scholes", quantity: qty, active: true, params: { ...common, strike: Number(config.strike4), option_type: "put" }});
    } else if (mode === "straddle") {
         const strk = Number(config.strike);
        addTrade({ id: crypto.randomUUID(), name: "Straddle Call", instrument: "vanilla", method: "black_scholes", quantity: qty, active: true, params: { ...common, strike: strk, option_type: "call" }});
        addTrade({ id: crypto.randomUUID(), name: "Straddle Put", instrument: "vanilla", method: "black_scholes", quantity: qty, active: true, params: { ...common, strike: strk, option_type: "put" }});
    } else if (mode === "strangle") {
        addTrade({ id: crypto.randomUUID(), name: "Strangle Call", instrument: "vanilla", method: "black_scholes", quantity: qty, active: true, params: { ...common, strike: Number(config.strike), option_type: "call" }});
        addTrade({ id: crypto.randomUUID(), name: "Strangle Put", instrument: "vanilla", method: "black_scholes", quantity: qty, active: true, params: { ...common, strike: Number(config.strike2), option_type: "put" }});
    }
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          <PlusCircle className="w-3 h-3 mr-2" />
          Add Trade
        </Button>
      </SheetTrigger>
      
      <SheetContent className="bg-[#020617] border-l border-white/10 text-white w-[500px] p-0 flex flex-col">
        <div className="p-6 border-b border-white/10 bg-slate-950/50">
            <SheetHeader>
                <SheetTitle className="text-slate-200">Structurer</SheetTitle>
            </SheetHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 dark-scrollbar">
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="w-full bg-slate-900 border border-slate-800">
                <TabsTrigger value="single" className="flex-1 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400">Single</TabsTrigger>
                <TabsTrigger value="straddle" className="flex-1 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400">Straddle</TabsTrigger>
                <TabsTrigger value="strangle" className="flex-1 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400">Strangle</TabsTrigger>
                <TabsTrigger value="condor" className="flex-1 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400">Condor</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode !== "single" && (
              <Button 
                onClick={handleAutoFill} 
                variant="ghost" 
                className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300 transition-all text-xs h-9"
              >
                  <Wand2 className="w-3 h-3 mr-2" />
                  Auto-Calculate Strikes (1σ / 2σ)
              </Button>
          )}

          <div className="space-y-4">
             {/* 1. INSTRUMENT & OPTION TYPE ROW */}
             {mode === "single" && (
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="text-[10px] text-slate-400">Instrument</Label>
                        <Select value={config.instrument} onValueChange={(v) => setConfig({...config, instrument: v})}>
                            <SelectTrigger className="bg-slate-900/50 border-slate-800 h-9 text-sm"><SelectValue /></SelectTrigger>
                            {/* FIX: Explicit colors for dropdown content */}
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                <SelectItem value="vanilla" className="focus:bg-slate-800 focus:text-white cursor-pointer">Vanilla</SelectItem>
                                <SelectItem value="digital" className="focus:bg-slate-800 focus:text-white cursor-pointer">Digital (Binary)</SelectItem>
                                <SelectItem value="barrier" className="focus:bg-slate-800 focus:text-white cursor-pointer">Barrier</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                     {/* FIX: Restored Option Type Selector */}
                     <div className="space-y-1.5">
                        <Label className="text-[10px] text-slate-400">Option Type</Label>
                        <Select value={config.type} onValueChange={(v) => setConfig({...config, type: v})}>
                            <SelectTrigger className="bg-slate-900/50 border-slate-800 h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                <SelectItem value="call" className="focus:bg-slate-800 focus:text-white cursor-pointer">Call</SelectItem>
                                <SelectItem value="put" className="focus:bg-slate-800 focus:text-white cursor-pointer">Put</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                 </div>
             )}

             {config.instrument === "digital" && mode === "single" && (
                 <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded space-y-2">
                     <Label className="text-[10px] text-blue-300">Binary Payout ($)</Label>
                     <Input type="number" className="bg-slate-900/50 border-slate-800" value={config.payout} onChange={e => setConfig({...config, payout: Number(e.target.value)})} />
                 </div>
             )}
             
             {config.instrument === "barrier" && mode === "single" && (
                 <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded space-y-2">
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[10px] text-purple-300">Barrier Level</Label>
                            <Input type="number" className="bg-slate-900/50 border-slate-800" value={config.barrier} onChange={e => setConfig({...config, barrier: Number(e.target.value)})} />
                        </div>
                        <div>
                            <Label className="text-[10px] text-purple-300">Barrier Type</Label>
                            <Select value={config.barrierType} onValueChange={(v) => setConfig({...config, barrierType: v})}>
                                <SelectTrigger className="bg-slate-900/50 border-slate-800 h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                    <SelectItem value="down-out" className="focus:bg-slate-800 focus:text-white cursor-pointer">Down-and-Out</SelectItem>
                                    <SelectItem value="down-in" className="focus:bg-slate-800 focus:text-white cursor-pointer">Down-and-In</SelectItem>
                                    <SelectItem value="up-out" className="focus:bg-slate-800 focus:text-white cursor-pointer">Up-and-Out</SelectItem>
                                    <SelectItem value="up-in" className="focus:bg-slate-800 focus:text-white cursor-pointer">Up-and-In</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                     </div>
                 </div>
             )}

             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><Label className="text-[10px] text-slate-400">Spot</Label><Input type="number" className="bg-slate-900/50 border-slate-800" value={config.spot} onChange={e => setConfig({...config, spot: Number(e.target.value)})} /></div>
                 <div className="space-y-1.5"><Label className="text-[10px] text-slate-400">Vol</Label><Input type="number" className="bg-slate-900/50 border-slate-800" value={config.vol} onChange={e => setConfig({...config, vol: Number(e.target.value)})} /></div>
                 <div className="space-y-1.5"><Label className="text-[10px] text-slate-400">Risk Free Rate</Label><Input type="number" className="bg-slate-900/50 border-slate-800" value={config.rate} onChange={e => setConfig({...config, rate: Number(e.target.value)})} /></div>
                 <div className="space-y-1.5"><Label className="text-[10px] text-slate-400">Div Yield (q)</Label><Input type="number" className="bg-slate-900/50 border-slate-800" value={config.dividend} onChange={e => setConfig({...config, dividend: Number(e.target.value)})} /></div>
                 
                 {/* Only show Strike inputs if NOT Condor (condor handles its own) */}
                 {mode !== "condor" && (
                     <>
                        <div className="space-y-1.5"><Label className="text-[10px] text-slate-400">{mode === 'strangle' ? 'Call Strike' : 'Strike'}</Label><Input type="number" className="bg-slate-900/50 border-slate-800" value={config.strike} onChange={e => setConfig({...config, strike: Number(e.target.value)})} /></div>
                        {mode === 'strangle' && <div className="space-y-1.5"><Label className="text-[10px] text-slate-400">Put Strike</Label><Input type="number" className="bg-slate-900/50 border-slate-800" value={config.strike2} onChange={e => setConfig({...config, strike2: Number(e.target.value)})} /></div>}
                     </>
                 )}
             </div>

             {mode === "condor" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/40 rounded border border-white/5">
                    <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Short Strikes (Inner)</div>
                    <div><Label className="text-[10px] text-slate-400">Call</Label><Input type="number" className="bg-slate-900" value={config.strike} onChange={e => setConfig({...config, strike: Number(e.target.value)})} /></div>
                    <div><Label className="text-[10px] text-slate-400">Put</Label><Input type="number" className="bg-slate-900" value={config.strike2} onChange={e => setConfig({...config, strike2: Number(e.target.value)})} /></div>
                    <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase mt-2">Long Wings (Outer)</div>
                    <div><Label className="text-[10px] text-slate-400">Call Wing</Label><Input type="number" className="bg-slate-900" value={config.strike3} onChange={e => setConfig({...config, strike3: Number(e.target.value)})} /></div>
                    <div><Label className="text-[10px] text-slate-400">Put Wing</Label><Input type="number" className="bg-slate-900" value={config.strike4} onChange={e => setConfig({...config, strike4: Number(e.target.value)})} /></div>
                </div>
             )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-slate-950/50">
            <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium">Add {mode === "single" ? "Leg" : "Strategy"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}