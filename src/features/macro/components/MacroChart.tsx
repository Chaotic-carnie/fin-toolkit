"use client";

import { useMacroStore } from "../store";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

function calculateNelsonSiegel(t: number, shortYield: number, longYield: number): number {
  if (t === 0) return shortYield;
  const lambda = 0.5; 
  const b0 = longYield; 
  const b1 = shortYield - longYield; 
  const b2 = 1.5; 

  const term1 = (1 - Math.exp(-lambda * t)) / (lambda * t);
  const term2 = term1 - Math.exp(-lambda * t);
  return b0 + (b1 * term1) + (b2 * term2);
}

export function MacroChart() {
  const { baseData, shocks } = useMacroStore();

  if (!baseData || !baseData.inr3m) return <div className="text-slate-500 text-xs">Loading Market Data...</div>;

  const baseShort = baseData.inr3m;
  const baseLong = baseData.inr10y;
  
  // FIX: Pulling from the new shock keys
  const shockedShort = baseShort + (shocks.rate3mBps / 100);
  const shockedLong = baseLong + (shocks.rate10yBps / 100);

  const tenors = [
    { name: '3M', t: 0.25 }, { name: '1Y', t: 1 }, { name: '2Y', t: 2 }, 
    { name: '3Y', t: 3 }, { name: '5Y', t: 5 }, { name: '7Y', t: 7 }, 
    { name: '10Y', t: 10 }, { name: '15Y', t: 15 }, { name: '30Y', t: 30 }
  ];

  const data = tenors.map(pt => ({
    name: pt.name,
    Base: Number(calculateNelsonSiegel(pt.t, baseShort, baseLong).toFixed(2)),
    Scenario: Number(calculateNelsonSiegel(pt.t, shockedShort, shockedLong).toFixed(2))
  }));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
         <h4 className="text-sm font-semibold text-slate-300">Nelson-Siegel Yield Curve</h4>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Line name="Current" type="monotone" dataKey="Base" stroke="#3b82f6" strokeWidth={3} dot={false} />
            <Line name="Stressed" type="monotone" dataKey="Scenario" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}