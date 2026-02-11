"use client";

import { useMacroStore } from "../store";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';

export function MacroChart() {
  const { baseData, shocks } = useMacroStore();

  if (!baseData || !baseData.inr3m) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 animate-pulse">
        Initializing Market Data...
      </div>
    );
  }

  const baseShort = baseData.inr3m;
  const baseLong = baseData.inr10y;
  const shockedShort = baseShort + (shocks.shortRateBps / 100);
  const shockedLong = baseLong + (shocks.longRateBps / 100);

  // Generate smooth curve points
  const generateCurve = (s: number, l: number) => [
    { name: '3M',  yield: s },
    { name: '6M',  yield: s + (l - s) * 0.1 },
    { name: '1Y',  yield: s + (l - s) * 0.2 },
    { name: '2Y',  yield: s + (l - s) * 0.35 },
    { name: '5Y',  yield: s + (l - s) * 0.65 },
    { name: '10Y', yield: l },
    { name: '30Y', yield: l + 0.2 }, // Synthetic 30Y point
  ];

  const baseCurve = generateCurve(baseShort, baseLong);
  const shockedCurve = generateCurve(shockedShort, shockedLong);

  const data = baseCurve.map((pt, i) => ({
    name: pt.name,
    Base: Number(pt.yield.toFixed(2)),
    Shocked: Number(shockedCurve[i].yield.toFixed(2))
  }));

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-2">
         <h4 className="text-sm font-semibold text-slate-300">Sovereign Yield Curve (India)</h4>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
            />
            <YAxis 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(val) => `${val}%`}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                cursor={{ stroke: '#475569', strokeWidth: 1 }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            
            <Line 
                name="Current Market"
                type="monotone" 
                dataKey="Base" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#1e3a8a', strokeWidth: 0 }} 
                activeDot={{ r: 6 }}
            />
            
            <Line 
                name="Scenario"
                type="monotone" 
                dataKey="Shocked" 
                stroke="#10b981" 
                strokeWidth={3} 
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#064e3b', strokeWidth: 0 }} 
                activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}