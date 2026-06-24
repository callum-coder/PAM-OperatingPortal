import { describe, expect, it } from "vitest";

import { buildStatusUpsert, type StatusInput } from "./status-payload";

describe("buildStatusUpsert", () => {
  it("normalizes optional JSON fields and targets the shared status key", () => {
    const input: StatusInput = {
      module: "gtm",
      subsystem: "briefs",
      product: "pam",
      status: "ok",
      headline: "Brief generated",
      metrics: { signups: 12 },
    };

    expect(buildStatusUpsert(input)).toEqual({
      row: {
        module: "gtm",
        subsystem: "briefs",
        product: "pam",
        status: "ok",
        headline: "Brief generated",
        metrics: { signups: 12 },
        needs_attention: [],
        last_run_at: expect.any(String),
        updated_at: expect.any(String),
      },
      onConflict: "module,subsystem,product_key",
    });
  });
});
