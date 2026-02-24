// src/features/composer/components/MarketInputs.tsx

"use client";

import React from "react";
import type { MarketState, CompileConfig } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MarketInputs(props: {
  market: MarketState;
  cfg: CompileConfig;
  onMarketChange: (m: MarketState) => void;
  onCfgChange: (c: CompileConfig) => void;
}) {
  const { market, cfg } = props;

  const setMarket = (patch: Partial<MarketState>) => props.onMarketChange({ ...market, ...patch });
  const setCfg = (patch: Partial<CompileConfig>) => props.onCfgChange({ ...cfg, ...patch });

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs">Asset</Label>
        <Input
          value={market.asset}
          onChange={(e) => setMarket({ asset: e.target.value })}
          className="h-9"
          placeholder="SPX"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Spot</Label>
        <Input
          type="number"
          value={market.spot}
          onChange={(e) => setMarket({ spot: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Vol (σ)</Label>
        <Input
          type="number"
          value={market.vol}
          step="0.01"
          onChange={(e) => setMarket({ vol: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Rate (r)</Label>
        <Input
          type="number"
          value={market.rate}
          step="0.01"
          onChange={(e) => setMarket({ rate: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Dividend (q)</Label>
        <Input
          type="number"
          value={market.dividend}
          step="0.01"
          onChange={(e) => setMarket({ dividend: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Maturity (years)</Label>
        <Input
          type="number"
          value={cfg.maturity}
          step="0.01"
          onChange={(e) => setCfg({ maturity: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Strike Count</Label>
        <Input
          type="number"
          value={cfg.strikeCount}
          step="1"
          onChange={(e) => setCfg({ strikeCount: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Strike Range (± pct)</Label>
        <Input
          type="number"
          value={cfg.strikeRangePct * 100}
          step="1"
          onChange={(e) => setCfg({ strikeRangePct: Number(e.target.value) / 100 })}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Strike Round (optional)</Label>
        <Input
          type="number"
          value={cfg.strikeRound ?? ""}
          onChange={(e) => setCfg({ strikeRound: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="h-9"
          placeholder="50"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Long Maturity (for calendars)</Label>
        <Input
          type="number"
          value={cfg.longMaturity}
          step="0.01"
          onChange={(e) => setCfg({ longMaturity: Number(e.target.value) })}
          className="h-9"
        />
      </div>
    </div>
  );
}
