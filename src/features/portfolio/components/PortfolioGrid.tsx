"use client";

import React, { useState } from "react";
import { usePortfolioStore } from "../store";
import { Trash2, TrendingUp, TrendingDown, MoreHorizontal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Helper to format large numbers compactly
const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

export function PortfolioGrid() {
  const { trades, legResults, removeTrade, updateTrade, addTrade } = usePortfolioStore();

  const addTestTrade = () => {
    addTrade({
      id: crypto.randomUUID(),
      instrument: "vanilla",
      method: "black_scholes",
      quantity: 1,
      active: true,
      params: {
        asset: "BTC",
        spot: 45000,
        strike: 46000,
        time_to_expiry: 0.1, // ~36 days
        vol: 0.65,
        risk_free_rate: 0.05,
        option_type: "call",
      },
    });
  };

  if (trades.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-20 lg:py-0">
        <AlertCircle className="w-12 h-12 opacity-20" />
        <p className="text-xs uppercase tracking-widest font-bold">No active positions</p>
        
        {/* ADDED: tour-add-trade-btn class for Joyride to target */}
        <Button 
          onClick={addTestTrade} 
          variant="outline" 
          className="tour-add-trade-btn border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 font-bold tracking-widest uppercase text-[10px]"
        >
          + Load Sample Trade
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto dark-scrollbar text-sm">
      
      <div className="min-w-[700px] lg:min-w-0">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-white/5 text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-[#020617]">
          <div className="col-span-3">Instrument</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Delta</div>
          <div className="col-span-2 text-right">Vega</div>
          <div className="col-span-1 text-center">Action</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {trades.map((trade, index) => {
            const result = legResults[trade.id];
            const isCall = trade.params.option_type === "call";

            return (
              <div 
                key={`${trade.id}-${index}`}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-900/40 transition-colors group"
              >
                
                {/* 1. Instrument Badge */}
                <div className="col-span-3 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                      isCall ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {trade.params.option_type || "Fwd"}
                    </span>
                    <span className="font-mono font-medium text-slate-300">
                      {fmt(trade.params.strike || 0)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 truncate">
                    Exp: {trade.params.time_to_expiry?.toFixed(2)}y • Vol: {((trade.params.vol || 0) * 100).toFixed(1)}%
                  </span>
                </div>

                {/* 2. Editable Quantity */}
                <div className="col-span-2 flex justify-end">
                  <Input
                    type="number"
                    className="h-8 w-20 text-right font-mono bg-[#0B1121] border-slate-800 focus:border-blue-500 text-slate-300"
                    value={trade.quantity}
                    onChange={(e) => updateTrade(trade.id, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {/* 3. Unit Price */}
                <div className="col-span-2 text-right font-mono text-slate-300">
                  {result ? fmt(result.price) : "..."}
                </div>

                {/* 4. Delta */}
                <div className={cn(
                  "col-span-2 text-right font-mono",
                  (result?.greeks.delta || 0) > 0 ? "text-blue-400" : "text-rose-400"
                )}>
                  {result ? fmt(result.greeks.delta * trade.quantity) : "-"}
                </div>

                {/* 5. Vega */}
                <div className="col-span-2 text-right font-mono text-yellow-500/80">
                  {result ? fmt(result.greeks.vega * trade.quantity) : "-"}
                </div>

                {/* 6. Actions */}
                <div className="col-span-1 flex justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeTrade(trade.id)}
                    className="p-1.5 bg-black/20 lg:bg-transparent hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Helper Footer */}
        {trades.length > 0 && (
          <div className="p-4 border-t border-white/5 flex justify-center">
              <Button onClick={addTestTrade} variant="ghost" size="sm" className="tour-add-trade-btn text-xs text-slate-500 hover:text-slate-300">
                + Add Another Leg
              </Button>
          </div>
        )}

      </div>
    </div>
  );
}