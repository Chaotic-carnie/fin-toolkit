// src/features/composer/components/CurvatureChart.tsx

"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

import type { CurvaturePoint } from "../types";

/**
 * Curvature / "butterfly weight" chart.
 *
 * In the discrete call-replication identity, the quantities on calls are
 * slope jumps (second difference / curvature). A tight butterfly approximates
 * a spike in curvature, and a Riemann sum of spikes recreates an arbitrary shape.
 */
export function CurvatureChart(props: { data: CurvaturePoint[] }) {
  const data = props.data;

  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-600 text-center mt-10">No curvature data</div>;
  }

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.weight)), 1e-9);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={1}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

          <XAxis
            dataKey="strike"
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickFormatter={(val) => Number(val).toFixed(0)}
          />

          <YAxis
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            domain={[-maxAbs * 1.2, maxAbs * 1.2]}
            width={48}
          />

          <Tooltip
            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px" }}
            itemStyle={{ color: "#94a3b8" }}
            formatter={(val: number) => Number(val).toFixed(4)}
            labelFormatter={(label) => `Strike: ${Number(label).toFixed(0)}`}
          />

          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

          <Bar dataKey="weight" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
