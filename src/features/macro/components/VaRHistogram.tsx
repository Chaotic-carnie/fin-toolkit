"use client";

import { useEffect, useState, useMemo } from "react";
import { useMacroStore } from "../store";
import { getHistoricalReturns } from "@/features/macro/actions";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { Loader2 } from "lucide-react";

export function VaRHistogram() {
  const { fiPositions, fxPositions, hydrated } = useMacroStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load History on Mount
  useEffect(() => {
    getHistoricalReturns().then(res => {
      if (res.success && res.data) setHistory(res.data);
      setLoading(false);
    });
  }, []);

  // 2. Run Historical Simulation (Memoized for performance)
  const simulation = useMemo(() => {
    if (!history.length || !hydrated) return null;

    const pnlScenarios = history.map(day => {
      let dailyPnl = 0;

      // Bond PnL (Using 10Y change as proxy for whole curve parallel shift)
      fiPositions.forEach(p => {
        // PnL ≈ -Notional * Duration * Δy
        // We use the historical 10Y change for long bucket, 3M for short
        const shock = p.bucket === 'short' ? day.d_3m : day.d_10y;
        dailyPnl += -1 * p.notionalInr * p.modifiedDuration * (shock / 10000);
      });

      // FX PnL
      fxPositions.forEach(p => {
        // PnL ≈ Notional * Spot * %Change
        // Using approximate spot 83 for simulation speed
        dailyPnl += p.notionalUsd * 83 * (day.d_fx_pct / 100);
      });

      return dailyPnl;
    });

    // Sort to find percentiles
    pnlScenarios.sort((a, b) => a - b);
    
    // 95% VaR is the 5th percentile (index 0.05 * N)
    const idx95 = Math.floor(pnlScenarios.length * 0.05);
    const var95 = pnlScenarios[idx95];
    const idx99 = Math.floor(pnlScenarios.length * 0.01);
    const var99 = pnlScenarios[idx99];

    // Build Histogram Data (20 Bins)
    const min = pnlScenarios[0];
    const max = pnlScenarios[pnlScenarios.length - 1];
    const range = max - min;
    const binSize = range / 20;
    
    const bins = Array.from({ length: 20 }, (_, i) => ({
      binStart: min + (i * binSize),
      count: 0,
      label: formatK(min + (i * binSize))
    }));

    pnlScenarios.forEach(val => {
      const binIdx = Math.min(19, Math.floor((val - min) / binSize));
      bins[binIdx].count++;
    });

    return { bins, var95, var99, maxLoss: min, maxGain: max };

  }, [history, fiPositions, fxPositions, hydrated]);

  function formatK(n: number) {
    if (Math.abs(n) >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
    if (Math.abs(n) >= 100000) return (n / 100000).toFixed(1) + "L";
    return (n / 1000).toFixed(0) + "k";
  }

  if (loading) return <div className="flex h-full items-center justify-center text-xs text-slate-500"><Loader2 className="animate-spin mr-2 h-4 w-4"/> Loading History...</div>;
  if (!simulation) {
    if (!hydrated) return <div className="text-xs text-center p-4">Initializing...</div>;
    if (history.length === 0) return <div className="text-xs text-center p-4 text-rose-400">History Data Missing</div>;
    return <div className="text-xs text-center p-4 text-slate-500">No Risk Detected (Add Positions)</div>;
}
  return (
    <div className="h-full flex flex-col p-2">
       <div className="flex justify-between items-start mb-4">
         <div>
            <h4 className="text-sm font-semibold text-slate-200">Value at Risk (VaR)</h4>
            <div className="text-[10px] text-slate-500">Historical Simulation (1Y)</div>
         </div>
         <div className="text-right">
            <div className="text-xs text-rose-400 font-mono font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(simulation.var95)}</div>
            <div className="text-[9px] text-slate-500 uppercase">95% Confidence (1-Day)</div>
         </div>
       </div>

       <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={simulation.bins} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <Tooltip 
                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                    return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl">
                           <div className="text-xs text-slate-300">PnL Range: <span className="font-mono text-white">{payload[0].payload.label}</span></div>
                           <div className="text-xs text-slate-400">Frequency: <span className="font-mono text-white">{payload[0].value} days</span></div>
                        </div>
                    );
                    }
                    return null;
                }}
              />
              <XAxis dataKey="label" hide />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              
              {/* Draw the VaR Line */}
              <ReferenceLine x={simulation.bins.find(b => b.binStart >= simulation.var95)?.label} stroke="#f43f5e" strokeDasharray="3 3" />
              
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {simulation.bins.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.binStart < 0 ? '#ef4444' : '#10b981'} 
                    opacity={entry.binStart < simulation.var95 ? 0.8 : 0.3} // Highlight tail risk
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
}