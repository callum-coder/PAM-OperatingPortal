import { describe, expect, it } from "vitest";

import {
  TRIAL_JOURNEY,
  computeMetricDeltas,
  conversionRate,
  evaluateTargets,
  flattenBriefMetrics,
  formatDelta,
} from "./journey";

describe("TRIAL_JOURNEY", () => {
  it("maps the 14-day journey from start to conversion", () => {
    expect(TRIAL_JOURNEY[0].phase).toBe("Start");
    expect(TRIAL_JOURNEY[TRIAL_JOURNEY.length - 1].phase).toBe("Convert");
    expect(TRIAL_JOURNEY).toHaveLength(5);
  });
});

describe("conversionRate", () => {
  it("computes a percentage to one decimal", () => {
    expect(conversionRate(12, 3)).toBe(25);
    expect(conversionRate(3, 1)).toBe(33.3);
  });

  it("returns null when unmeasurable", () => {
    expect(conversionRate(null, 3)).toBeNull();
    expect(conversionRate(0, 0)).toBeNull();
    expect(conversionRate(10, null)).toBeNull();
  });
});

describe("flattenBriefMetrics", () => {
  it("flattens top-level, crm, and funnel metrics", () => {
    const flat = flattenBriefMetrics({
      authUsers: 340,
      crm: { contacts: 12, subscriptions: null },
      funnel: { payingTotal: 31, trialsStarted7d: 5 },
    });
    expect(flat.authUsers).toBe(340);
    expect(flat.crmContacts).toBe(12);
    expect(flat.crmSubscriptions).toBeNull();
    expect(flat.payingTotal).toBe(31);
    expect(flat.trialsStarted7d).toBe(5);
    expect(flat.propertyRecords).toBeNull();
  });

  it("handles a missing raw object", () => {
    expect(flattenBriefMetrics(null).authUsers).toBeNull();
  });
});

describe("computeMetricDeltas", () => {
  it("computes deltas where both sides exist and nulls elsewhere", () => {
    const prevRaw = { funnel: { payingTotal: 28, trialsStarted7d: 4 }, authUsers: 320 };
    const currentFlat = flattenBriefMetrics({
      funnel: { payingTotal: 31, trialsStarted7d: 5 },
      authUsers: 340,
    });

    const deltas = computeMetricDeltas(prevRaw, currentFlat);
    const paying = deltas.find((d) => d.key === "payingTotal");
    const contacts = deltas.find((d) => d.key === "crmContacts");

    expect(paying).toMatchObject({ previous: 28, current: 31, delta: 3 });
    expect(contacts?.delta).toBeNull();
  });
});

describe("evaluateTargets", () => {
  it("computes progress against a target", () => {
    const rows = evaluateTargets(
      [{ metric: "payingTotal", label: "Paying customers", target: 50, due_date: "2026-08-07" }],
      { payingTotal: 31 },
    );
    expect(rows[0]).toMatchObject({ current: 31, progressPct: 62 });
  });

  it("returns null progress when the metric is unmeasured", () => {
    const rows = evaluateTargets(
      [{ metric: "trialsActive", label: "Trials active", target: 20, due_date: null }],
      { trialsActive: null },
    );
    expect(rows[0].progressPct).toBeNull();
  });
});

describe("formatDelta", () => {
  it("signs positive deltas and dashes nulls", () => {
    expect(formatDelta(3)).toBe("+3");
    expect(formatDelta(-2)).toBe("-2");
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(null)).toBe("—");
  });
});
