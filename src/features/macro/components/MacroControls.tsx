"use client";

import { useState, useEffect } from "react";
import { useMacroStore } from "../store";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function MacroControls() {
  const { shocks, setShocks } = useMacroStore();

  const Control = ({ label, value, min, max, step, field, unit = "" }: any) => {
    // Local state exclusively for smooth dragging
    const [localVal, setLocalVal] = useState(value);

    // Sync if global state changes (e.g., from the Reset button)
    useEffect(() => { setLocalVal(value); }, [value]);

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <Label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</Label>
          <span className={`text-xs font-mono ${localVal > 0 ? 'text-emerald-400' : localVal < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
            {localVal > 0 ? "+" : ""}{localVal}{unit}
          </span>
        </div>
        
        {/* FIX: onValueChange handles UI drag (60fps), onValueCommit handles the math (only on release) */}
        <Slider 
          min={min} max={max} step={step} 
          value={[localVal]} 
          onValueChange={(val) => setLocalVal(val[0])}
          onValueCommit={(val) => setShocks({ [field]: val[0] })}
          className="py-1 cursor-pointer" 
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 px-1">
      {/* Sovereign Curve */}
      <Control label="3M Rate" value={shocks.rate3mBps} min={-200} max={200} step={5} field="rate3mBps" unit=" bps" />
      <Control label="2Y Rate" value={shocks.rate2yBps} min={-200} max={200} step={5} field="rate2yBps" unit=" bps" />
      <Control label="5Y Rate" value={shocks.rate5yBps} min={-200} max={200} step={5} field="rate5yBps" unit=" bps" />
      <Control label="10Y Rate" value={shocks.rate10yBps} min={-200} max={200} step={5} field="rate10yBps" unit=" bps" />

      {/* Risk Assets */}
      <Control label="Equity Market" value={shocks.equityShockPct} min={-40} max={40} step={1} field="equityShockPct" unit="%" />
      <Control label="Implied Vol (VIX)" value={shocks.volShockPts} min={-10} max={80} step={1} field="volShockPts" unit=" pts" />
      
      {/* Spread & FX */}
      <Control label="FX (USD/INR)" value={shocks.fxShockPct} min={-15} max={15} step={0.5} field="fxShockPct" unit="%" />
      <Control label="Credit Spreads" value={shocks.creditSpreadBps} min={-50} max={400} step={10} field="creditSpreadBps" unit=" bps" />
    </div>
  );
}