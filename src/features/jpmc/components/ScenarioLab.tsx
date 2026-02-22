"use client";

import { useMemo } from "react";
import { Flame, Trash2, BarChart3 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { formatUsdCompact } from "~/features/jpmc/engine";
import { useJpmcTrackerStore } from "~/features/jpmc/store";

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function ScenarioLab() {
  const {
    holdingsReport,
    holdingsScenario,
    holdingsScenarioResult,
    setGlobalShockPct,
    setHoldingOverride,
    removeHoldingOverride,
    clearOverrides,
  } = useJpmcTrackerStore();

  const holdingsById = useMemo(() => {
    const map = new Map<string, { issuer: string; cusip: string }>();
    (holdingsReport?.holdings ?? []).forEach((h) =>
      map.set(h.id, { issuer: h.issuer, cusip: h.cusip })
    );
    return map;
  }, [holdingsReport]);

  const movers = useMemo(() => {
    const r = holdingsScenarioResult;
    if (!r) return { rows: [] as Array<{ id: string; name: string; pnlUsd: number }>, maxAbs: 1 };

    const top = [...r.rows]
      .sort((a, b) => Math.abs(b.pnlUsd) - Math.abs(a.pnlUsd))
      .slice(0, 12)
      .map((x) => ({
        id: x.id,
        name: x.issuer.length > 18 ? `${x.issuer.slice(0, 18)}…` : x.issuer,
        pnlUsd: x.pnlUsd,
      }));

    const maxAbs = Math.max(1, ...top.map((x) => Math.abs(x.pnlUsd)));
    return { rows: top, maxAbs };
  }, [holdingsScenarioResult]);

  const overrideEntries = Object.entries(holdingsScenario.overrides);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
        <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
          <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" /> Scenario Controls
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global shock (%)</Label>
            <Input
              type="number"
              value={holdingsScenario.globalShockPct}
              onChange={(e) => setGlobalShockPct(Number(e.target.value))}
              className="bg-black/20 border-white/10 h-11 text-white font-mono"
            />
            <div className="text-[11px] text-slate-500">
              Applied to every holding unless you set an override in the Holdings tab.
            </div>
          </div>

          <div className="rounded-xl bg-black/20 border border-white/10 p-4">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Result</div>

            {holdingsScenarioResult ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Base</span>
                  <span className="font-mono text-slate-200">
                    {formatUsdCompact(holdingsScenarioResult.baseValueUsd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shocked</span>
                  <span className="font-mono text-slate-200">
                    {formatUsdCompact(holdingsScenarioResult.shockedValueUsd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">P&amp;L</span>
                  <span
                    className={
                      "font-mono " +
                      (holdingsScenarioResult.pnlUsd >= 0 ? "text-emerald-300" : "text-rose-300")
                    }
                  >
                    {formatUsdCompact(holdingsScenarioResult.pnlUsd)} ({holdingsScenarioResult.pnlPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">Load 13F holdings to run scenarios.</div>
            )}
          </div>

          <div className="flex items-start justify-end" data-html2canvas-ignore="true">
            <Button
              variant="outline"
              className="h-11 lg:h-10 text-[10px] uppercase font-bold text-slate-200 border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => clearOverrides()}
              disabled={overrideEntries.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear overrides
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overrides */}
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
        <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
          <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300">
            Overrides
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 lg:p-6">
          {overrideEntries.length === 0 ? (
            <div className="text-sm text-slate-500">No overrides set. Use the Holdings tab to add overrides.</div>
          ) : (
            <div className="w-full overflow-x-auto dark-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Issuer</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">CUSIP</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Shock (%)</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrideEntries.map(([id, shock]) => {
                    const meta = holdingsById.get(id);
                    return (
                      <TableRow key={id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell className="text-slate-200 max-w-[420px] truncate">
                          {meta?.issuer ?? id}
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono">{meta?.cusip ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={shock}
                            onChange={(e) => setHoldingOverride(id, Number(e.target.value))}
                            className="w-28 ml-auto bg-black/20 border-white/10 text-white text-right font-mono h-9"
                          />
                        </TableCell>
                        <TableCell className="text-right" data-html2canvas-ignore="true">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-300 hover:text-white hover:bg-white/10"
                            onClick={() => removeHoldingOverride(id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attribution */}
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
        <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
          <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> Top P&amp;L movers (abs)
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 lg:p-6">
          {movers.rows.length === 0 ? (
            <div className="text-sm text-slate-500">Run a scenario to see P&amp;L attribution.</div>
          ) : (
            <div className="space-y-2">
              {movers.rows.map((m) => {
                const w = clampPct((Math.abs(m.pnlUsd) / movers.maxAbs) * 100);
                const isPos = m.pnlUsd >= 0;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-48 text-xs text-slate-300 truncate">{m.name}</div>

                    <div className="flex-1 h-2 rounded bg-black/20 border border-white/10 overflow-hidden">
                      <div
                        className={
                          "h-2 rounded " +
                          (isPos ? "bg-emerald-500/60" : "bg-rose-500/60")
                        }
                        style={{ width: `${w}%` }}
                      />
                    </div>

                    <div
                      className={
                        "w-24 text-right font-mono text-xs " +
                        (isPos ? "text-emerald-300" : "text-rose-300")
                      }
                    >
                      {formatUsdCompact(m.pnlUsd)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
