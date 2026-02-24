"use client";

import React from "react";
import { cn } from "~/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtSigned = (n: number) => (Math.abs(n) < 1e-5 ? "0.00" : n > 0 ? `+${fmt(n)}` : fmt(n));
const fmtPct = (x: number) => (x === 0 ? "0%" : x > 0 ? `+${(x * 100).toFixed(0)}%` : `${(x * 100).toFixed(0)}%`);

export function ScenarioHeatmap(props: {
  xAxis: number[];
  yAxis: number[];
  grid: { spotShock: number; volShock: number; pnl: number }[][];
}) {
  const { xAxis, yAxis, grid } = props;
  // console.log("HEATMAP COMPONENT RECEIVED GRID:", grid);
  if (!grid || grid.length === 0) {
    return <div className="text-xs text-slate-600 text-center py-10 font-mono uppercase tracking-widest">No Scenario Data</div>;
  }

  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.pnl < min) min = cell.pnl;
      if (cell.pnl > max) max = cell.pnl;
    }
  }

  function cellBgColor(v: number) {
    if (Math.abs(v) < 1e-5) return "rgba(255, 255, 255, 0.02)"; 
    const span = Math.max(1e-9, Math.max(Math.abs(min), Math.abs(max)));
    const t = Math.abs(v) / span; 
    const alpha = 0.05 + 0.35 * Math.min(1, t);
    
    if (v > 0) return `rgba(16, 185, 129, ${alpha})`; 
    return `rgba(244, 63, 94, ${alpha})`; 
  }

  function cellTextColor(v: number) {
    if (Math.abs(v) < 1e-5) return "text-slate-500 font-medium";
    return v > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold";
  }

  return (
    <div className="w-full overflow-x-auto dark-scrollbar pb-2">
      {/* FIX: Added table-fixed and w-full so columns perfectly share space */}
      <table className="w-full text-xs border-separate table-fixed" style={{ borderSpacing: "4px" }}>
        <thead>
          <tr>
            {/* FIX: Locked the first column to w-[80px] so it stops stealing all the width! */}
            <th className="w-[80px] text-left text-slate-500 font-bold text-[9px] uppercase tracking-widest pb-3 pr-4 border-b border-slate-800/50 align-bottom">
              Vol \ Spot
            </th>
            {xAxis.map((x) => (
              <th 
                key={x} 
                className={cn(
                  "text-center font-bold text-[10px] uppercase tracking-widest pb-3 border-b border-slate-800/50",
                  x === 0 ? "text-blue-400" : "text-slate-400"
                )}
              >
                {fmtPct(x)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {yAxis.map((y, i) => (
            <tr key={y}>
              <td className={cn(
                "text-left font-bold text-[10px] uppercase tracking-widest pr-4 py-2 border-r border-slate-800/50 whitespace-nowrap",
                y === 0 ? "text-blue-400" : "text-slate-400"
              )}>
                {fmtPct(y)}
              </td>

              {grid[i]!.map((cell) => {
                const isOrigin = cell.spotShock === 0 && cell.volShock === 0;
                return (
                  <td
                    key={`${cell.spotShock}_${cell.volShock}`}
                    className={cn(
                      "text-center font-mono text-[11px] py-2.5 rounded-md transition-colors hover:ring-1 hover:ring-white/20 cursor-default",
                      cellTextColor(cell.pnl),
                      isOrigin && "ring-1 ring-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    )}
                    style={{ backgroundColor: cellBgColor(cell.pnl) }}
                    title={`Spot: ${fmtPct(cell.spotShock)} | Vol: ${fmtPct(cell.volShock)}\nPnL: ${cell.pnl.toFixed(4)}`}
                  >
                    {fmtSigned(cell.pnl)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}