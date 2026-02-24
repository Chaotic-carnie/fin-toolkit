"use client";

import React from "react";
import type { PayoffSpec, PayoffTemplateKey, PayoffTemplate } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Info } from "lucide-react";

const TEMPLATE_LABEL: Record<PayoffTemplateKey, string> = {
  custom_points: "Custom (Points)",
  spike: "Spike (Butterfly-like)",
  digital_step: "Digital Step",
  capped_call: "Capped Call",
  capped_put: "Capped Put",
  corridor: "Corridor",
};

function defaultTemplate(key: PayoffTemplateKey): PayoffTemplate {
  switch (key) {
    case "spike": return { key, params: { center: 100, width: 10, height: 100 } };
    case "digital_step": return { key, params: { strike: 100, payout: 100 } };
    case "capped_call": return { key, params: { strike: 100, cap: 50 } };
    case "capped_put": return { key, params: { strike: 100, cap: 50 } };
    case "corridor": return { key, params: { lo: 90, hi: 110, payout: 50 } };
    case "custom_points":
    default: return { key: "custom_points", params: {} };
  }
}

export function PayoffSpecPanel(props: { payoff: PayoffSpec; onChange: (p: PayoffSpec) => void }) {
  const { payoff } = props;

  const setPayoff = (patch: Partial<PayoffSpec>) => props.onChange({ ...payoff, ...patch });

  const points = payoff.points ?? [
    { spot: 80, payoff: 0 },
    { spot: 100, payoff: 20 },
    { spot: 120, payoff: 0 },
  ];

  const mode = payoff.template ? "template" : "points";

  return (
    <div className="space-y-6">
      
      {/* SCALE ROW */}
      <div className="flex flex-col gap-2 p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
        <div className="flex justify-between items-center">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payoff Scale Multiplier</Label>
            {/* FIX: Forced dark mode inputs using ! modifiers */}
            <Input
              type="number"
              value={payoff.scale}
              step="0.1"
              onChange={(e) => setPayoff({ scale: Number(e.target.value) })}
              className="h-7 w-20 text-right !bg-[#020617] !border-slate-700 !text-white font-mono text-xs focus:!border-blue-500"
            />
        </div>
        <div className="flex items-start gap-2 text-[9px] text-slate-500 leading-tight">
          <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
          <p>Scale lets you resolve "shape vs budget" contradictions by mathematically expanding or shrinking the curve amplitude.</p>
        </div>
      </div>

      {/* MODE SWITCHER */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
             <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Architecture Mode</Label>
        </div>

        <div className="flex bg-[#0a0f1a] border border-slate-800 p-1 rounded-md">
            <button
              onClick={() => setPayoff({ template: undefined, points })}
              className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                mode === "points" 
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                  : "text-slate-500 hover:text-slate-300 bg-transparent"
              }`}
            >
              Control Points
            </button>
            <button
              onClick={() => setPayoff({ template: defaultTemplate("spike"), points: undefined })}
              className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                mode === "template" 
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                  : "text-slate-500 hover:text-slate-300 bg-transparent"
              }`}
            >
              Template
            </button>
        </div>

        {/* POINTS CONTENT */}
        {mode === "points" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
              Define piecewise-linear vertices
            </div>

            <div className="space-y-2">
              {points.map((pt, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 uppercase z-10">Spot</span>
                      <Input
                        type="number"
                        value={pt.spot}
                        onChange={(e) => {
                          const next = [...points];
                          next[idx] = { ...next[idx]!, spot: Number(e.target.value) };
                          setPayoff({ points: next, template: undefined });
                        }}
                        className="h-8 pl-12 !bg-[#020617] !border-slate-800 !text-white font-mono text-xs focus:!border-blue-500"
                      />
                  </div>
                  
                  <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 uppercase z-10">P/L</span>
                      <Input
                        type="number"
                        value={pt.payoff}
                        onChange={(e) => {
                          const next = [...points];
                          next[idx] = { ...next[idx]!, payoff: Number(e.target.value) };
                          setPayoff({ points: next, template: undefined });
                        }}
                        className="h-8 pl-10 !bg-[#020617] !border-slate-800 !text-white font-mono text-xs focus:!border-blue-500"
                      />
                  </div>

                  {/* FIX: Forced Transparent Dark Mode button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 !text-slate-500 hover:!bg-rose-500/20 hover:!text-rose-400 !border-transparent shrink-0 !bg-transparent"
                    onClick={() => {
                      const next = points.filter((_, i) => i !== idx);
                      setPayoff({ points: next, template: undefined });
                    }}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* FIX: Forced Transparent Dark Mode button */}
            <Button
              variant="outline"
              className="w-full h-8 !border-dashed !border-slate-700 hover:!border-blue-500 !text-slate-400 hover:!text-blue-400 hover:!bg-blue-500/10 !bg-transparent text-[10px] font-bold uppercase tracking-widest transition-all"
              onClick={() => {
                const last = points[points.length - 1] ?? { spot: 100, payoff: 0 };
                setPayoff({ points: [...points, { spot: last.spot * 1.05, payoff: last.payoff }], template: undefined });
              }}
            >
              <Plus className="w-3 h-3 mr-2" /> Add Vertex
            </Button>
          </div>
        )}

        {/* TEMPLATE CONTENT */}
        {mode === "template" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
               <Label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Standard Form</Label>
               {/* FIX: Forced dark mode on Select components */}
               <Select
                 value={payoff.template?.key ?? "spike"}
                 onValueChange={(v) => {
                   const key = v as PayoffTemplateKey;
                   setPayoff({ template: defaultTemplate(key), points: undefined });
                 }}
               >
                 <SelectTrigger className="h-9 !bg-[#020617] !border-slate-800 !text-white text-xs">
                   <SelectValue placeholder="Select template" />
                 </SelectTrigger>
                 <SelectContent className="!bg-[#020617] !border-slate-800 !text-white shadow-xl border shadow-black">
                   {Object.keys(TEMPLATE_LABEL).map((k) => (
                     <SelectItem key={k} value={k} className="text-xs focus:!bg-blue-600/30 focus:!text-blue-400 cursor-pointer !text-slate-200">
                       {TEMPLATE_LABEL[k as PayoffTemplateKey]}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>

            <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
                <TemplateParamsEditor
                  tpl={payoff.template ?? defaultTemplate("spike")}
                  onChange={(tpl) => setPayoff({ template: tpl, points: undefined })}
                />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function TemplateParamsEditor(props: { tpl: PayoffTemplate; onChange: (t: PayoffTemplate) => void }) {
  const { tpl } = props;
  const set = (k: string, v: number) => props.onChange({ ...tpl, params: { ...tpl.params, [k]: v } });

  const fields: { key: string; label: string; step?: string }[] = (() => {
    switch (tpl.key) {
      case "spike": return [ { key: "center", label: "Center" }, { key: "width", label: "Width" }, { key: "height", label: "Height" }, ];
      case "digital_step": return [ { key: "strike", label: "Strike" }, { key: "payout", label: "Payout" }, ];
      case "capped_call":
      case "capped_put": return [ { key: "strike", label: "Strike" }, { key: "cap", label: "Cap" }, ];
      case "corridor": return [ { key: "lo", label: "Low" }, { key: "hi", label: "High" }, { key: "payout", label: "Payout" }, ];
      default: return [];
    }
  })();

  if (!fields.length) {
    return <div className="text-[10px] text-slate-500 py-2">No parameters required for this geometric template.</div>;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5 relative">
          <Label className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 uppercase z-10">{f.label}</Label>
          {/* FIX: Forced dark mode inputs using ! modifiers */}
          <Input
            type="number"
            value={tpl.params[f.key] ?? ""}
            step={f.step ?? "1"}
            onChange={(e) => set(f.key, Number(e.target.value))}
            className="h-8 pl-[4.5rem] !bg-[#020617] !border-slate-700 !text-white font-mono text-xs focus:!border-blue-500 relative"
          />
        </div>
      ))}
    </div>
  );
}