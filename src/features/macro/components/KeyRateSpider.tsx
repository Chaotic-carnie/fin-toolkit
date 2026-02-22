"use client";

import { useMacroStore } from "../store";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

export function KeyRateSpider() {
  const { fiPositions } = useMacroStore();

  // 1. Calculate Sensitivity per Tenor
  // Since we don't have exact tenors for every bond, we bucket them based on Duration approx.
  // 0-1y -> 6M, 1-3y -> 2Y, 3-7y -> 5Y, 7-15y -> 10Y, 15y+ -> 30Y
  const buckets = {
    '6M': 0,
    '2Y': 0,
    '5Y': 0,
    '10Y': 0,
    '30Y': 0
  };

  fiPositions.forEach(p => {
    // DV01 = Dollar Value of a 1bp move
    // DV01 ≈ Notional * Duration * 0.0001
    const dv01 = p.notionalInr * p.modifiedDuration * 0.0001;
    
    if (p.modifiedDuration <= 1.5) buckets['6M'] += dv01;
    else if (p.modifiedDuration <= 3.5) buckets['2Y'] += dv01;
    else if (p.modifiedDuration <= 7.5) buckets['5Y'] += dv01;
    else if (p.modifiedDuration <= 15) buckets['10Y'] += dv01;
    else buckets['30Y'] += dv01;
  });

  // Transform for Recharts
  // We normalize to show "Risk Share" or absolute DV01
  const data = Object.entries(buckets).map(([key, val]) => ({
    subject: key,
    A: Math.abs(val), // Magnitude of risk
    fullMark: Math.max(...Object.values(buckets).map(Math.abs)) * 1.2
  }));

  const totalDv01 = Object.values(buckets).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full flex flex-col p-2">
       <div className="flex justify-between items-start mb-2">
         <div>
            <h4 className="text-sm font-semibold text-slate-200">Key Rate Duration</h4>
            <div className="text-[10px] text-slate-500">Curve Risk Breakdown</div>
         </div>
         <div className="text-right">
             <div className="text-xs text-blue-400 font-mono font-bold">{formatK(totalDv01)}/bp</div>
             <div className="text-[9px] text-slate-500 uppercase">Total DV01</div>
         </div>
       </div>

       <div className="flex-1 min-h-0 -ml-4">
         <ResponsiveContainer width="100%" height="100%">
           <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
             <PolarGrid stroke="#334155" />
             <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
             <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
             <Radar
               name="Risk (DV01)"
               dataKey="A"
               stroke="#3b82f6"
               strokeWidth={2}
               fill="#3b82f6"
               fillOpacity={0.3}
             />
             <Tooltip 
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        return (
                            <div className="bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-200 shadow-xl">
                                <span className="text-blue-400 font-bold">{payload[0].payload.subject}</span> Risk:
                                <div className="font-mono">{formatK(payload[0].value as number)} per bp</div>
                            </div>
                        );
                    }
                    return null;
                }}
             />
           </RadarChart>
         </ResponsiveContainer>
       </div>
    </div>
  );
}

function formatK(n: number) {
    if (Math.abs(n) >= 100000) return (n / 100000).toFixed(1) + "L";
    return (n / 1000).toFixed(1) + "k";
}