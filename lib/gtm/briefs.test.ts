import { describe, expect, it } from "vitest";

import { buildBriefNarrative, getMtdCountdown } from "./briefs";
import { classifyPamReadonlyConfig } from "./pam-readonly-config";

describe("getMtdCountdown", () => {
  it("counts calendar days to the MTD wedge date", () => {
    expect(getMtdCountdown(new Date("2026-06-23T12:00:00Z"))).toEqual({
      targetDate: "2026-08-07",
      daysRemaining: 45,
    });
  });

  it("does not return negative days after the wedge date", () => {
    expect(getMtdCountdown(new Date("2026-08-08T00:00:00Z")).daysRemaining).toBe(0);
  });
});

describe("buildBriefNarrative", () => {
  it("creates a factual fallback narrative from metrics", () => {
    const narrative = buildBriefNarrative({
      product: "pam",
      periodStart: "2026-06-16",
      periodEnd: "2026-06-23",
      mtdCountdown: { targetDate: "2026-08-07", daysRemaining: 45 },
      metrics: {
        source: "pam_readonly",
        tablesAvailable: 14,
        authUsers: 8,
        propertyRecords: 120,
        payingSignals: 3,
      },
    });

    expect(narrative).toContain("45 days remain");
    expect(narrative).toContain("8 auth users");
    expect(narrative).toContain("120 property records");
    expect(narrative).toContain("aggregate PAM view reports");
    expect(narrative).not.toContain("accessible public tables");
  });
});

describe("classifyPamReadonlyConfig", () => {
  it("accepts postgres URLs", () => {
    expect(classifyPamReadonlyConfig("postgresql://readonly@example/db")).toBe("postgres");
  });

  it("flags HTTPS values as needing a database URL", () => {
    expect(classifyPamReadonlyConfig("https://example.supabase.co")).toBe("https_project_url");
  });
});
