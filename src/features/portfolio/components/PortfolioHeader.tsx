"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { usePortfolioStore } from "../store";
import { cn } from "@/lib/utils";

const formatCurrency = (val: number) => 
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

// NEW: Smart Formatter
// If number is small (like Bitcoin Gamma), show 5 decimals.
// If number is normal (like Delta), show 2 decimals.
const smartFormat = (val: number) => {
    if (Math.abs(val) === 0) return "0.00";
    if (Math.abs(val) < 0.01) {
        return new Intl.NumberFormat("en-US", { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(val);
    }
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

export function PortfolioHeader() {
  const metrics = usePortfolioStore((state) => state.metrics);

  if (!metrics) {
    return (
      <header className="h-20 border-b border-white/10 bg-[#020617]/80 backdrop-blur-xl flex items-center px-6">
        <div className="text-muted-foreground text-sm font-mono animate-pulse">
          Initialized... Waiting for trades.
        </div>
      </header>
    );
  }

  const { totalValue, netGreeks, var95, maxProfit, maxLoss } = metrics;
  const isProfit = totalValue >= 0;

  return (
    <header className="h-20 shrink-0 border-b border-white/10 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 shadow-2xl">
      
      {/* LEFT: Net Liquidation Value */}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">
          Net Liq Value
        </span>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-3xl font-mono font-bold tracking-tighter",
            isProfit ? "text-emerald-400" : "text-rose-500"
          )}>
            {formatCurrency(totalValue)}
          </span>
          <span className="text-xs text-slate-500 font-mono">USD</span>
        </div>
      </div>

      {/* CENTER: Risk Dashboard */}
      <div className="flex items-center gap-8">
        <RiskMetric label="Delta" value={netGreeks.delta} suffix="Δ" color={netGreeks.delta > 0 ? "text-blue-400" : "text-rose-400"} />
        <RiskMetric label="Gamma" value={netGreeks.gamma} suffix="Γ" color="text-purple-400" />
        <RiskMetric label="Vega" value={netGreeks.vega} suffix="ν" color="text-yellow-400" />
        <RiskMetric label="Theta" value={netGreeks.theta} suffix="Θ" color={netGreeks.theta > 0 ? "text-emerald-400" : "text-rose-400"} />
      </div>

      {/* RIGHT: Stats & VaR */}
      <div className="flex items-center gap-6 border-l border-white/10 pl-6">
        
        {/* Max P/L Stats */}
        <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Max Risk</span>
            <div className="flex gap-4 text-xs font-mono">
                <div className="flex items-center gap-1">
                    <span className="text-slate-600">Max+:</span>
                    <span className="text-emerald-400">
                        {maxProfit === null ? "∞" : formatCurrency(maxProfit)}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                     <span className="text-slate-600">Max-:</span>
                     <span className="text-rose-400">
                        {maxLoss === null ? "∞" : formatCurrency(maxLoss)}
                    </span>
                </div>
            </div>
        </div>

        {/* VaR */}
        <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">
                VaR (95%)
            </span>
            <div className="flex items-center gap-2 text-rose-500 font-mono font-bold text-lg">
                <ShieldAlert className="w-4 h-4" />
                {formatCurrency(var95)}
            </div>
        </div>
      </div>
    </header>
  );
}

function RiskMetric({ label, value, suffix, color }: { label: string, value: number, suffix: string, color: string }) {
    return (
        <div className="flex flex-col items-center">
             <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</span>
            <span className={cn("text-base font-mono font-medium", color)}>
                {smartFormat(value)} <span className="text-xs opacity-50">{suffix}</span>
            </span>
        </div>
    )
}