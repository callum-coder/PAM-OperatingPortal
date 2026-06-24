import { describe, expect, it } from "vitest";

import { mapWeeklyMetricsViewRow } from "./pam-readonly-metrics";

describe("mapWeeklyMetricsViewRow", () => {
  it("maps the explicit customer PAM aggregate view contract into brief metrics", () => {
    expect(
      mapWeeklyMetricsViewRow({
        tables_available: "18",
        auth_users: "12",
        property_records: "43",
        paying_signals: "5",
      }),
    ).toEqual({
      source: "pam_readonly",
      tablesAvailable: 18,
      authUsers: 12,
      propertyRecords: 43,
      payingSignals: 5,
    });
  });

  it("preserves nulls for metrics the customer view cannot expose yet", () => {
    expect(
      mapWeeklyMetricsViewRow({
        tables_available: 18,
        auth_users: null,
        property_records: null,
        paying_signals: null,
      }),
    ).toEqual({
      source: "pam_readonly",
      tablesAvailable: 18,
      authUsers: null,
      propertyRecords: null,
      payingSignals: null,
    });
  });
});
