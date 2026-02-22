"use client";

import { useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

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

import { useJpmcTrackerStore } from "~/features/jpmc/store";
import { formatUsdCompact } from "~/features/jpmc/engine";

export function HoldingsTable() {
  const {
    holdingsReport,
    loading,
    holdingsSearch,
    holdingsMinValueUsd,
    setHoldingsSearch,
    setHoldingsMinValueUsd,
    holdingsScenario,
    setHoldingOverride,
    removeHoldingOverride,
  } = useJpmcTrackerStore();

  const holdings = holdingsReport?.holdings ?? [];

  const filtered = useMemo(() => {
    const q = holdingsSearch.trim().toLowerCase();
    const minV = Number.isFinite(holdingsMinValueUsd) ? holdingsMinValueUsd : 0;

    return holdings
      .filter((h) => (minV > 0 ? h.valueUsd >= minV : true))
      .filter((h) => {
        if (!q) return true;
        return (
          h.issuer.toLowerCase().includes(q) ||
          h.cusip.toLowerCase().includes(q) ||
          h.classTitle.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [holdings, holdingsSearch, holdingsMinValueUsd]);

  const displayed = filtered.slice(0, 75);

  const totals = holdingsReport?.totals;
  const returnedCount = (totals as any)?.returnedHoldingsCount as number | undefined;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
        <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
          <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" /> Filters
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 lg:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Search issuer / CUSIP / class
            </Label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={holdingsSearch}
                onChange={(e) => setHoldingsSearch(e.target.value)}
                placeholder="AAPL, Microsoft, 037833100, COM…"
                className="pl-9 bg-black/20 border-white/10 h-11 text-white text-xs"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Tip: try <span className="font-mono text-slate-300">NVDA</span> or a CUSIP.
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Min position value (USD)
            </Label>
            <Input
              type="number"
              value={holdingsMinValueUsd}
              onChange={(e) => setHoldingsMinValueUsd(Number(e.target.value || 0))}
              placeholder="0"
              className="bg-black/20 border-white/10 h-11 text-white font-mono"
            />
            <div className="text-[11px] text-slate-500">
              Try <span className="font-mono text-slate-300">100000000</span> for $100M+
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Holdings</div>
                <div className="text-sm font-mono text-slate-200 mt-1">{totals?.holdingsCount ?? "-"}</div>
              </div>
              <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Total</div>
                <div className="text-sm font-mono text-slate-200 mt-1">
                  {typeof totals?.totalValueUsd === "number" ? formatUsdCompact(totals.totalValueUsd) : "-"}
                </div>
              </div>
              <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Top 10</div>
                <div className="text-sm font-mono text-slate-200 mt-1">
                  {typeof totals?.top10ConcentrationPct === "number"
                    ? `${totals.top10ConcentrationPct.toFixed(1)}%`
                    : "-"}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Showing <span className="text-slate-200 font-mono">{displayed.length}</span> of{" "}
              <span className="text-slate-200 font-mono">{filtered.length}</span> filtered rows.
              {typeof returnedCount === "number" &&
              typeof totals?.holdingsCount === "number" &&
              returnedCount < totals.holdingsCount ? (
                <>
                  {" "}<span className="text-slate-600">|</span>{" "}
                  <span>
                    API payload limited to{" "}
                    <span className="text-slate-200 font-mono">{returnedCount}</span> of{" "}
                    <span className="text-slate-200 font-mono">{totals.holdingsCount}</span>
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
        <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
          <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300">
            Holdings Table (Top by Value)
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="p-4 lg:p-6">
            {loading.holdings && holdings.length === 0 ? (
              <div className="text-sm text-slate-400 animate-pulse">Loading 13F holdings from SEC…</div>
            ) : holdings.length === 0 ? (
              <div className="text-sm text-slate-400">No holdings loaded.</div>
            ) : (
              <div className="w-full overflow-x-auto dark-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Issuer</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">CUSIP</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Class</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Value</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Weight</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-500 text-right">Shock Override</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayed.map((h) => {
                      const override = holdingsScenario.overrides[h.id];
                      const overrideVal = typeof override === "number" ? override : "";

                      return (
                        <TableRow key={h.id} className="border-white/10 hover:bg-white/5 transition-colors">
                          <TableCell className="text-slate-200 max-w-[420px] truncate">
                            {h.issuer}
                            {h.putCall ? (
                              <span className="ml-2 text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold uppercase tracking-widest">
                                {h.putCall}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-slate-400 font-mono">{h.cusip}</TableCell>
                          <TableCell className="text-slate-400 max-w-[220px] truncate">{h.classTitle}</TableCell>
                          <TableCell className="text-right font-mono text-slate-200">{formatUsdCompact(h.valueUsd)}</TableCell>
                          <TableCell className="text-right font-mono text-slate-400">
                            {typeof h.weightPct === "number" ? `${h.weightPct.toFixed(2)}%` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                value={overrideVal}
                                placeholder={String(holdingsScenario.globalShockPct)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "") {
                                    removeHoldingOverride(h.id);
                                    return;
                                  }
                                  setHoldingOverride(h.id, Number(v));
                                }}
                                className="w-24 bg-black/20 border-white/10 text-white text-right font-mono h-9"
                              />
                              <span className="text-[11px] text-slate-500">%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
              <span className="text-slate-200 font-semibold">How shocks work:</span> empty override uses the global
              scenario shock. Enter a number (e.g. <span className="font-mono text-slate-300">-20</span>) to override
              that holding in the Scenario Lab.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
