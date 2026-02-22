import type {
  BalanceSheetCategory,
  CategoryHaircutScenario,
  CategoryScenarioResult,
  HoldingsScenario,
  HoldingsScenarioResult,
  Sec13FHolding,
  ScenarioHoldingRow,
  HoldingsAnalytics,
  HoldingsScenarioSummary,
  HoldingsStressPresetRow,
} from "./types";

/**
 * JPMorgan Public Portfolio Tracker — Engine
 * -----------------------------------------
 * Pure functions only (no React). Safe to unit-test.
 *
 * Key principles:
 *  - Keep computations deterministic (inputs -> outputs).
 *  - Keep UI formatting helpers here so components stay clean.
 *  - Be explicit about disclosure limitations (13F + XBRL are not internal positions).
 */

/**
 * Compute portfolio weights (in %) from a 13F holdings list.
 */
export function withHoldingsWeights(
  holdings: Sec13FHolding[],
  /** If you fetched a limited subset, pass the FULL portfolio total here */
  totalValueUsdOverride?: number
): Sec13FHolding[] {
  const computedTotal = holdings.reduce(
    (s, h) => s + (Number.isFinite(h.valueUsd) ? h.valueUsd : 0),
    0
  );

  const total =
    typeof totalValueUsdOverride === "number" && totalValueUsdOverride > 0
      ? totalValueUsdOverride
      : computedTotal;

  if (total <= 0) return holdings.map((h) => ({ ...h, weightPct: 0 }));

  return holdings.map((h) => ({
    ...h,
    weightPct: (h.valueUsd / total) * 100,
  }));
}

/**
 * Utility: sum of valueUsd (robust against NaN).
 */
export function sumHoldingsValueUsd(holdings: Sec13FHolding[]): number {
  return holdings.reduce(
    (s, h) => s + (Number.isFinite(h.valueUsd) ? h.valueUsd : 0),
    0
  );
}

/**
 * Utility: sort desc by valueUsd
 */
export function sortHoldingsByValueDesc(holdings: Sec13FHolding[]): Sec13FHolding[] {
  return [...holdings].sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
}

/**
 * Compute top-10 concentration (% of total value).
 */
export function computeTop10ConcentrationPct(holdings: Sec13FHolding[]): number {
  const sorted = sortHoldingsByValueDesc(holdings);
  const total = sorted.reduce((s, h) => s + h.valueUsd, 0);
  if (total <= 0) return 0;
  const top10 = sorted.slice(0, 10).reduce((s, h) => s + h.valueUsd, 0);
  return (top10 / total) * 100;
}

/**
 * Herfindahl–Hirschman Index (HHI) using portfolio weights.
 * Returns a number between (0, 1]. Lower is more diversified.
 *
 * HHI = Σ w_i^2 where w_i are fractions (not %).
 */
export function computeHoldingsHhi(holdings: Sec13FHolding[]): number {
  const total = sumHoldingsValueUsd(holdings);
  if (total <= 0) return 0;

  let hhi = 0;
  for (const h of holdings) {
    const w = h.valueUsd / total;
    if (!Number.isFinite(w) || w <= 0) continue;
    hhi += w * w;
  }
  return hhi;
}

/**
 * Effective number of bets (a.k.a. "effective positions").
 * ENB ≈ 1 / HHI
 */
export function computeEffectivePositions(holdings: Sec13FHolding[]): number {
  const hhi = computeHoldingsHhi(holdings);
  if (hhi <= 0) return 0;
  return 1 / hhi;
}

/**
 * Heuristic: "mega-cap tech" grouping by issuer keywords.
 * This is a best-effort string match to create a wow-factor stress bucket
 * even without CUSIP->ticker enrichment.
 *
 * You can replace this with your own enrichment later.
 */
export const MEGACAP_ISSUER_KEYWORDS = [
  "APPLE",
  "MICROSOFT",
  "ALPHABET",
  "AMAZON",
  "META",
  "NVIDIA",
  "TESLA",
  "BERKSHIRE",
  "BROADCOM",
  "NETFLIX",
];

export function holdingMatchesKeywords(h: Sec13FHolding, keywords: string[]): boolean {
  const s = (h.issuer ?? "").toUpperCase();
  return keywords.some((k) => s.includes(k));
}

/**
 * Compute a compact "portfolio fingerprint" for fast executive reading.
 * This is what an interviewer can digest in ~30 seconds.
 */
export function computeHoldingsAnalytics(holdings: Sec13FHolding[]): HoldingsAnalytics {
  const totalValueUsd = sumHoldingsValueUsd(holdings);
  const holdingsCount = holdings.length;

  const sorted = sortHoldingsByValueDesc(holdings);
  const top1 = sorted[0];

  const top1WeightPct = totalValueUsd > 0 && top1 ? (top1.valueUsd / totalValueUsd) * 100 : 0;

  const top10ConcentrationPct = computeTop10ConcentrationPct(holdings);

  const hhi = computeHoldingsHhi(holdings);
  const effectivePositions = hhi > 0 ? 1 / hhi : 0;

  const megaCapValue = holdings
    .filter((h) => holdingMatchesKeywords(h, MEGACAP_ISSUER_KEYWORDS))
    .reduce((s, h) => s + h.valueUsd, 0);

  const megaCapTechWeightPct = totalValueUsd > 0 ? (megaCapValue / totalValueUsd) * 100 : 0;

  return {
    totalValueUsd,
    holdingsCount,
    top1: top1
      ? {
          issuer: top1.issuer,
          cusip: top1.cusip,
          classTitle: top1.classTitle,
          valueUsd: top1.valueUsd,
          weightPct: top1WeightPct,
        }
      : null,
    top1WeightPct,
    top10ConcentrationPct,
    hhi,
    effectivePositions,
    megaCapTechWeightPct,
  };
}

/**
 * Summary-only holdings scenario calculation (no rows).
 * Use this when you need to evaluate many presets quickly.
 */
export function computeHoldingsScenarioSummary(
  holdings: Sec13FHolding[],
  scenario: HoldingsScenario
): HoldingsScenarioSummary {
  const baseValueUsd = sumHoldingsValueUsd(holdings);
  if (baseValueUsd <= 0) {
    return { baseValueUsd: 0, shockedValueUsd: 0, pnlUsd: 0, pnlPct: 0 };
  }

  let pnlUsd = 0;
  for (const h of holdings) {
    const shockPct = Number.isFinite(scenario.overrides[h.id])
      ? scenario.overrides[h.id]!
      : scenario.globalShockPct;

    pnlUsd += h.valueUsd * (shockPct / 100);
  }

  const shockedValueUsd = baseValueUsd + pnlUsd;
  const pnlPct = (pnlUsd / baseValueUsd) * 100;

  return { baseValueUsd, shockedValueUsd, pnlUsd, pnlPct };
}

/**
 * Build a small, high-signal stress pack (fast "wow" view).
 *
 * Notes:
 *  - This is intentionally simple: it treats each 13F line as an equity-like exposure
 *    and applies deterministic % shocks.
 *  - For real trading/structuring workflows, you’d plug in:
 *      * ticker mapping, sectors, factor models, option greeks, etc.
 */
export function buildHoldingsStressPack(holdings: Sec13FHolding[]): HoldingsStressPresetRow[] {
  if (!holdings || holdings.length === 0) return [];

  const sorted = sortHoldingsByValueDesc(holdings);
  const top10Ids = new Set(sorted.slice(0, 10).map((h) => h.id));
  const top1Id = sorted[0]?.id;

  const megaCapIds = new Set(
    holdings.filter((h) => holdingMatchesKeywords(h, MEGACAP_ISSUER_KEYWORDS)).map((h) => h.id)
  );

  const presets: Array<{
    key: HoldingsStressPresetRow["key"];
    label: string;
    description: string;
    globalShockPct: number;
    overrideFor?: (h: Sec13FHolding) => number | null;
  }> = [
    {
      key: "RISK_OFF",
      label: "Risk-off",
      description: "Broad equity risk-off (global -10%).",
      globalShockPct: -10,
    },
    {
      key: "CRASH",
      label: "Crash",
      description: "Fast crash print (global -20%).",
      globalShockPct: -20,
    },
    {
      key: "TOP10_SQUEEZE",
      label: "Top-10 squeeze",
      description: "Concentration stress: Top 10 hit harder (-15%) vs rest (-8%).",
      globalShockPct: -8,
      overrideFor: (h) => (top10Ids.has(h.id) ? -15 : null),
    },
    {
      key: "SINGLE_NAME",
      label: "Single-name blow-up",
      description: "Largest position shock (-35%) + mild tape (-6%).",
      globalShockPct: -6,
      overrideFor: (h) => (top1Id && h.id === top1Id ? -35 : null),
    },
    {
      key: "MEGACAP_TECH",
      label: "Mega-cap tech selloff",
      description: "Heuristic bucket: mega-cap names -20%, rest -7%.",
      globalShockPct: -7,
      overrideFor: (h) => (megaCapIds.has(h.id) ? -20 : null),
    },
  ];

  return presets.map((p) => {
    const overrides: Record<string, number> = {};
    if (p.overrideFor) {
      for (const h of holdings) {
        const ov = p.overrideFor(h);
        if (typeof ov === "number" && Number.isFinite(ov)) overrides[h.id] = ov;
      }
    }

    const scenario: HoldingsScenario = {
      name: p.label,
      globalShockPct: p.globalShockPct,
      overrides,
    };

    return {
      key: p.key,
      label: p.label,
      description: p.description,
      scenario,
      summary: computeHoldingsScenarioSummary(holdings, scenario),
    };
  });
}

/**
 * Apply a simple % shock scenario to holdings (full attribution rows).
 *
 * Rules:
 *  - Each holding gets a shock = overrides[id] ?? globalShockPct
 *  - shockedValue = baseValue * (1 + shock/100)
 *  - pnl = shocked - base
 */
export function applyHoldingsScenario(
  holdings: Sec13FHolding[],
  scenario: HoldingsScenario
): HoldingsScenarioResult {
  const baseValueUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);

  const rows: ScenarioHoldingRow[] = holdings.map((h) => {
    const shockPct = Number.isFinite(scenario.overrides[h.id])
      ? scenario.overrides[h.id]!
      : scenario.globalShockPct;

    const shockedValueUsd = h.valueUsd * (1 + shockPct / 100);
    const pnlUsd = shockedValueUsd - h.valueUsd;
    const weightPct = baseValueUsd > 0 ? (h.valueUsd / baseValueUsd) * 100 : 0;

    return {
      id: h.id,
      issuer: h.issuer,
      cusip: h.cusip,
      classTitle: h.classTitle,
      baseValueUsd: h.valueUsd,
      weightPct,
      shockPct,
      shockedValueUsd,
      pnlUsd,
    };
  });

  const shockedValueUsd = rows.reduce((s, r) => s + r.shockedValueUsd, 0);
  const pnlUsd = shockedValueUsd - baseValueUsd;
  const pnlPct = baseValueUsd > 0 ? (pnlUsd / baseValueUsd) * 100 : 0;

  const byPnlDesc = [...rows].sort((a, b) => b.pnlUsd - a.pnlUsd);
  const byPnlAsc = [...rows].sort((a, b) => a.pnlUsd - b.pnlUsd);

  return {
    scenario,
    baseValueUsd,
    shockedValueUsd,
    pnlUsd,
    pnlPct,
    rows,
    topPnlContributors: byPnlDesc.slice(0, 10),
    worstPnlContributors: byPnlAsc.slice(0, 10),
  };
}

/**
 * Apply category haircuts to a balance-sheet snapshot.
 *
 * IMPORTANT ACCURACY NOTE:
 *  - XBRL tags like Cash / TradingAssets / Loans are *sub-components* of Total Assets.
 *  - Therefore we:
 *      1) Use Total Assets ("Assets") as the anchor/reference total.
 *      2) Apply haircuts to the other categories only (exclude "Assets" from the shocked rows).
 *      3) Report P&L as a % of Total Assets (anchor).
 *
 * Haircut convention:
 *  - Negative haircut => loss (e.g. -5% means -5% mark)
 *  - Positive haircut => gain (rare, but allowed)
 */
export function applyCategoryHaircuts(
  categories: BalanceSheetCategory[],
  end: string,
  scenario: CategoryHaircutScenario
): CategoryScenarioResult {
  const assets = categories.find((c) => c.key === "Assets");
  const baseTotalUsd =
    typeof assets?.valueUsd === "number" && Number.isFinite(assets.valueUsd)
      ? assets.valueUsd
      : categories.reduce((s, c) => s + (Number.isFinite(c.valueUsd) ? c.valueUsd : 0), 0);

  const rows = categories
    .filter((c) => c.key !== "Assets")
    .map((c) => {
      const haircutPct = Number.isFinite(scenario.haircuts[c.key]) ? scenario.haircuts[c.key]! : 0;
      const shockedValueUsd = c.valueUsd * (1 + haircutPct / 100);
      const pnlUsd = shockedValueUsd - c.valueUsd;

      return {
        key: c.key,
        label: c.label,
        baseValueUsd: c.valueUsd,
        haircutPct,
        shockedValueUsd,
        pnlUsd,
      };
    })
    .sort((a, b) => b.baseValueUsd - a.baseValueUsd);

  const pnlUsd = rows.reduce((s, r) => s + r.pnlUsd, 0);
  const shockedTotalUsd = baseTotalUsd + pnlUsd;
  const pnlPct = baseTotalUsd > 0 ? (pnlUsd / baseTotalUsd) * 100 : 0;

  return {
    scenario,
    end,
    baseTotalUsd,
    shockedTotalUsd,
    pnlUsd,
    pnlPct,
    rows,
  };
}

/**
 * Formatting helpers (keep UI clean).
 */
export function formatUsdCompact(v: number): string {
  if (!Number.isFinite(v)) return "-";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";

  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPct(v: number, digits: number = 1): string {
  if (!Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
