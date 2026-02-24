"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";

import type { PayoffCurvePoint } from "../types";

/**
 * Institutional-grade Payoff chart with 3 curves:
 * - Today PV (T+0)
 * - Expiry payoff
 * - Optional target payoff overlay (payoff spec)
 */
export function ComposerPayoffChart(props: { data: PayoffCurvePoint[]; showExpiry?: boolean }) {
  const data = props.data;
  const showExpiry = props.showExpiry ?? true;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-600 font-mono uppercase tracking-widest">
        Awaiting Portfolio Compilation
      </div>
    );
  }

  // Calculate strict min/max boundaries to keep the chart framed tightly
  const allValues = data.flatMap((d) => {
    const arr = [d.currentPnl];
    if (typeof d.targetPayoff === "number") arr.push(d.targetPayoff);
    if (showExpiry) arr.push(d.expiryPnl);
    return arr;
  });
  
  const minPnL = Math.min(...allValues, 0);
  const maxPnL = Math.max(...allValues, 0);
  // Guarantee padding even if the chart is perfectly flat at 0
  const padding = Math.max((maxPnL - minPnL) * 0.1, 10);

  const hasTarget = data.some((d) => typeof d.targetPayoff === "number");

  const formatMoney = (val: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  const formatSpot = (val: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(val);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          {/* Subtle grid lines matching the dark aesthetic */}
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

          <XAxis
            dataKey="spot"
            stroke="#475569"
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(val) => Number(val).toFixed(0)}
            tickMargin={10}
            axisLine={{ stroke: "#334155" }}
          />

          <YAxis
            stroke="#475569"
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(val) => Number(val).toFixed(0)}
            domain={[minPnL - padding, maxPnL + padding]}
            width={50}
            tickMargin={5}
            axisLine={false}
          />

          {/* Upgraded Terminal Tooltip */}
          <Tooltip
            contentStyle={{ 
              backgroundColor: "#020617", 
              borderColor: "#1e293b", 
              borderRadius: "6px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
              padding: "10px",
            }}
            labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}
            itemStyle={{ fontFamily: "monospace", fontSize: "11px", paddingVertical: "2px" }}
            formatter={(val: number) => (val > 0 ? `+${formatMoney(val)}` : formatMoney(val))}
            labelFormatter={(label) => `Spot @ ${formatSpot(Number(label))}`}
          />

          <Legend 
            wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", paddingTop: "15px" }} 
            iconType="circle"
            iconSize={6}
          />

          {/* Zero PnL Reference Line */}
          <ReferenceLine y={0} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />

          {/* T+0 Line (Cyan Dash) */}
          <Line
            name="T+0 (Today PV)"
            type="monotone"
            dataKey="currentPnl"
            stroke="#06b6d4"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 4, fill: "#06b6d4", stroke: "#020617", strokeWidth: 2 }}
          />

          {/* Expiration Line (Solid Blue) */}
          {showExpiry && (
            <Line
              name="Expiration (Intrinsic)"
              type="monotone"
              dataKey="expiryPnl"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6", stroke: "#020617", strokeWidth: 2 }}
            />
          )}

          {/* Target Profile Overlay (Dashed Fuchsia) */}
          {hasTarget && (
            <Line
              name="Target Architecture"
              type="monotone"
              dataKey="targetPayoff"
              stroke="#d946ef"
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={false}
              activeDot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}