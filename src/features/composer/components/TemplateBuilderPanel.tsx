// src/features/composer/components/TemplateBuilderPanel.tsx

"use client";

import React, { useMemo, useState } from "react";
import type { ComposerInstrument, ComposerLeg, MarketState, OptionType, BarrierType } from "../types";
import { uid } from "../utils/uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "~/lib/utils";
import { priceLeg } from "../pricing/router";

const INSTRUMENTS: { key: ComposerInstrument; label: string }[] = [
  { key: "vanilla", label: "Vanilla" },
  { key: "digital", label: "Digital (cash)" },
  { key: "binary_asset", label: "Binary (asset)" },
  { key: "barrier", label: "Barrier" },
  { key: "american", label: "American" },
  { key: "asian", label: "Asian" },
  { key: "gap", label: "Gap" },
  { key: "chooser", label: "Chooser" },
  { key: "compound", label: "Compound" },
  { key: "lookback", label: "Lookback" },
  { key: "shout", label: "Shout" },
  { key: "forward", label: "Forward" },
  { key: "cash", label: "Cash" },
];

const BARRIER_TYPES: BarrierType[] = ["up-in", "up-out", "down-in", "down-out"];

/**
 * Strategy/Leg Builder
 *
 * This is intentionally "low ceremony": add any supported instrument,
 * see PV & Greeks immediately, then inspect payoff/heatmaps elsewhere.
 */
export function TemplateBuilderPanel(props: {
  market: MarketState;
  legs: ComposerLeg[];
  onChange: (legs: ComposerLeg[]) => void;
}) {
  const { market, legs } = props;

  // New leg form state.
  const [instrument, setInstrument] = useState<ComposerInstrument>("vanilla");
  const [type, setType] = useState<OptionType>("call");
  const [qty, setQty] = useState<number>(1);
  const [K, setK] = useState<number>(market.spot);
  const [T, setT] = useState<number>(0.25);

  // Digital/gap/etc extras.
  const [payout, setPayout] = useState<number>(100);
  const [barrier, setBarrier] = useState<number>(market.spot * 0.9);
  const [barrierType, setBarrierType] = useState<BarrierType>("down-out");

  const [kTrigger, setKTrigger] = useState<number>(market.spot);
  const [kPay, setKPay] = useState<number>(market.spot);

  const [chooseTime, setChooseTime] = useState<number>(0.125);
  const [outerTime, setOuterTime] = useState<number>(0.125);
  const [outerStrike, setOuterStrike] = useState<number>(10);
  const [innerStrike, setInnerStrike] = useState<number>(market.spot);
  const [innerType, setInnerType] = useState<OptionType>("call");
  const [outerType, setOuterType] = useState<OptionType>("call");

  const [shoutTime, setShoutTime] = useState<number>(0.125);

  const addLeg = () => {
    const common = {
      asset: market.asset,
      spot: market.spot,
      vol: market.vol,
      risk_free_rate: market.rate,
      dividend_yield: market.dividend,
      time_to_expiry: T,
    };

    const params: Record<string, any> = { ...common };

    if (instrument === "cash") {
      // Quantity is the amount of cash.
      props.onChange([
        ...legs,
        {
          id: uid("cash"),
          instrument: "cash",
          quantity: qty,
          active: true,
          params,
          name: "Cash",
        },
      ]);
      return;
    }

    if (instrument === "forward") {
      params.delivery = 0;
      props.onChange([
        ...legs,
        {
          id: uid("fwd"),
          instrument: "forward",
          quantity: qty,
          active: true,
          params,
          name: "Forward",
        },
      ]);
      return;
    }

    // Options/exotics share these.
    params.option_type = type;

    if (["vanilla", "digital", "binary_asset", "barrier", "american", "asian", "lookback", "shout"].includes(instrument)) {
      params.strike = K;
    }

    if (instrument === "digital") params.payout = payout;

    if (instrument === "barrier") {
      params.barrier = barrier;
      params.barrier_type = barrierType;
      // allow user to override MC later via edit JSON
      params.paths = 2500;
      params.steps = 80;
      params.seed = 12345;
    }

    if (instrument === "gap") {
      params.K_trigger = kTrigger;
      params.K_pay = kPay;
    }

    if (instrument === "chooser") {
      params.strike = K;
      params.chooseTime = chooseTime;
      params.paths = 3000;
      params.steps = 80;
      params.seed = 12345;
    }

    if (instrument === "compound") {
      params.outerTime = outerTime;
      params.outerType = outerType;
      params.outerStrike = outerStrike;
      params.innerType = innerType;
      params.innerStrike = innerStrike;
      params.paths = 3000;
      params.steps = 80;
      params.seed = 12345;
    }

    if (instrument === "shout") {
      params.strike = K;
      params.shoutTime = shoutTime;
      params.paths = 3000;
      params.steps = 120;
      params.seed = 12345;
    }

    if (instrument === "lookback") {
      params.strike = K;
      params.paths = 3000;
      params.steps = 120;
      params.seed = 12345;
    }

    props.onChange([
      ...legs,
      {
        id: uid("leg"),
        instrument,
        quantity: qty,
        active: true,
        params,
      },
    ]);
  };

  const removeLeg = (id: string) => props.onChange(legs.filter((l) => l.id !== id));

  const toggleActive = (id: string) =>
    props.onChange(legs.map((l) => (l.id === id ? { ...l, active: !l.active } : l)));

  const updateQty = (id: string, q: number) =>
    props.onChange(legs.map((l) => (l.id === id ? { ...l, quantity: q } : l)));

  const pv = useMemo(() => {
    return legs
      .filter((l) => l.active)
      .reduce((acc, l) => acc + priceLeg(l, market).price * l.quantity, 0);
  }, [legs, market]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Instrument</Label>
          <Select value={instrument} onValueChange={(v) => setInstrument(v as ComposerInstrument)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENTS.map((i) => (
                <SelectItem key={i.key} value={i.key}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Quantity</Label>
          <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-9" />
        </div>

        {/* Option type (only for option-like instruments) */}
        {instrument !== "cash" && instrument !== "forward" && (
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as OptionType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">call</SelectItem>
                <SelectItem value="put">put</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Strike */}
        {["vanilla", "digital", "binary_asset", "barrier", "american", "asian", "lookback", "shout", "gap", "chooser"].includes(
          instrument
        ) && (
          <div className="space-y-2">
            <Label className="text-xs">Strike</Label>
            <Input type="number" value={K} onChange={(e) => setK(Number(e.target.value))} className="h-9" />
          </div>
        )}

        {/* Maturity */}
        {instrument !== "cash" && (
          <div className="space-y-2">
            <Label className="text-xs">Expiry (years)</Label>
            <Input type="number" value={T} step="0.01" onChange={(e) => setT(Number(e.target.value))} className="h-9" />
          </div>
        )}

        {/* Digital payout */}
        {instrument === "digital" && (
          <div className="space-y-2">
            <Label className="text-xs">Payout</Label>
            <Input type="number" value={payout} onChange={(e) => setPayout(Number(e.target.value))} className="h-9" />
          </div>
        )}

        {/* Barrier fields */}
        {instrument === "barrier" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Barrier (H)</Label>
              <Input type="number" value={barrier} onChange={(e) => setBarrier(Number(e.target.value))} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Barrier Type</Label>
              <Select value={barrierType} onValueChange={(v) => setBarrierType(v as BarrierType)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BARRIER_TYPES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Gap fields */}
        {instrument === "gap" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Trigger K₁</Label>
              <Input type="number" value={kTrigger} onChange={(e) => setKTrigger(Number(e.target.value))} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Pay K₂</Label>
              <Input type="number" value={kPay} onChange={(e) => setKPay(Number(e.target.value))} className="h-9" />
            </div>
          </>
        )}

        {/* Chooser fields */}
        {instrument === "chooser" && (
          <div className="space-y-2">
            <Label className="text-xs">Choose Time (years)</Label>
            <Input
              type="number"
              value={chooseTime}
              step="0.01"
              onChange={(e) => setChooseTime(Number(e.target.value))}
              className="h-9"
            />
          </div>
        )}

        {/* Compound fields */}
        {instrument === "compound" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Outer Time (years)</Label>
              <Input type="number" value={outerTime} step="0.01" onChange={(e) => setOuterTime(Number(e.target.value))} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Outer Type</Label>
              <Select value={outerType} onValueChange={(v) => setOuterType(v as OptionType)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">call</SelectItem>
                  <SelectItem value="put">put</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Outer Strike (on option value)</Label>
              <Input type="number" value={outerStrike} step="0.1" onChange={(e) => setOuterStrike(Number(e.target.value))} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Inner Type</Label>
              <Select value={innerType} onValueChange={(v) => setInnerType(v as OptionType)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">call</SelectItem>
                  <SelectItem value="put">put</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Inner Strike (underlying)</Label>
              <Input type="number" value={innerStrike} onChange={(e) => setInnerStrike(Number(e.target.value))} className="h-9" />
            </div>
          </>
        )}

        {/* Shout */}
        {instrument === "shout" && (
          <div className="space-y-2">
            <Label className="text-xs">Shout Time (years)</Label>
            <Input
              type="number"
              value={shoutTime}
              step="0.01"
              onChange={(e) => setShoutTime(Number(e.target.value))}
              className="h-9"
            />
          </div>
        )}
      </div>

      <Button className="w-full" onClick={addLeg}>
        Add Leg
      </Button>

      <div className="text-sm text-slate-300">
        PV (today): <span className={cn("font-mono", pv >= 0 ? "text-blue-200" : "text-rose-200")}>{pv.toFixed(4)}</span>
      </div>

      <div className="space-y-2">
        {legs.length === 0 && <div className="text-xs text-slate-600">No legs yet. Add a leg to start building.</div>}

        {legs.map((l) => {
          const p = l.params ?? {};
          const label = `${l.instrument}${p.option_type ? ` ${p.option_type}` : ""}${p.strike ? ` K=${Number(p.strike).toFixed(0)}` : ""}${p.time_to_expiry ? ` T=${Number(p.time_to_expiry).toFixed(3)}` : ""}`;

          return (
            <div
              key={l.id}
              className={cn(
                "flex items-center justify-between gap-2 p-2 rounded border border-white/5",
                l.active ? "bg-slate-900/30" : "bg-slate-900/10 opacity-60"
              )}
            >
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => toggleActive(l.id)}>
                  {l.active ? "On" : "Off"}
                </Button>

                <div className="flex flex-col">
                  <div className="font-mono text-xs text-slate-200">{label}</div>
                  <div className="text-[10px] text-slate-500">{l.name ?? ""}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={l.quantity}
                  step="0.1"
                  onChange={(e) => updateQty(l.id, Number(e.target.value))}
                  className="h-8 w-24 font-mono"
                />
                <Button variant="destructive" size="sm" className="h-8" onClick={() => removeLeg(l.id)}>
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-500">
        Note: Multi-expiry strategies are best inspected via <span className="text-slate-300">T+0 PV curves</span> and
        <span className="text-slate-300"> scenario heatmaps</span>. A single "terminal payoff" is only well-defined when
        all legs share the same expiry.
      </div>
    </div>
  );
}
