"use client";

import { useMacroStore } from "../store";
import { calculateBondPnL, calculateFxPnL, calculateEquityPnL, calculateCreditPnL, calculateOptionPnL } from "../engine";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

export function PnLAttribution() {
  const s = useMacroStore();
  if (!s.hydrated) return <div className="text-xs text-slate-500">Loading Attribution...</div>;

  let bond = 0, fx = 0, eq = 0, cr = 0, opt = 0;
  s.fiPositions.forEach(p => bond += calculateBondPnL(p, s.shocks).pnl);
  s.fxPositions.forEach(p => fx += calculateFxPnL(p, s.shocks, s.baseData.usdinr, s.baseData.inr3m).pnl);
  s.eqPositions.forEach(p => eq += calculateEquityPnL(p, s.shocks).pnl);
  s.crPositions.forEach(p => cr += calculateCreditPnL(p, s.shocks).pnl);
  s.optPositions.forEach(p => opt += calculateOptionPnL(p, s.shocks).pnl);

  const data = [
    { name: "Rates", value: bond },
    { name: "FX", value: fx },
    { name: "Equity", value: eq },
    { name: "Credit", value: cr },
    { name: "Volatility", value: opt },
  ];

  // If all values are exactly 0, Recharts collapses the X-Axis. This forces it open.
  const isZeroed = data.every(d => d.value === 0);

  return (
    <div className="w-full h-full flex flex-col">
       <div className="flex justify-between items-center mb-4">
         <h4 className="text-sm font-semibold text-slate-300">Risk Attribution</h4>
       </div>
       <div className="flex-1 w-full min-h-0 -ml-4 relative">
          
          {isZeroed && (
             <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <span className="text-xs text-slate-600 bg-slate-900/80 px-3 py-1 rounded-full">Apply shocks to view attribution</span>
             </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 30, bottom: 0 }}>
                {/* FIX: Set a default domain if everything is 0 */}
                <XAxis type="number" hide domain={isZeroed ? [-100, 100] : ['auto', 'auto']} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  content={({ active, payload }) => {
                     if (active && payload && payload.length) {
                       return (
                         <div className="bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-200">
                           <span className="font-semibold">{payload[0].payload.name}: </span>
                           <span className="font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(payload[0].value as number)}</span>
                         </div>
                       );
                     }
                     return null;
                  }}
                />
                <ReferenceLine x={0} stroke="#334155" />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
             </BarChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
}