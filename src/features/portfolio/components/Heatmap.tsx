"use client";

import React from "react";
import { usePortfolioStore } from "../store";
import { cn } from "@/lib/utils";

const formatPct = (n: number) => (n * 100).toFixed(0) + "%";
const formatMoney = (n: number) => {
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toFixed(0);
};

export function Heatmap() {
  const data = usePortfolioStore((state) => state.heatmap);

  if (!data || !data.grid || data.grid.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-600 space-y-2">
            <span className="text-xs uppercase tracking-widest opacity-50">No Data Available</span>
            <span className="text-[10px]">Add a trade to generate risk matrix</span>
        </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2 px-1">
         <span className="text-[10px] text-slate-500 font-mono">Y: Vol Shock / X: Spot Shock</span>
      </div>
      
      <table className="w-full text-xs border-collapse table-fixed">
        <thead>
          <tr>
            {/* Empty corner */}
            <th className="w-12"></th> 
            {data.xAxis.map((x, i) => (
              <th key={i} className="pb-2 text-slate-500 font-mono text-[10px]">
                {x > 0 ? "+" : ""}{formatPct(x)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.grid.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {/* Y-Axis Label */}
              <td className="pr-2 text-slate-500 font-mono text-[10px] text-right">
                {data.yAxis[rowIndex] > 0 ? "+" : ""}{formatPct(data.yAxis[rowIndex])}
              </td>
              
              {/* Cells */}
              {row.map((cell, colIndex) => {
                // Safe check for NaN
                const val = isNaN(cell.pnl) ? 0 : cell.pnl;
                const isProfitable = val > 0;
                const isZero = Math.abs(val) < 1;
                
                // Calculate color intensity (capped at $2000 move for demo)
                const intensity = Math.min(Math.abs(val) / 2000, 1); 
                const opacity = Math.max(0.1, intensity * 0.8);

                return (
                  <td key={colIndex} className="p-0.5">
                    <div 
                      className={cn(
                        "h-8 flex items-center justify-center rounded text-[10px] font-mono transition-all",
                        isZero ? "text-slate-600 bg-slate-900/50" : 
                        isProfitable ? "text-emerald-300" : "text-rose-300"
                      )}
                      style={{
                        backgroundColor: isZero ? undefined : 
                            isProfitable 
                            ? `rgba(5, 150, 105, ${opacity})` 
                            : `rgba(225, 29, 72, ${opacity})`
                      }}
                    >
                      {isZero ? "-" : formatMoney(val)}
                    </div>
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