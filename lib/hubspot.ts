import "server-only";

// Server-side HubSpot CRM client. Reads HUBSPOT_ACCESS_TOKEN (a Private App
// token, e.g. pat-eu1-…) and calls the CRM API. Region is encoded in the token,
// so the base host is always api.hubapi.com. Degrades to null metrics when the
// token is absent or a call fails, so callers never crash on it.

const HUBSPOT_BASE = "https://api.hubapi.com";
const TIMEOUT_MS = 10000;

export function hasHubspotConfig(): boolean {
  return Boolean(process.env.HUBSPOT_ACCESS_TOKEN);
}

export type HubspotGtmMetrics = {
  source: "hubspot";
  contacts: number | null;
  leads: number | null;
  deals: number | null;
  subscriptions: number | null;
};

// Count all records of an object via the CRM Search API, which returns `total`
// without paginating. Returns null on missing scope / error / no token.
async function countObjects(objectType: string): Promise<number | null> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/${objectType}/search`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ limit: 1 }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { total?: number };
    return typeof body.total === "number" ? body.total : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getHubspotGtmMetrics(): Promise<HubspotGtmMetrics> {
  if (!hasHubspotConfig()) {
    return { source: "hubspot", contacts: null, leads: null, deals: null, subscriptions: null };
  }

  const [contacts, leads, deals, subscriptions] = await Promise.all([
    countObjects("contacts"),
    countObjects("leads"),
    countObjects("deals"),
    countObjects("subscriptions"),
  ]);

  return { source: "hubspot", contacts, leads, deals, subscriptions };
}
