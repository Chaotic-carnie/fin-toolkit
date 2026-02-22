"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Legend } from "recharts";
import { usePortfolioStore } from "../store";

export function PayoffChart() {
  const data = usePortfolioStore((state) => state.payoffDiagram);

  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-600 text-center mt-10">Add trades to see payoff profile</div>;
  }

  // Auto-scale Y-axis
  const allValues = data.flatMap(d => [d.expiryPnl, d.currentPnl]);
  const minPnL = Math.min(...allValues);
  const maxPnL = Math.max(...allValues);
  const padding = (maxPnL - minPnL) * 0.1;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          
          <XAxis 
            dataKey="spot" 
            stroke="#475569" 
            tick={{ fill: '#475569', fontSize: 10 }}
            tickFormatter={(val) => val.toFixed(0)}
          />
          
          <YAxis 
            stroke="#475569" 
            tick={{ fill: '#475569', fontSize: 10 }}
            domain={[minPnL - padding, maxPnL + padding]}
            width={40}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
            itemStyle={{ color: '#94a3b8' }}
            formatter={(val: number) => val.toFixed(2)}
            labelFormatter={(label) => `Spot: ${Number(label).toFixed(2)}`}
          />
          
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
          
          {/* T+Now Line (The Curve) */}
          <Line 
            name="T+0 (Today)"
            type="monotone" 
            dataKey="currentPnl" 
            stroke="#22d3ee" // Cyan
            strokeWidth={2} 
            strokeDasharray="5 5"
            dot={false}
          />

          {/* Expiration Line (The Hard Edge) */}
          <Line 
            name="Expiration"
            type="monotone" 
            dataKey="expiryPnl" 
            stroke="#3b82f6" // Blue
            strokeWidth={2} 
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}