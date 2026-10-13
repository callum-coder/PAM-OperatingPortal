import { describe, expect, it } from "vitest";

import { mapTrialFunnelRow, mapWeeklyMetricsViewRow } from "./pam-readonly-metrics";

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

describe("mapTrialFunnelRow", () => {
  it("maps the funnel row including the WhatsApp demo stage, nulling columns an older view lacks", () => {
    expect(
      mapTrialFunnelRow({
        trials_active: 3, trials_started_7d: "2", trials_converted_7d: 1, trials_expired_7d: 0, paying_total: 5, avg_days_to_convert: "8.5",
        demo_started_7d: 11, demo_active: 7, demo_engaged_7d: 4, demo_converted_7d: 2, demo_converted_total: 6, signups_from_demo_7d: 2,
      }),
    ).toEqual({
      trialsActive: 3, trialsStarted7d: 2, trialsConverted7d: 1, trialsExpired7d: 0, payingTotal: 5, avgDaysToConvert: 8.5,
      demoStarted7d: 11, demoActive: 7, demoEngaged7d: 4, demoConverted7d: 2, demoConvertedTotal: 6, signupsFromDemo7d: 2,
    });
    const old = mapTrialFunnelRow({ trials_active: 1, trials_started_7d: 1, trials_converted_7d: 0, trials_expired_7d: 0, paying_total: 2, avg_days_to_convert: null });
    expect(old.demoStarted7d).toBeNull();
    expect(old.trialsActive).toBe(1);
  });
});
