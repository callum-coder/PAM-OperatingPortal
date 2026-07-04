// Pure module: validation/normalisation for inbound lead-capture submissions
// (lead magnets on the marketing site posting to /api/lead-capture).

export type LeadCaptureInput = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string | null;
};

export type LeadCaptureResult = { value: LeadCaptureInput } | { error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_FIELD = 200;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD) : "";
}

export function normalizeLeadCapture(body: unknown): LeadCaptureResult {
  if (!body || typeof body !== "object") {
    return { error: "Send a JSON body." };
  }

  const record = body as Record<string, unknown>;
  const email = text(record.email).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  // Honeypot: bots fill every field; humans never see this one.
  if (text(record.company_website)) {
    return { error: "Rejected." };
  }

  return {
    value: {
      email,
      firstName: text(record.first_name) || null,
      lastName: text(record.last_name) || null,
      source: text(record.source) || null,
    },
  };
}
