// src/features/composer/components/GreekSpecPanel.tsx

"use client";

import React from "react";
import type { GreekBand, GreekKey, GreekRegion, GreekSpec } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GREEKS: GreekKey[] = ["delta", "gamma", "vega", "theta"];
const REGIONS: GreekRegion[] = ["downside", "atm", "upside"];

function defaultBand(): GreekBand {
  return { greek: "delta", region: "atm", target: 0, tolerance: 0.05, weight: 1 };
}

export function GreekSpecPanel(props: { greekSpec: GreekSpec; onChange: (g: GreekSpec) => void }) {
  const { greekSpec } = props;
  const bands = greekSpec.bands ?? [];

  const set = (patch: Partial<GreekSpec>) => props.onChange({ ...greekSpec, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Zone Width (± pct around spot)</Label>
        <Input
          type="number"
          value={greekSpec.zoneWidthPct}
          step="1"
          onChange={(e) => set({ zoneWidthPct: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      <div className="text-[10px] text-slate-500">
        Add Greek targets by region. The compiler uses a small library of adjustment blocks
        (forward / straddle / risk reversal / calendar) and a greedy priority ladder.
      </div>

      <div className="space-y-2">
        {bands.length === 0 && <div className="text-xs text-slate-600">No Greek targets set.</div>}

        {bands.map((b, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-3">
              <Select
                value={b.greek}
                onValueChange={(v) => {
                  const next = [...bands];
                  next[idx] = { ...next[idx]!, greek: v as GreekKey };
                  set({ bands: next });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GREEKS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3">
              <Select
                value={b.region}
                onValueChange={(v) => {
                  const next = [...bands];
                  next[idx] = { ...next[idx]!, region: v as GreekRegion };
                  set({ bands: next });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Input
                type="number"
                value={b.target}
                step="0.01"
                onChange={(e) => {
                  const next = [...bands];
                  next[idx] = { ...next[idx]!, target: Number(e.target.value) };
                  set({ bands: next });
                }}
                className="h-9"
                placeholder="Target"
              />
            </div>

            <div className="col-span-2">
              <Input
                type="number"
                value={b.tolerance}
                step="0.01"
                onChange={(e) => {
                  const next = [...bands];
                  next[idx] = { ...next[idx]!, tolerance: Number(e.target.value) };
                  set({ bands: next });
                }}
                className="h-9"
                placeholder="Tol"
              />
            </div>

            <div className="col-span-1">
              <Input
                type="number"
                value={b.weight}
                step="0.1"
                onChange={(e) => {
                  const next = [...bands];
                  next[idx] = { ...next[idx]!, weight: Number(e.target.value) };
                  set({ bands: next });
                }}
                className="h-9"
                placeholder="W"
              />
            </div>

            <div className="col-span-1 flex justify-end">
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  const next = bands.filter((_, i) => i !== idx);
                  set({ bands: next });
                }}
              >
                −
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="secondary"
          className="h-9 w-full"
          onClick={() => set({ bands: [...bands, defaultBand()] })}
        >
          + Add Greek Target
        </Button>
      </div>
    </div>
  );
}
