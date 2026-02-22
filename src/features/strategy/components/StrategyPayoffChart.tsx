// src/features/strategy/components/StrategyPayoffChart.tsx
"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { computePayoffCurve } from "~/features/portfolio/engine";

export function StrategyPayoffChart({ legs, spot, expectedSpot }: { legs: any[], spot: number, expectedSpot: number }) {
  const data = computePayoffCurve(legs, spot);

  return (
    <div className="h-full w-full bg-slate-950/50 rounded-lg p-4 border border-white/5">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="spot" stroke="#475569" fontSize={10} tickFormatter={(v) => v.toFixed(0)} />
          <YAxis stroke="#475569" fontSize={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b" }}
            itemStyle={{ fontSize: "12px" }}
          />
          <ReferenceLine x={spot} stroke="#64748b" label={{ value: "Current", fill: "#64748b", fontSize: 10 }} />
          <ReferenceLine x={expectedSpot} stroke="#3b82f6" label={{ value: "Target", fill: "#3b82f6", fontSize: 10 }} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />
          <Line type="monotone" dataKey="expiryPnl" stroke="#3b82f6" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="currentPnl" stroke="#22d3ee" dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}