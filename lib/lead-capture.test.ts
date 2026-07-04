import { describe, expect, it } from "vitest";

import { normalizeLeadCapture } from "./lead-capture";

describe("normalizeLeadCapture", () => {
  it("normalises a valid submission", () => {
    expect(
      normalizeLeadCapture({
        email: " Landlord@Example.COM ",
        first_name: "  Jo ",
        source: "mtd-checklist",
      }),
    ).toEqual({
      value: {
        email: "landlord@example.com",
        firstName: "Jo",
        lastName: null,
        source: "mtd-checklist",
      },
    });
  });

  it("rejects invalid emails and non-JSON bodies", () => {
    expect(normalizeLeadCapture({ email: "not-an-email" })).toHaveProperty("error");
    expect(normalizeLeadCapture(null)).toHaveProperty("error");
    expect(normalizeLeadCapture({ email: "a@b" })).toHaveProperty("error");
  });

  it("rejects honeypot submissions", () => {
    expect(
      normalizeLeadCapture({ email: "bot@example.com", company_website: "spam.example" }),
    ).toHaveProperty("error");
  });
});
