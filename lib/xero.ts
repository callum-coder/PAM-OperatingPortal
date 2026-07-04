import "server-only";

import {
  extractPnlSummary,
  monthRange,
  previousMonthRange,
  type PnlSummary,
} from "./xero-report";

// Server-side Xero client using a Custom Connection (machine-to-machine
// client_credentials grant, single organisation). Configure XERO_CLIENT_ID and
// XERO_CLIENT_SECRET from a Xero custom connection with the
// accounting.reports.read scope. Degrades to null metrics when unconfigured or
// on any API failure — finance data is an enhancement, never a crash.

const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const ACCOUNTING_BASE = "https://api.xero.com/api.xro/2.0";
const TIMEOUT_MS = 15000;

export function hasXeroConfig(): boolean {
  return Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
}

export type XeroFinanceSummary = {
  source: "xero";
  organisation: string | null;
  monthToDate: PnlSummary;
  previousMonth: PnlSummary;
};

const EMPTY_PNL: PnlSummary = { totalIncome: null, totalExpenses: null, netProfit: null };

export function emptyXeroSummary(): XeroFinanceSummary {
  return {
    source: "xero",
    organisation: null,
    monthToDate: { ...EMPTY_PNL },
    previousMonth: { ...EMPTY_PNL },
  };
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response.ok ? response : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "accounting.reports.read accounting.settings.read",
    }).toString(),
  });
  if (!response) return null;

  const body = (await response.json().catch(() => null)) as { access_token?: string } | null;
  return body?.access_token ?? null;
}

async function getTenantId(token: string): Promise<string | null> {
  const response = await fetchWithTimeout(CONNECTIONS_URL, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!response) return null;

  const body = (await response.json().catch(() => null)) as { tenantId?: string }[] | null;
  return body?.[0]?.tenantId ?? null;
}

async function getJson(token: string, tenantId: string, path: string): Promise<unknown | null> {
  const response = await fetchWithTimeout(`${ACCOUNTING_BASE}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "xero-tenant-id": tenantId,
      accept: "application/json",
    },
  });
  if (!response) return null;
  return response.json().catch(() => null);
}

export async function getXeroFinanceSummary(): Promise<XeroFinanceSummary> {
  if (!hasXeroConfig()) return emptyXeroSummary();

  const token = await getAccessToken();
  if (!token) return emptyXeroSummary();

  const tenantId = await getTenantId(token);
  if (!tenantId) return emptyXeroSummary();

  const mtd = monthRange();
  const prev = previousMonthRange();

  const [orgBody, mtdBody, prevBody] = await Promise.all([
    getJson(token, tenantId, "/Organisation"),
    getJson(token, tenantId, `/Reports/ProfitAndLoss?fromDate=${mtd.fromDate}&toDate=${mtd.toDate}`),
    getJson(token, tenantId, `/Reports/ProfitAndLoss?fromDate=${prev.fromDate}&toDate=${prev.toDate}`),
  ]);

  const organisation =
    ((orgBody as { Organisations?: { Name?: string }[] })?.Organisations?.[0]?.Name as string | undefined) ??
    null;

  return {
    source: "xero",
    organisation,
    monthToDate: mtdBody ? extractPnlSummary(mtdBody) : { ...EMPTY_PNL },
    previousMonth: prevBody ? extractPnlSummary(prevBody) : { ...EMPTY_PNL },
  };
}
