// src/app/strategy/custom/page.tsx
"use client";

import React from "react";
import { useStrategyBuilderStore } from "~/features/strategy/store";
import { StrategyPayoffChart } from "~/features/strategy/components/StrategyPayoffChart";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Trash2, Plus, Zap } from "lucide-react";

export default function CustomStrategyPage() {
  const { draftLegs, updateLegStrike, removeLeg, addLeg } = useStrategyBuilderStore();
  const spot = 22450; // In a real app, pull from a live ticker store

  return (
    <main className="flex flex-col h-screen pt-16 bg-[#020617] text-white">
      <div className="flex-1 flex overflow-hidden">
        
        {/* Interaction Panel */}
        <section className="flex-1 flex flex-col min-w-0">
          <div className="p-6 border-b border-white/5 bg-slate-900/10 flex justify-between items-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">
              Custom <span className="text-blue-600">Workbench</span>
            </h1>
            <Button size="sm" className="bg-emerald-600">
              Analyze Strategy <Zap className="ml-2 w-3 h-3" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Dynamic Chart */}
            
            <div className="h-[450px] w-full">
              <StrategyPayoffChart legs={draftLegs} spot={spot} expectedSpot={spot * 1.05} />
            </div>

            {/* Manual Leg Editor */}
            <div className="grid grid-cols-1 gap-3">
              {draftLegs.map((leg) => (
                <div key={leg.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Instrument</span>
                    <div className="text-sm font-bold uppercase">{leg.params.option_type} @ {leg.params.strike}</div>
                  </div>
                  
                  <div className="w-32">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Strike</label>
                    <Input 
                      type="text" 
                      inputMode="decimal"
                      value={leg.params.strike}
                      className="h-8 bg-black/40 border-white/10 font-mono"
                      onChange={(e) => updateLegStrike(leg.id, parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => removeLeg(leg.id)} className="text-rose-500 hover:bg-rose-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" className="border-dashed border-white/20 h-12 text-slate-400" onClick={() => {/* Add generic leg logic */}}>
                <Plus className="mr-2 w-4 h-4" /> Add Leg
              </Button>
            </div>
          </div>
        </section>

        {/* Real-time Greeks & Risk Sidebar */}
        <aside className="w-80 border-l border-white/5 p-6 bg-slate-950/40">
           <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Aggregate Greeks</h2>
           <div className="space-y-4 font-mono">
              <GreekRow label="Delta (Δ)" value={0.45} color="text-emerald-400" />
              <GreekRow label="Gamma (Γ)" value={0.002} color="text-blue-400" />
              <GreekRow label="Vega (ν)" value={12.4} color="text-purple-400" />
              <GreekRow label="Theta (θ)" value={-4.5} color="text-rose-400" />
           </div>
        </aside>
      </div>
    </main>
  );
}

function GreekRow({ label, value, color }: any) {
  return (
    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
      <span className="text-slate-500 uppercase font-bold">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}