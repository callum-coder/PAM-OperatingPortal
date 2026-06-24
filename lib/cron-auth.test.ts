import { describe, expect, it } from "vitest";

import { verifyCronRequest } from "./cron-auth";

describe("verifyCronRequest", () => {
  it("accepts bearer token matching CRON_SECRET", () => {
    const request = new Request("https://portal.test/api/cron/briefs", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(verifyCronRequest(request, "test-secret")).toEqual({ ok: true });
  });

  it("rejects missing or incorrect cron secrets", () => {
    const missing = new Request("https://portal.test/api/cron/briefs");
    const wrong = new Request("https://portal.test/api/cron/briefs", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    expect(verifyCronRequest(missing, "test-secret").ok).toBe(false);
    expect(verifyCronRequest(wrong, "test-secret").ok).toBe(false);
    expect(verifyCronRequest(wrong, undefined).ok).toBe(false);
  });
});
