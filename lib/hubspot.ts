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

export type HubspotContactResult = {
  status: "created" | "exists" | "failed" | "skipped";
  error?: string;
};

// Creates a contact from a lead-capture submission. A 409 means the contact
// already exists — treated as success, not failure.
export async function createHubspotContact(input: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string | null;
}): Promise<HubspotContactResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return { status: "skipped" };

  const properties: Record<string, string> = {
    email: input.email,
    lifecyclestage: "lead",
  };
  if (input.firstName) properties.firstname = input.firstName;
  if (input.lastName) properties.lastname = input.lastName;
  if (input.source) properties.hs_content_membership_notes = `source: ${input.source}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (response.status === 409) return { status: "exists" };
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      return { status: "failed", error: body?.message ?? `HTTP ${response.status}` };
    }
    return { status: "created" };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "hubspot request failed",
    };
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
