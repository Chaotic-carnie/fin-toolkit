"use client";

import { Banknote, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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

export function BalanceSheetPanel() {
  const {
    balanceSheet,
    loading,
    categoryScenario,
    categoryScenarioResult,
    setCategoryHaircut,
    clearCategoryHaircuts,
  } = useJpmcTrackerStore();

  const rows = categoryScenarioResult?.rows ?? [];

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
        <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
          <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              Balance Sheet Snapshot & Haircuts
            </span>

            <Button
              variant="outline"
              className="h-8 text-[9px] uppercase font-bold text-slate-200 border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => clearCategoryHaircuts()}
              disabled={Object.keys(categoryScenario.haircuts).length === 0}
              data-html2canvas-ignore="true"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear haircuts
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 lg:p-6">
          {loading.balanceSheet && !balanceSheet ? (
            <div className="text-sm text-slate-400 animate-pulse">Loading SEC XBRL balance-sheet facts…</div>
          ) : !balanceSheet ? (
            <div className="text-sm text-slate-500">No balance sheet data loaded.</div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">As of</div>
                  <div className="text-sm font-mono text-slate-200 mt-1">{balanceSheet.end}</div>
                </div>
                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Total assets</div>
                  <div className="text-sm font-mono text-slate-200 mt-1">
                    {categoryScenarioResult ? formatUsdCompact(categoryScenarioResult.baseTotalUsd) : "-"}
                  </div>
                </div>
                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Implied shocked</div>
                  <div className="text-sm font-mono text-slate-200 mt-1">
                    {categoryScenarioResult ? formatUsdCompact(categoryScenarioResult.shockedTotalUsd) : "-"}
                  </div>
                </div>
                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Shock P&amp;L</div>
                  <div
                    className={
                      "text-sm font-mono mt-1 " +
                      ((categoryScenarioResult?.pnlUsd ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300")
                    }
                  >
                    {categoryScenarioResult
                      ? `${formatUsdCompact(categoryScenarioResult.pnlUsd)} (${categoryScenarioResult.pnlPct.toFixed(2)}%)`
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto dark-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Category</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Value</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Haircut (%)</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Shocked</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">P&amp;L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.key} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell className="text-slate-200">{r.label}</TableCell>
                        <TableCell className="text-right font-mono text-slate-200">
                          {formatUsdCompact(r.baseValueUsd)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={r.haircutPct}
                            onChange={(e) => setCategoryHaircut(r.key, Number(e.target.value))}
                            className="w-28 ml-auto bg-black/20 border-white/10 text-white text-right font-mono h-9"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-200">
                          {formatUsdCompact(r.shockedValueUsd)}
                        </TableCell>
                        <TableCell
                          className={
                            "text-right font-mono " +
                            (r.pnlUsd >= 0 ? "text-emerald-300" : "text-rose-300")
                          }
                        >
                          {formatUsdCompact(r.pnlUsd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                Haircuts are purely a <span className="text-slate-200 font-semibold">what‑if</span> exercise on
                disclosed balance‑sheet categories. They are not risk forecasts.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
