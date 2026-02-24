"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { ComposerLeg, MarketState } from "../types";
import { priceLeg } from "../pricing/router";
import { cn } from "~/lib/utils";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

// Explicitly show + signs on positive numbers for a "Terminal" feel
const fmtSigned = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

// Dynamic colorizer for individual mathematical values
const colorize = (val: number, neutral = "text-slate-500") => {
  if (Math.abs(val) < 1e-5) return neutral;
  return val > 0 ? "text-emerald-400" : "text-rose-400";
};

function legLabel(leg: ComposerLeg) {
  const p = leg.params ?? {};
  const strike = p.strike ?? p.K;
  const T = p.time_to_expiry ?? p.T;
  const type = p.option_type ?? p.type;

  if (leg.instrument === "cash") return "Cash";
  if (leg.instrument === "forward") return "Forward";

  const parts = [leg.instrument];
  if (type) parts.push(String(type));
  if (strike !== undefined) parts.push(`K=${Number(strike).toFixed(2)}`);
  if (T !== undefined) parts.push(`T=${Number(T).toFixed(3)}y`);
  return parts.join(" ");
}

export function LegTable(props: {
  legs: ComposerLeg[];
  market: MarketState;
  maturity?: number;
}) {
  const { legs, market, maturity } = props;
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    return legs
      .filter((l) => l.active)
      .map((l) => {
        const res = priceLeg(l, market, maturity);
        return {
          id: l.id,
          name: l.name ?? "",
          label: legLabel(l),
          instrument: l.instrument,
          qty: l.quantity,
          unitPrice: res.price,
          pv: res.price * l.quantity,
          delta: res.greeks.delta * l.quantity,
          gamma: res.greeks.gamma * l.quantity,
          vega: res.greeks.vega * l.quantity,
          theta: res.greeks.theta * l.quantity,
        };
      });
  }, [legs, market, maturity]);

  if (!rows.length) {
    return <div className="text-xs text-slate-600 text-center py-10 font-mono uppercase tracking-widest">No Active Legs</div>;
  }

  const copyJson = async () => {
    const payload = JSON.stringify(legs, null, 2);
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full overflow-x-auto dark-scrollbar pb-2">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-3 px-4 pt-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          Position Inventory
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] uppercase tracking-widest font-bold bg-transparent border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-all"
          onClick={copyJson}
        >
          {copied ? <Check className="w-3 h-3 mr-2 text-emerald-400" /> : <Copy className="w-3 h-3 mr-2" />}
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>

      <div className="min-w-[950px] px-2">
        {/* TABLE HEADERS */}
        <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-900/40 border-y border-slate-800 text-[9px] uppercase tracking-widest font-bold text-slate-500">
          <div className="col-span-3">Instrument</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit Px</div>
          <div className="col-span-2 text-right">Present Value</div>
          <div className="col-span-4 text-right">Risk ( Δ / Γ / V / Θ )</div>
        </div>

        {/* TABLE ROWS */}
        <div className="divide-y divide-slate-800/50">
          {rows.map((r) => {
            // Determine the master color for the row based on Long/Short status
            const isLong = r.qty > 0;
            const isShort = r.qty < 0;
            const rowTextColor = isLong ? "text-emerald-400" : isShort ? "text-rose-400" : "text-slate-300";
            const rowHoverBg = isLong ? "hover:bg-emerald-500/5" : isShort ? "hover:bg-rose-500/5" : "hover:bg-white/[0.02]";

            return (
              <div key={r.id} className={cn("grid grid-cols-12 gap-3 px-4 py-3 items-center transition-colors group", rowHoverBg)}>
                
                {/* LEG LABEL */}
                <div className="col-span-3 flex flex-col">
                  <span className={cn("font-mono text-xs font-bold", rowTextColor)}>{r.label}</span>
                  {r.name && <span className="text-[10px] text-slate-500 truncate mt-0.5">{r.name}</span>}
                </div>

                {/* QUANTITY */}
                <div className={cn("col-span-1 text-right font-mono text-xs font-bold", rowTextColor)}>
                  {fmtSigned(r.qty)}
                </div>

                {/* UNIT PRICE */}
                <div className={cn("col-span-2 text-right font-mono text-xs", rowTextColor)}>
                  {fmt(r.unitPrice)}
                </div>

                {/* PRESENT VALUE (PV) */}
                <div className={cn("col-span-2 text-right font-mono text-xs font-bold", rowTextColor)}>
                  {fmtSigned(r.pv)}
                </div>

                {/* GREEKS ARRAY (These keep their own mathematical signs so you know exact risks) */}
                <div className="col-span-4 flex justify-end items-center gap-3 font-mono text-[11px] bg-[#020617] py-1 px-3 rounded-md border border-slate-800/50 group-hover:border-slate-700 transition-colors">
                  <div className="flex gap-1.5 w-16 justify-end">
                    <span className="text-slate-600">Δ</span>
                    <span className={colorize(r.delta)}>{fmtSigned(r.delta)}</span>
                  </div>
                  <div className="w-[1px] h-3 bg-slate-800" />
                  
                  <div className="flex gap-1.5 w-16 justify-end">
                    <span className="text-slate-600">Γ</span>
                    <span className={colorize(r.gamma)}>{fmtSigned(r.gamma)}</span>
                  </div>
                  <div className="w-[1px] h-3 bg-slate-800" />
                  
                  <div className="flex gap-1.5 w-16 justify-end">
                    <span className="text-slate-600">V</span>
                    <span className={colorize(r.vega, "text-amber-500/80")}>{fmtSigned(r.vega)}</span>
                  </div>
                  <div className="w-[1px] h-3 bg-slate-800" />
                  
                  <div className="flex gap-1.5 w-16 justify-end">
                    <span className="text-slate-600">Θ</span>
                    <span className={r.theta > 0 ? "text-cyan-400" : "text-rose-400"}>{fmtSigned(r.theta)}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}