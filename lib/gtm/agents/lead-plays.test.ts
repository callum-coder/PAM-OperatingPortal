import { describe, expect, it } from "vitest";

import {
  buildLeadFinderInput,
  leadPriorityScore,
  leadPlaysOutputSchema,
  mapPlayToRow,
  type LeadPlay,
  type LeadSnapshot,
} from "./lead-plays";

const play: LeadPlay = {
  title: "MTD checklist to active landlord forums",
  channel: "warm_outreach",
  audience: "Members of UK landlord Facebook groups the team is already in",
  hook: "The MTD deadline is close and most don't have a plan",
  lead_magnet: "The MTD-readiness checklist",
  first_action: "DM the 30 most active members with the checklist this week",
  impact: 4,
  ease: 5,
};

describe("leadPriorityScore", () => {
  it("normalizes impact × ease onto a 0-100 scale", () => {
    expect(leadPriorityScore(5, 5)).toBe(100);
    expect(leadPriorityScore(4, 5)).toBe(80);
    expect(leadPriorityScore(1, 1)).toBe(4);
  });
});

describe("mapPlayToRow", () => {
  it("maps a play to a gtm_lead_plays row with a normalized priority", () => {
    const row = mapPlayToRow(play, "pam");
    expect(row.product).toBe("pam");
    expect(row.channel).toBe("warm_outreach");
    expect(row.status).toBe("proposed");
    expect(row.priority_score).toBe(80);
    expect(row.lead_magnet).toContain("checklist");
  });
});

describe("buildLeadFinderInput", () => {
  const snapshot: LeadSnapshot = {
    product: "pam",
    today: "2026-06-24",
    mtd: { targetDate: "2026-08-07", daysRemaining: 44 },
    existingTitles: ["Cold email to accountants"],
    playsByChannel: { warm_outreach: 2, content: 1 },
  };

  it("includes the MTD hook, channel mix, and dedupe titles", () => {
    const input = buildLeadFinderInput(snapshot);
    expect(input).toContain("44 days remain");
    expect(input).toContain("warm_outreach: 2");
    expect(input).toContain("Cold email to accountants");
  });

  it("handles an empty engine", () => {
    const input = buildLeadFinderInput({
      ...snapshot,
      existingTitles: [],
      playsByChannel: {},
    });
    expect(input).toContain("(no plays yet)");
    expect(input).toContain("(none yet)");
  });
});

describe("leadPlaysOutputSchema", () => {
  it("accepts a well-formed play set", () => {
    expect(leadPlaysOutputSchema.safeParse({ plays: [play] }).success).toBe(true);
  });

  it("rejects an unknown channel", () => {
    const bad = { ...play, channel: "billboards" };
    expect(leadPlaysOutputSchema.safeParse({ plays: [bad] }).success).toBe(false);
  });
});
