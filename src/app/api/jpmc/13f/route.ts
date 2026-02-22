import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CIK = "0000019617"; // JPMorgan Chase & Co

function normalizeCik(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.padStart(10, "0").slice(-10);
}

function cikToEdgarPathNumber(cik: string): string {
  return String(Number(cik));
}

function getSecHeaders(): HeadersInit {
  // FIX 1: The SEC strictly requires "CompanyName YourEmail@domain.com"
  // Generic user agents or missing emails result in immediate 403 blocks.
  const ua = process.env.SEC_USER_AGENT ?? "PeeyushLabs admin@peeyushlabs.com";

  return {
    "User-Agent": ua,
    "Accept-Encoding": "gzip, deflate",
    "Host": "www.sec.gov"
  };
}

// Separate headers for data.sec.gov (different host)
function getSecDataHeaders(): HeadersInit {
  const ua = process.env.SEC_USER_AGENT ?? "PeeyushLabs admin@peeyushlabs.com";
  return {
    "User-Agent": ua,
    "Accept-Encoding": "gzip, deflate",
    "Host": "data.sec.gov"
  };
}

async function secFetchJson<T>(url: string, isDataGov: boolean = false): Promise<T> {
  const res = await fetch(url, {
    headers: isDataGov ? getSecDataHeaders() : getSecHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SEC request failed: ${res.status} ${res.statusText} :: ${url} :: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function secFetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: getSecHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SEC request failed: ${res.status} ${res.statusText} :: ${url} :: ${body.slice(0, 200)}`);
  }
  return await res.text();
}

type SecSubmissionsRecent = {
  accessionNumber?: string[];
  filingDate?: string[];
  reportDate?: string[];
  form?: string[];
  primaryDocument?: string[];
};

type SecSubmissions = {
  cik?: string;
  name?: string;
  filings?: { recent?: SecSubmissionsRecent; };
};

type EdgarIndexItem = {
  name?: string;
  type?: string;
  size?: number;
  "last-modified"?: string;
};

type EdgarIndexJson = {
  directory?: { item?: EdgarIndexItem[]; };
};

function pickLatest13f(recent: SecSubmissionsRecent) {
  const forms = recent.form ?? [];
  const accs = recent.accessionNumber ?? [];
  const filingDates = recent.filingDate ?? [];
  const reportDates = recent.reportDate ?? [];

  const candidates = [];
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i] ?? "";
    if (!form.startsWith("13F-HR")) continue;
    if (!accs[i] || !filingDates[i]) continue;

    candidates.push({
      idx: i,
      form,
      accessionNumber: accs[i],
      filingDate: filingDates[i],
      reportDate: reportDates[i] ?? "",
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const rdA = a.reportDate || "0000-00-00";
    const rdB = b.reportDate || "0000-00-00";
    if (rdA !== rdB) return rdB.localeCompare(rdA);

    const aIsAmend = a.form.includes("/A");
    const bIsAmend = b.form.includes("/A");
    if (aIsAmend !== bIsAmend) return aIsAmend ? 1 : -1;
    return b.filingDate.localeCompare(a.filingDate);
  });

  return candidates[0] ?? null;
}

function decodeXmlEntities(input: string): string {
  return input.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function pickTag(block: string, tag: string): string {
  const re = new RegExp(`<\\s*(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\s*\\/\\s*(?:\\w+:)?${tag}\\s*>`, "i");
  const m = block.match(re);
  return m ? decodeXmlEntities(m[1] ?? "").trim() : "";
}

function pickNum(block: string, tag: string): number | undefined {
  const raw = pickTag(block, tag);
  if (!raw) return undefined;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function stableHoldingId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function parse13fInformationTable(xml: string) {
  // Use a Map to aggregate duplicates
  const holdingsMap = new Map<string, any>();

  const re = /<(?:[a-zA-Z0-9]+:)?infoTable[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?infoTable>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(xml)) !== null) {
    const block = match[1] ?? "";

    const issuer = pickTag(block, "nameOfIssuer");
    const classTitle = pickTag(block, "titleOfClass");
    const cusip = pickTag(block, "cusip");
    const valueThousands = pickNum(block, "value") ?? 0;
    const valueUsd = valueThousands * 1000;
    const putCall = ["PUT", "CALL"].includes(pickTag(block, "putCall").toUpperCase()) 
                    ? pickTag(block, "putCall").toUpperCase() 
                    : "EQUITY";

    if (!issuer || !cusip || valueUsd <= 0) continue;

    // Generate the unique ID based on the security properties
    const id = stableHoldingId([cusip, issuer, classTitle, putCall]);

    if (holdingsMap.has(id)) {
      // IF DUPLICATE: Add the value and shares to the existing entry
      const existing = holdingsMap.get(id);
      existing.valueUsd += valueUsd;
      existing.shares = (existing.shares || 0) + (pickNum(block, "sshPrnamt") || 0);
    } else {
      // IF NEW: Create the entry
      holdingsMap.set(id, {
        id,
        issuer,
        classTitle,
        cusip,
        valueUsd,
        shares: pickNum(block, "sshPrnamt"),
        shareType: pickTag(block, "sshPrnamtType"),
        putCall: putCall === "EQUITY" ? null : putCall,
        investmentDiscretion: pickTag(block, "investmentDiscretion"),
        votingSole: pickNum(block, "Sole"),
        votingShared: pickNum(block, "Shared"),
        votingNone: pickNum(block, "None"),
      });
    }
  }
  
  // Return the merged array
  return Array.from(holdingsMap.values());
}


function pickInfoTableFile(items: EdgarIndexItem[]): string | null {
  const xml = items.map((i) => i.name).filter((n): n is string => typeof n === "string" && n.toLowerCase().endsWith(".xml"));
  return xml.find((n) => /information[_-]?table.*\.xml$/i.test(n)) ?? xml.find((n) => /infotable.*\.xml$/i.test(n)) ?? xml.find((n) => !/primary_doc\.xml$/i.test(n)) ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const cik = normalizeCik(url.searchParams.get("cik") ?? DEFAULT_CIK);
    const limit = Math.max(1, Math.min(10000, Number(url.searchParams.get("limit") ?? "8000")));

    const secSubmissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const submissions = await secFetchJson<SecSubmissions>(secSubmissionsUrl, true);

    const recent = submissions.filings?.recent;
    if (!recent) throw new Error("SEC submissions missing recent filings");

    const latest = pickLatest13f(recent);
    if (!latest) throw new Error("No 13F-HR filings found");

    const cikNum = cikToEdgarPathNumber(cik);
    const accNoNoDashes = latest.accessionNumber.replace(/-/g, "");

    const secIndexJsonUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoNoDashes}/index.json`;
    const indexJson = await secFetchJson<EdgarIndexJson>(secIndexJsonUrl);

    const infoFile = pickInfoTableFile(indexJson.directory?.item ?? []);
    if (!infoFile) throw new Error("Could not locate 13F information table");

    const infoTableUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoNoDashes}/${infoFile}`;
    const xml = await secFetchText(infoTableUrl);
    
    const parsed = parse13fInformationTable(xml);

    // Limit the payload size to prevent frontend lag, but compute true totals.
    const holdings = parsed.slice(0, limit);
    const totalValueUsd = parsed.reduce((s, h) => s + h.valueUsd, 0);
    const top10Value = [...parsed].sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 10).reduce((s, h) => s + h.valueUsd, 0);

    return NextResponse.json({
      meta: { cik, accessionNumber: latest.accessionNumber, filingDate: latest.filingDate, reportDate: latest.reportDate, form: latest.form, infoTableUrl, secIndexJsonUrl, secSubmissionsUrl },
      holdings,
      totals: { holdingsCount: parsed.length, returnedHoldingsCount: holdings.length, totalValueUsd, top10ConcentrationPct: totalValueUsd > 0 ? (top10Value / totalValueUsd) * 100 : 0 },
    }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=21600" } });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "JPMC 13F fetch failed", details: message }, { status: 500 });
  }
}