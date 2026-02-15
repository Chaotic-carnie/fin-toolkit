"use client";

import React, { useMemo } from "react";
import { Activity, ShieldAlert, Zap } from "lucide-react";
import {
  type MacroShocks,
  type FixedIncomePosition,
  type FxPosition,
  type EquityPosition,
  type CreditPosition,
  type OptionPosition,
  calculateBondPnL,
  calculateFxPnL,
  calculateEquityPnL,
  calculateCreditPnL,
  calculateOptionPnL,
  calculateDiversificationBenefit,
} from "../engine";

// --- 1. Built-in Stress Packs ---
const STRESS_PACKS: Array<{ name: string; desc: string; tags: string[]; shocks: MacroShocks }> = [
  {
    name: "Inflation Spike (Risk-Off)",
    desc: "Long-end yields up, INR depreciates, Equities sell off, Vol spikes.",
    tags: ["rates", "fx", "risk-off"],
    shocks: { rate3mBps: 25, rate2yBps: 50, rate5yBps: 100, rate10yBps: 150, fxShockPct: 3.0, equityShockPct: -5.0, creditSpreadBps: 40, volShockPts: 6, horizonDays: 30 },
  },
  {
    name: "RBI Easing (Risk-On)",
    desc: "Policy easing lowers short rates, Equities rally, Credit tightens.",
    tags: ["policy", "rates", "risk-on"],
    shocks: { rate3mBps: -75, rate2yBps: -50, rate5yBps: -30, rate10yBps: -25, fxShockPct: -1.5, equityShockPct: 4.0, creditSpreadBps: -25, volShockPts: -3, horizonDays: 30 },
  },
  {
    name: "Oil Shock",
    desc: "Import inflation pressures INR, front-end reprices heavily.",
    tags: ["oil", "fx", "inflation"],
    shocks: { rate3mBps: 60, rate2yBps: 50, rate5yBps: 40, rate10yBps: 30, fxShockPct: 4.0, equityShockPct: -3.5, creditSpreadBps: 20, volShockPts: 4, horizonDays: 30 },
  },
  {
    name: "Curve Bear-Steepener",
    desc: "Long-end yields rise significantly faster than short-end.",
    tags: ["curve", "rates"],
    shocks: { rate3mBps: 10, rate2yBps: 25, rate5yBps: 60, rate10yBps: 100, fxShockPct: 0.5, equityShockPct: -1.0, creditSpreadBps: 10, volShockPts: 1, horizonDays: 30 },
  },
  {
    name: "Curve Bull-Flattener",
    desc: "Long-end yields fall faster than short-end (flight to safety).",
    tags: ["curve", "rates", "safety"],
    shocks: { rate3mBps: -25, rate2yBps: -50, rate5yBps: -90, rate10yBps: -125, fxShockPct: 0, equityShockPct: 1.5, creditSpreadBps: -5, volShockPts: -1, horizonDays: 30 },
  },
];

// --- 2. Mock Portfolio (For Demonstration) ---
// In production, this would be selected via `useMacroStore()`
const PORTFOLIO = {
  fixedIncome: [
    { id: "b1", label: "Govt 10Y", notionalInr: 10_000_000, modifiedDuration: 7.2, convexity: 65, bucket: "10y" },
    { id: "b2", label: "T-Bill 3M", notionalInr: 5_000_000, modifiedDuration: 0.25, convexity: 0.5, bucket: "3m" },
  ] as FixedIncomePosition[],
  fx: [
    { id: "fx1", label: "Long USD/INR", notionalUsd: 100_000 }
  ] as FxPosition[],
  equity: [
    { id: "eq1", label: "Nifty 50 ETF", notionalInr: 5_000_000, beta: 1.0 }
  ] as EquityPosition[],
  credit: [
    { id: "c1", label: "Corp Bond 5Y", notionalInr: 2_000_000, modifiedDuration: 4.1, spreadDuration: 4.5, bucket: "5y" }
  ] as CreditPosition[],
  options: [
    { id: "o1", label: "Nifty Put Hedge", notionalInr: 1_000_000, delta: -0.4, gamma: 0.05, vega: 15000 }
  ] as OptionPosition[],
};

const BASE_USD_INR = 83.50;
const BASE_3M_RATE = 7.10;

// --- 3. Component ---
export function StressPacksTable() {
  
  // Compute Matrix
  const matrix = useMemo(() => {
    return STRESS_PACKS.map((pack) => {
      let fiPnL = 0, fxPnL = 0, eqPnL = 0, crPnL = 0, optPnL = 0;
      const allPnLs: number[] = [];

      PORTFOLIO.fixedIncome.forEach(p => { const res = calculateBondPnL(p, pack.shocks); fiPnL += res.pnl; allPnLs.push(res.pnl); });
      PORTFOLIO.fx.forEach(p => { const res = calculateFxPnL(p, pack.shocks, BASE_USD_INR, BASE_3M_RATE); fxPnL += res.pnl; allPnLs.push(res.pnl); });
      PORTFOLIO.equity.forEach(p => { const res = calculateEquityPnL(p, pack.shocks); eqPnL += res.pnl; allPnLs.push(res.pnl); });
      PORTFOLIO.credit.forEach(p => { const res = calculateCreditPnL(p, pack.shocks); crPnL += res.pnl; allPnLs.push(res.pnl); });
      PORTFOLIO.options.forEach(p => { const res = calculateOptionPnL(p, pack.shocks); optPnL += res.pnl; allPnLs.push(res.pnl); });

      const netTotal = fiPnL + fxPnL + eqPnL + crPnL + optPnL;
      const divBenefit = calculateDiversificationBenefit(allPnLs);

      return { pack, fiPnL, fxPnL, eqPnL, crPnL, optPnL, netTotal, divBenefit };
    });
  }, []);

  // Formatters
  const fmtStr = (num: number) => {
    const sign = num > 0 ? "+" : "";
    const color = num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-500";
    
    // Convert to compact formats (K/M) for institutional look
    let formatted = Math.abs(num) >= 1_000_000 
      ? (Math.abs(num) / 1_000_000).toFixed(2) + "M" 
      : Math.abs(num) >= 1_000 
        ? (Math.abs(num) / 1_000).toFixed(1) + "K"
        : Math.abs(num).toFixed(0);

    if (num === 0) return <span className="text-slate-600 font-mono">—</span>;
    return <span className={`font-mono ${color}`}>{sign}{formatted}</span>;
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-500" /> Scenario Stress Packs
          </h2>
          <p className="text-xs text-slate-500 mt-1">Multi-asset portfolio shock evaluation matrix</p>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded transition-colors flex items-center gap-2">
           <Zap size={14} className="text-amber-400" /> Run Custom Matrix
        </button>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto dark-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#020617] border-b border-slate-800 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Scenario Pack</th>
                <th className="px-4 py-3 font-medium text-right border-l border-slate-800/50">Rates PnL</th>
                <th className="px-4 py-3 font-medium text-right border-l border-slate-800/50">Credit PnL</th>
                <th className="px-4 py-3 font-medium text-right border-l border-slate-800/50">FX PnL</th>
                <th className="px-4 py-3 font-medium text-right border-l border-slate-800/50">Equity PnL</th>
                <th className="px-4 py-3 font-medium text-right border-l border-slate-800/50">Options PnL</th>
                <th className="px-4 py-3 font-medium text-right border-l border-slate-800 border-r">Div. Benefit</th>
                <th className="px-4 py-3 font-medium text-right text-slate-300">Net Portfolio PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {matrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{row.pack.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate" title={row.pack.desc}>
                      {row.pack.desc}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right border-l border-slate-800/50">{fmtStr(row.fiPnL)}</td>
                  <td className="px-4 py-3 text-right border-l border-slate-800/50">{fmtStr(row.crPnL)}</td>
                  <td className="px-4 py-3 text-right border-l border-slate-800/50">{fmtStr(row.fxPnL)}</td>
                  <td className="px-4 py-3 text-right border-l border-slate-800/50">{fmtStr(row.eqPnL)}</td>
                  <td className="px-4 py-3 text-right border-l border-slate-800/50">{fmtStr(row.optPnL)}</td>
                  <td className="px-4 py-3 text-right border-l border-slate-800 border-r text-slate-400 font-mono">
                    {/* Diversification benefit is always a positive offset */}
                    +{row.divBenefit >= 1_000_000 ? (row.divBenefit / 1_000_000).toFixed(2) + "M" : (row.divBenefit / 1_000).toFixed(1) + "K"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold bg-[#020617]/40 group-hover:bg-transparent">
                    {fmtStr(row.netTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}