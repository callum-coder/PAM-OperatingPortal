import { createHubspotContact, hasHubspotConfig } from "@/lib/hubspot";
import { normalizeLeadCapture } from "@/lib/lead-capture";

// Inbound lead capture for marketing-site lead magnets. Server-to-server only:
// callers must send the shared secret (x-lead-capture-secret), so browsers
// should post to the marketing site's backend, which relays here.
export async function POST(request: Request) {
  const secret = process.env.LEAD_CAPTURE_SECRET;
  const provided = request.headers.get("x-lead-capture-secret");

  if (!secret || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasHubspotConfig()) {
    return Response.json({ ok: false, error: "HubSpot is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const normalized = normalizeLeadCapture(body);

  if ("error" in normalized) {
    return Response.json({ ok: false, error: normalized.error }, { status: 400 });
  }

  const result = await createHubspotContact(normalized.value);

  if (result.status === "failed") {
    return Response.json({ ok: false, error: result.error }, { status: 502 });
  }

  return Response.json({ ok: true, status: result.status });
}
