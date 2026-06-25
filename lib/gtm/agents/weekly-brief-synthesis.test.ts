import { describe, expect, it } from "vitest";

import type { BriefMetrics } from "../briefs";
import {
  buildBriefSynthesisInput,
  mapBriefActionRow,
  weeklyBriefSchema,
  type BriefAction,
  type BriefSynthesisContext,
} from "./weekly-brief-synthesis";

const metrics: BriefMetrics = {
  source: "pam_readonly",
  tablesAvailable: 12,
  authUsers: 340,
  propertyRecords: 1200,
  payingSignals: null,
};

const context: BriefSynthesisContext = {
  product: "pam",
  periodStart: "2026-06-17",
  periodEnd: "2026-06-24",
  mtd: { targetDate: "2026-08-07", daysRemaining: 44 },
  metrics,
};

describe("buildBriefSynthesisInput", () => {
  it("includes the period, MTD countdown, and metrics", () => {
    const input = buildBriefSynthesisInput(context);
    expect(input).toContain("2026-06-17 to 2026-06-24");
    expect(input).toContain("44 days remain");
    expect(input).toContain("auth users: 340");
  });

  it("marks unavailable metrics honestly", () => {
    const input = buildBriefSynthesisInput(context);
    expect(input).toContain("paying signals: not available");
  });

  it("omits the CRM block when no CRM metrics are present", () => {
    const input = buildBriefSynthesisInput({ ...context, crm: null });
    expect(input).not.toContain("HubSpot CRM funnel");
  });

  it("includes the CRM funnel when HubSpot metrics are present", () => {
    const input = buildBriefSynthesisInput({
      ...context,
      crm: { contacts: 512, leads: 88, deals: 24, subscriptions: 31 },
    });
    expect(input).toContain("HubSpot CRM funnel");
    expect(input).toContain("contacts: 512");
    expect(input).toContain("paying subscriptions: 31");
  });
});

describe("mapBriefActionRow", () => {
  it("maps an action to a gtm_brief_actions row tied to the brief", () => {
    const action: BriefAction = {
      action_type: "warning",
      title: "Wire up the paying-signals metric",
      detail: "Conversion is invisible until this is measured.",
    };
    expect(mapBriefActionRow(action, "brief-123", "pam")).toEqual({
      brief_id: "brief-123",
      product: "pam",
      action_type: "warning",
      title: "Wire up the paying-signals metric",
      detail: "Conversion is invisible until this is measured.",
      status: "open",
    });
  });
});

describe("weeklyBriefSchema", () => {
  it("accepts a well-formed brief", () => {
    const parsed = weeklyBriefSchema.safeParse({
      narrative: "44 days to MTD. Property records are growing; paying signals are not yet measured.",
      actions: [
        { action_type: "recommended", title: "Ship the MTD checklist lead magnet", detail: "Capture deadline-driven demand." },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid action type", () => {
    const parsed = weeklyBriefSchema.safeParse({
      narrative: "x",
      actions: [{ action_type: "urgent", title: "t", detail: "d" }],
    });
    expect(parsed.success).toBe(false);
  });
});
