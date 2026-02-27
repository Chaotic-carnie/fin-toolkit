"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Download,
  TrendingDown,
  Layers,
  ArrowRight,
  BarChart3,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from "recharts";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { useJpmcTrackerStore } from "~/features/jpmc/store";
import type { Sec13FHolding } from "~/features/jpmc/types";
import {
  applyCategoryHaircuts,
  applyHoldingsScenario,
  buildHoldingsStressPack,
  formatPct,
  formatUsdCompact,
  sortHoldingsByValueDesc,
  sumHoldingsValueUsd,
} from "~/features/jpmc/engine";

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function truncate(s: string, n: number): string {
  if (!s) return "-";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[\n\r",]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function downloadHoldingsCsv(holdings: Sec13FHolding[], filename: string) {
  const header = [
    "issuer",
    "cusip",
    "classTitle",
    "valueUsd",
    "weightPct",
    "putCall",
    "shares",
    "shareType",
  ];

  const rows = holdings.map((h) => [
    h.issuer,
    h.cusip,
    h.classTitle,
    h.valueUsd,
    typeof h.weightPct === "number" ? h.weightPct : "",
    h.putCall ?? "",
    h.shares ?? "",
    h.shareType ?? "",
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

/**
 * Dashboard = "30-second wow" view.
 *
 * Design goals:
 *  - high-signal panels
 *  - minimal reading
 *  - consistent visual language with the rest of Fin-Toolkit
 */
export function Dashboard() {
  const { holdingsReport, balanceSheet, loading, setHoldingsScenario } = useJpmcTrackerStore();

  const holdings = holdingsReport?.holdings ?? [];
  const totalValueUsd = useMemo(() => sumHoldingsValueUsd(holdings), [holdings]);

  const topPositions = useMemo(
    () => sortHoldingsByValueDesc(holdings).slice(0, 8),
    [holdings]
  );

  // Concentration curve: cumulative weight vs rank.
  const concentrationCurve = useMemo(() => {
    const sorted = sortHoldingsByValueDesc(holdings);
    const n = Math.min(25, sorted.length);
    let cum = 0;

    return Array.from({ length: n }).map((_, i) => {
      const h = sorted[i]!;
      const w = totalValueUsd > 0 ? (h.valueUsd / totalValueUsd) * 100 : 0;
      cum += w;
      return {
        rank: i + 1,
        cumWeight: Number(cum.toFixed(2)),
      };
    });
  }, [holdings, totalValueUsd]);

  const stressPack = useMemo(() => buildHoldingsStressPack(holdings), [holdings]);

  const defaultKey = useMemo(() => {
    const crash = stressPack.find((p) => p.key === "CRASH")?.key;
    return crash ?? stressPack[0]?.key ?? "RISK_OFF";
  }, [stressPack]);

  const [selectedKey, setSelectedKey] = useState<string>(defaultKey);

  useEffect(() => {
    setSelectedKey(defaultKey);
  }, [defaultKey]);

  const selected = useMemo(
    () => stressPack.find((p) => p.key === selectedKey) ?? null,
    [stressPack, selectedKey]
  );

  const selectedResult = useMemo(() => {
    if (!selected || holdings.length === 0) return null;
    return applyHoldingsScenario(holdings, selected.scenario);
  }, [holdings, selected]);

  const maxAbsMover = useMemo(() => {
    const rows = selectedResult?.worstPnlContributors ?? [];
    return Math.max(1, ...rows.map((r) => Math.abs(r.pnlUsd)));
  }, [selectedResult]);

  const infoTableUrl = holdingsReport?.meta.infoTableUrl ?? null;

  const bsComposition = useMemo(() => {
    if (!balanceSheet) return null;

    const assets = balanceSheet.categories.find((c) => c.key === "Assets")?.valueUsd;
    const denom = typeof assets === "number" && assets > 0 ? assets : null;

    const rows = balanceSheet.categories
      .filter((c) => c.key !== "Assets")
      .map((c) => ({
        ...c,
        pctOfAssets: denom ? (c.valueUsd / denom) * 100 : null,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);

    return {
      end: balanceSheet.end,
      assetsTotalUsd: denom,
      rows,
      companyFactsUrl: balanceSheet.source.companyFactsUrl,
    };
  }, [balanceSheet]);

  const bsRatesShock = useMemo(() => {
    if (!balanceSheet) return null;

    // Simple, interview-friendly toy shock.
    // Tune per your desk story: rates up -> bond marks + trading assets marks.
    const scenario = {
      name: "Rates +100bp (toy)",
      haircuts: {
        TradingAssets: -7,
        AvailableForSaleSecuritiesDebtSecurities: -5,
        HeldToMaturitySecuritiesDebtSecurities: -4,
        LoansReceivableNet: -2,
        Goodwill: -15,
        IntangibleAssetsNetExcludingGoodwill: -15,
      },
    };

    return applyCategoryHaircuts(balanceSheet.categories, balanceSheet.end, scenario);
  }, [balanceSheet]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top positions + concentration */}
        <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
            <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Concentration & Top Positions
              </span>

              <div className="flex items-center gap-3" data-html2canvas-ignore="true">
                {infoTableUrl ? (
                  <a
                    href={infoTableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] uppercase tracking-widest font-bold text-slate-400 hover:text-white inline-flex items-center gap-1"
                    title="Open SEC information table"
                  >
                    SEC <ExternalLink className="w-3 h-3" />
                  </a>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[9px] uppercase font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  disabled={!holdings.length}
                  onClick={() =>
                    downloadHoldingsCsv(
                      holdings,
                      `jpmc-13f-${holdingsReport?.meta.reportDate ?? "snapshot"}.csv`
                    )
                  }
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  CSV
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 lg:p-6">
            {loading.holdings && holdings.length === 0 ? (
              <div className="text-sm text-slate-400 animate-pulse">Loading 13F holdings…</div>
            ) : holdings.length === 0 ? (
              <div className="text-sm text-slate-500">No holdings loaded.</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {topPositions.map((h) => {
                    const w =
                      typeof h.weightPct === "number"
                        ? h.weightPct
                        : totalValueUsd > 0
                          ? (h.valueUsd / totalValueUsd) * 100
                          : 0;

                    return (
                      <div key={h.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-200 truncate">{h.issuer}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {h.cusip} • {truncate(h.classTitle, 20)}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono text-slate-100">
                              {formatPct(w, 2)}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {formatUsdCompact(h.valueUsd)}
                            </div>
                          </div>
                        </div>

                        <div className="h-2 rounded bg-black/20 border border-white/10 overflow-hidden">
                          <div
                            className="h-2 rounded bg-blue-500/60"
                            style={{ width: `${clampPct(w)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2 text-[11px] text-slate-500 leading-relaxed">
                    <span className="text-slate-200 font-semibold">Read:</span> weights are based on reported
                    market value in the 13F information table (quarterly, delayed).
                  </div>
                </div>

                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" /> Cumulative weight curve
                    </h3>
                    <span className="text-[10px] font-mono text-slate-600">TOP 25</span>
                  </div>

                  {concentrationCurve.length === 0 ? (
                    <div className="text-sm text-slate-500">No data.</div>
                  ) : (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={concentrationCurve} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                          <defs>
                            <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="rank"
                            stroke="#64748b"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: "#334155" }}
                          />
                          <YAxis
                            stroke="#64748b"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: "#334155" }}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <RechartsTooltip
                            cursor={{ stroke: "#334155", strokeDasharray: "3 3" }}
                            contentStyle={{
                              background: "#0f172a",
                              border: "1px solid rgba(255,255,255,0.10)",
                              borderRadius: 12,
                              color: "#e2e8f0",
                              fontSize: 12,
                            }}
                            formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Cum. Weight"]}
                            labelFormatter={(l) => `Rank ${l}`}
                          />

                          <ReferenceLine x={10} stroke="#f59e0b" strokeDasharray="4 4" />

                          <Area
                            type="monotone"
                            dataKey="cumWeight"
                            stroke="#3b82f6"
                            fill="url(#cumFill)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                    <span className="text-slate-200 font-semibold">Read:</span> how quickly cumulative weight
                    approaches 100% tells you concentration at a glance.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stress pack */}
        <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
            <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-400" />
                1‑Click Stress Pack
              </span>

              {selected ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[9px] uppercase font-bold text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                  onClick={() => setHoldingsScenario(selected.scenario)}
                  disabled={!holdings.length}
                  title="Apply this preset to the Scenario Lab (global shock + overrides)"
                  data-html2canvas-ignore="true"
                >
                  Apply to Lab <ArrowRight className="w-3 h-3 ml-1.5" />
                </Button>
              ) : null}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 lg:p-6 space-y-5">
            {stressPack.length === 0 ? (
              <div className="text-sm text-slate-500">Load holdings to see stress presets.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2" data-html2canvas-ignore="true">
                  {stressPack.map((p) => {
                    const active = p.key === selectedKey;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setSelectedKey(p.key)}
                        className={
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 uppercase tracking-widest whitespace-nowrap " +
                          (active
                            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            : "text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200")
                        }
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {selected ? (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-slate-200 font-semibold">{selected.label}</div>
                    <div className="text-[11px] text-slate-500">{selected.description}</div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Base</div>
                        <div className="text-sm font-mono text-slate-100">
                          {formatUsdCompact(selected.summary.baseValueUsd)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">P&amp;L</div>
                        <div className="text-sm font-mono text-rose-300">
                          {formatUsdCompact(selected.summary.pnlUsd)} ({selected.summary.pnlPct.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3">
                    Biggest loss contributors (top 6)
                  </div>

                  {!selectedResult ? (
                    <div className="text-sm text-slate-500">Select a scenario to see attribution.</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedResult.worstPnlContributors.slice(0, 6).map((r) => {
                        const w = clampPct((Math.abs(r.pnlUsd) / maxAbsMover) * 100);
                        return (
                          <div key={r.id} className="flex items-center gap-3">
                            <div className="w-44 text-xs text-slate-300 truncate">{r.issuer}</div>

                            <div className="flex-1 h-2 rounded bg-black/20 border border-white/10 overflow-hidden">
                              <div className="h-2 rounded bg-rose-500/60" style={{ width: `${w}%` }} />
                            </div>

                            <div className="w-24 text-right font-mono text-xs text-rose-300">
                              {formatUsdCompact(r.pnlUsd)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed">
                  <span className="text-slate-200 font-semibold">Read:</span> deterministic % shocks overlay
                  public 13F values — useful for talk‑tracks, not a risk forecast.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance sheet bucket view */}
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
        <CardHeader className="py-3 lg:py-4 border-b border-white/5 px-4 lg:px-6">
          <CardTitle className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Balance Sheet Buckets (SEC XBRL)
            </span>

            {bsComposition?.companyFactsUrl ? (
              <a
                href={bsComposition.companyFactsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] uppercase tracking-widest font-bold text-slate-400 hover:text-white inline-flex items-center gap-1"
                data-html2canvas-ignore="true"
              >
                companyfacts <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {!bsComposition ? (
              <div className="text-sm text-slate-500">Load balance sheet data to see buckets.</div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">As of</div>
                    <div className="text-sm font-mono text-slate-200 mt-1">{bsComposition.end}</div>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Total assets</div>
                    <div className="text-sm font-mono text-slate-200 mt-1">
                      {bsComposition.assetsTotalUsd ? formatUsdCompact(bsComposition.assetsTotalUsd) : "-"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Toy shock P&amp;L</div>
                    <div
                      className={
                        "text-sm font-mono mt-1 " +
                        ((bsRatesShock?.pnlUsd ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300")
                      }
                    >
                      {bsRatesShock
                        ? `${formatUsdCompact(bsRatesShock.pnlUsd)} (${bsRatesShock.pnlPct.toFixed(2)}%)`
                        : "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3">
                    Largest buckets (share of assets)
                  </div>

                  <div className="space-y-2">
                    {bsComposition.rows.slice(0, 6).map((r) => {
                      const pct = r.pctOfAssets ?? 0;
                      return (
                        <div key={r.key} className="flex items-center gap-3">
                          <div className="w-64 text-xs text-slate-300 truncate">{r.label}</div>
                          <div className="flex-1 h-2 rounded bg-black/20 border border-white/10 overflow-hidden">
                            <div
                              className="h-2 rounded bg-emerald-500/60"
                              style={{ width: `${clampPct(pct)}%` }}
                            />
                          </div>
                          <div className="w-24 text-right font-mono text-xs text-slate-200">
                            {r.pctOfAssets !== null ? formatPct(r.pctOfAssets, 1) : "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed">
                  <span className="text-slate-200 font-semibold">Read:</span> buckets come from SEC XBRL tags.
                  They are not additive components unless explicitly modeled; we anchor P&amp;L to Total Assets.
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
