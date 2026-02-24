// src/features/composer/compiler/simplify.ts

import type { ComposerLeg } from "../types";
import { safeNum } from "../utils/number";

/**
 * Merge identical legs (same instrument/strike/expiry/type) by summing quantities.
 */
export function mergeLegs(legs: ComposerLeg[]): ComposerLeg[] {
  const key = (l: ComposerLeg) => {
    const p = l.params ?? {};
    const strike = safeNum(p.strike ?? p.K ?? 0, 0);
    const T = safeNum(p.time_to_expiry ?? p.T ?? 0, 0);
    const type = String(p.option_type ?? p.type ?? "");

    const extra =
      l.instrument === "barrier" ? `${safeNum(p.barrier ?? p.H, 0)}:${String(p.barrier_type ?? p.barrierType ?? "")}` : "";

    return `${l.instrument}|${type}|${strike}|${T}|${extra}`;
  };

  const map = new Map<string, ComposerLeg>();
  for (const l of legs) {
    if (!l.active) continue;
    const k = key(l);
    const prev = map.get(k);
    if (!prev) map.set(k, { ...l });
    else prev.quantity += l.quantity;
  }

  return Array.from(map.values()).filter((l) => Math.abs(l.quantity) > 1e-8);
}

/**
 * Enforce a max leg count by keeping the most "important" legs.
 *
 * Importance heuristic: absolute quantity.
 * (A more sophisticated version could use |qty| * price or payoff contribution.)
 */
export function capLegCount(legs: ComposerLeg[], maxLegs?: number): { legs: ComposerLeg[]; dropped: number } {
  if (!maxLegs || maxLegs <= 0) return { legs, dropped: 0 };

  const active = legs.filter((l) => l.active && Math.abs(l.quantity) > 1e-8);
  if (active.length <= maxLegs) return { legs, dropped: 0 };

  const sorted = [...active].sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity));
  const keep = new Set(sorted.slice(0, maxLegs).map((l) => l.id));

  const newLegs = legs.filter((l) => !l.active || keep.has(l.id));
  return { legs: newLegs, dropped: active.length - maxLegs };
}
