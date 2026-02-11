"use client";

import { useMacroStore } from "../store";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function MacroControls() {
  const { shocks, setShocks, totalPnl } = useMacroStore();

  return (
    <div className="flex flex-col gap-8">
      {/* 1. RATE SHOCKS */}
      <div className="space-y-6">
        {/* Short Rate */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label className="text-blue-300 font-semibold text-xs uppercase tracking-wide">Short Rate (3M)</Label>
                <Badge variant="outline" className="font-mono text-blue-200 border-blue-800 bg-blue-950/30">
                    {shocks.shortRateBps > 0 ? '+' : ''}{shocks.shortRateBps} bps
                </Badge>
            </div>
            <Slider 
                value={[shocks.shortRateBps]} 
                min={-200} max={200} step={5}
                onValueChange={([v]) => setShocks({ shortRateBps: v })}
                className="py-2" 
            />
        </div>

        {/* Long Rate */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label className="text-blue-300 font-semibold text-xs uppercase tracking-wide">Long Yield (10Y)</Label>
                <Badge variant="outline" className="font-mono text-blue-200 border-blue-800 bg-blue-950/30">
                    {shocks.longRateBps > 0 ? '+' : ''}{shocks.longRateBps} bps
                </Badge>
            </div>
            <Slider 
                value={[shocks.longRateBps]} 
                min={-200} max={200} step={5}
                onValueChange={([v]) => setShocks({ longRateBps: v })}
                className="py-2"
            />
        </div>
      </div>

      <div className="h-px bg-white/5 w-full" />

      {/* 2. FX SHOCKS */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-emerald-300 font-semibold text-xs uppercase tracking-wide">USD/INR Spot Shock</Label>
          <Badge variant="outline" className="font-mono text-emerald-200 border-emerald-800 bg-emerald-950/30">
            {shocks.fxShockPct > 0 ? '+' : ''}{shocks.fxShockPct}%
          </Badge>
        </div>
        <Slider 
          value={[shocks.fxShockPct]} 
          min={-10} max={10} step={0.5}
          onValueChange={([v]) => setShocks({ fxShockPct: v })}
          className="py-2"
        />
      </div>

      <div className="h-px bg-white/5 w-full" />

      {/* 3. TIME MACHINE */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-amber-300 font-semibold text-xs uppercase tracking-wide">Carry Horizon</Label>
          <span className="font-mono text-xs text-amber-200/70 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
            {shocks.horizonDays} Days
          </span>
        </div>
        <Slider 
          value={[shocks.horizonDays]} 
          min={0} max={365} step={1}
          onValueChange={([v]) => setShocks({ horizonDays: v })}
          className="py-2"
        />
        <p className="text-[10px] text-slate-500 pt-1">
            Simulates time decay (Theta) and carry accumulation over {shocks.horizonDays} days.
        </p>
      </div>

       {/* TOTAL IMPACT */}
       <div className="mt-4 p-5 bg-slate-950 rounded-xl border border-slate-800 shadow-inner text-center">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">Net P&L Impact</div>
        <div className={`text-3xl font-mono font-bold tracking-tight ${totalPnl >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]'}`}>
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPnl)}
        </div>
      </div>
    </div>
  );
}