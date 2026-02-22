import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CIK = "0000019617"; // JPMorgan Chase & Co

function normalizeCik(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.padStart(10, "0").slice(-10);
}

function getSecHeaders(): HeadersInit {
  const ua =
    process.env.SEC_USER_AGENT ??
    "PeeyushLabsJpmcTracker/1.0 (contact: contact@yourdomain.com)";

  return {
    "User-Agent": ua,
    Accept: "application/json,text/plain,*/*",
  };
}

async function secFetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: getSecHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SEC request failed: ${res.status} ${res.statusText} :: ${url} :: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

type CompanyFacts = {
  facts?: {
    [taxonomy: string]: {
      [tag: string]: {
        units?: {
          [unit: string]: Array<{
            end?: string;
            val?: number;
            form?: string;
            filed?: string;
            fp?: string;
            fy?: number;
          }>;
        };
      };
    };
  };
};

type TagConfig = { key: string; label: string };

/**
 * Tags are best-effort.
 * If a tag doesn't exist for the company, it will be skipped.
 */
const TAGS: TagConfig[] = [
  { key: "Assets", label: "Total Assets" },
  { key: "CashAndCashEquivalentsAtCarryingValue", label: "Cash & Cash Equivalents" },
  { key: "TradingAssets", label: "Trading Assets" },
  { key: "AvailableForSaleSecuritiesDebtSecurities", label: "AFS Debt Securities" },
  { key: "HeldToMaturitySecuritiesDebtSecurities", label: "HTM Debt Securities" },
  { key: "LoansReceivableNet", label: "Net Loans" },
  { key: "Goodwill", label: "Goodwill" },
  { key: "IntangibleAssetsNetExcludingGoodwill", label: "Intangibles (ex-Goodwill)" },
];

function pickLatestByEnd(items: Array<{ end?: string; val?: number; form?: string; filed?: string }>):
  | { end: string; val: number; form?: string; filed?: string }
  | null {
  const valid = items
    .filter((i) => typeof i.end === "string" && typeof i.val === "number" && Number.isFinite(i.val))
    .map((i) => ({ end: i.end as string, val: i.val as number, form: i.form, filed: i.filed }));

  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    if (a.end !== b.end) return b.end.localeCompare(a.end);
    // For same end date, prefer latest filed
    const fa = a.filed ?? "";
    const fb = b.filed ?? "";
    return fb.localeCompare(fa);
  });

  return valid[0] ?? null;
}

function pickByEndOrLatest(
  items: Array<{ end?: string; val?: number; form?: string; filed?: string }>,
  targetEnd: string
) {
  const exact = items
    .filter((i) => i.end === targetEnd && typeof i.val === "number" && Number.isFinite(i.val))
    .map((i) => ({ end: i.end as string, val: i.val as number, form: i.form, filed: i.filed }));

  if (exact.length > 0) {
    exact.sort((a, b) => (b.filed ?? "").localeCompare(a.filed ?? ""));
    return exact[0]!;
  }

  return pickLatestByEnd(items);
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const cik = normalizeCik(url.searchParams.get("cik") ?? DEFAULT_CIK);

    const companyFactsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const facts = await secFetchJson<CompanyFacts>(companyFactsUrl);

    const usGaap = facts.facts?.["us-gaap"];
    if (!usGaap) {
      return NextResponse.json(
        { error: "companyfacts missing us-gaap taxonomy", cik, companyFactsUrl },
        { status: 502 }
      );
    }

    // Anchor end date using Total Assets if available.
    const assetsSeries = usGaap["Assets"]?.units?.["USD"] ?? [];
    const assetsLatest = pickLatestByEnd(assetsSeries);
    const anchorEnd = assetsLatest?.end ?? "";

    const categories = TAGS.map((t) => {
      const series = usGaap[t.key]?.units?.["USD"] ?? [];
      if (series.length === 0) return null;

      const pick = anchorEnd ? pickByEndOrLatest(series, anchorEnd) : pickLatestByEnd(series);
      if (!pick) return null;

      return {
        key: t.key,
        label: t.label,
        valueUsd: pick.val,
        end: pick.end,
        form: pick.form,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // Determine snapshot end as the most common / latest end.
    const end = anchorEnd || (categories[0]?.end ?? "");

    return NextResponse.json(
      {
        cik,
        end,
        categories,
        source: { companyFactsUrl },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=21600",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "JPMC balance-sheet fetch failed", details: message },
      { status: 500 }
    );
  }
}
