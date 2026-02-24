// src/features/composer/components/ConstraintsPanel.tsx

"use client";

import React from "react";
import type { HardConstraints, PriorityKey, PriorityLadder } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITIES: PriorityKey[] = ["safety", "payoff", "greeks", "simplicity"];

function buildLadder(primary: PriorityKey): PriorityLadder {
  const rest = PRIORITIES.filter((p) => p !== primary);
  return { order: [primary, ...rest] };
}

export function ConstraintsPanel(props: {
  constraints: HardConstraints;
  priority: PriorityLadder;
  onConstraintsChange: (c: HardConstraints) => void;
  onPriorityChange: (p: PriorityLadder) => void;
}) {
  const { constraints, priority } = props;

  const primary = priority.order[0] ?? "payoff";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Max Debit (budget)</Label>
          <Input
            type="number"
            value={constraints.maxDebit ?? ""}
            onChange={(e) =>
              props.onConstraintsChange({
                ...constraints,
                maxDebit: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="h-9"
            placeholder="e.g. 50"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Max Credit (abs)</Label>
          <Input
            type="number"
            value={constraints.maxCreditAbs ?? ""}
            onChange={(e) =>
              props.onConstraintsChange({
                ...constraints,
                maxCreditAbs: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="h-9"
            placeholder="e.g. 50"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Max Legs</Label>
          <Input
            type="number"
            value={constraints.maxLegs ?? ""}
            onChange={(e) =>
              props.onConstraintsChange({
                ...constraints,
                maxLegs: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="h-9"
            placeholder="e.g. 12"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Primary Objective</Label>
          <Select
            value={primary}
            onValueChange={(v) => props.onPriorityChange(buildLadder(v as PriorityKey))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={constraints.allowShort ?? true}
            onCheckedChange={(v) => props.onConstraintsChange({ ...constraints, allowShort: Boolean(v) })}
            className="mt-1"
          />
          <div>
            <div className="text-sm text-slate-200">Allow Shorts</div>
            <div className="text-[10px] text-slate-500">Disabling this severely restricts attainable payoffs.</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            checked={constraints.requireDefinedRisk ?? false}
            onCheckedChange={(v) => props.onConstraintsChange({ ...constraints, requireDefinedRisk: Boolean(v) })}
            className="mt-1"
          />
          <div>
            <div className="text-sm text-slate-200">Prefer Defined Risk</div>
            <div className="text-[10px] text-slate-500">Bias the Greek fitter toward spreads/butterflies.</div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500">
        Priority ladder: <span className="text-slate-300">{priority.order.join(" → ")}</span>
      </div>
    </div>
  );
}
