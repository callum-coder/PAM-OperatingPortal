import { describe, expect, it } from "vitest";

import { agents, getAgent } from "./registry";
import {
  buildContentAgentInput,
  contentIdeasOutputSchema,
  formatIdeaNotes,
  mapIdeaToContentRow,
  type ContentIdea,
  type ContentSnapshot,
} from "./content-ideas";

const idea: ContentIdea = {
  title: "The 2026 MTD deadline checklist for first-time landlords",
  format: "blog",
  job: "Stay compliant without hiring an accountant",
  awareness_stage: "problem",
  dream_outcome: "Never get hit with an HMRC penalty",
  lever: "likelihood",
  weakest_lever: "Proof that it's actually easy is missing",
  positioning_frame: "vs hiring an accountant for tax",
  offer_mechanic: "lead_magnet",
  cta: "Download the MTD checklist",
  proof_needed: "The real HMRC phase-in dates",
  relevance_score: 5,
  value_score: 4,
};

describe("mapIdeaToContentRow", () => {
  it("maps an idea to a content_items row with a composite priority score", () => {
    const row = mapIdeaToContentRow(idea, "pam");
    expect(row.product).toBe("pam");
    expect(row.stage).toBe("idea");
    expect(row.target_keyword).toBeNull();
    expect(row.conversion_path).toBe("lead_magnet");
    expect(row.priority_score).toBe(20);
    expect(row.notes).toContain("Weakest lever");
    expect(row.notes).toContain("Relevance 5/5");
  });
});

describe("formatIdeaNotes", () => {
  it("captures the auditable reasoning, not just the headline", () => {
    const notes = formatIdeaNotes(idea);
    expect(notes).toContain("Strongest lever: likelihood");
    expect(notes).toContain("Offer mechanic: lead_magnet");
  });
});

describe("buildContentAgentInput", () => {
  const snapshot: ContentSnapshot = {
    product: "pam",
    today: "2026-06-24",
    mtd: { targetDate: "2026-08-07", daysRemaining: 44 },
    contentByStage: { idea: 3, review: 1 },
    recentTitles: ["Existing title A"],
    openSignals: [{ title: "Content stalled", detail: "2 items stuck in review" }],
  };

  it("includes MTD urgency, pipeline state, and dedupe titles", () => {
    const input = buildContentAgentInput(snapshot);
    expect(input).toContain("44 days remain");
    expect(input).toContain("2026-08-07");
    expect(input).toContain("Existing title A");
    expect(input).toContain("idea: 3");
  });

  it("handles an empty pipeline gracefully", () => {
    const input = buildContentAgentInput({
      ...snapshot,
      contentByStage: {},
      recentTitles: [],
      openSignals: [],
    });
    expect(input).toContain("(pipeline empty)");
    expect(input).toContain("(none yet)");
  });
});

describe("agent registry", () => {
  it("registers the Content Strategist as active, reporting to the GTM Lead", () => {
    const agent = getAgent("content-strategist");
    expect(agent?.status).toBe("active");
    expect(agent?.reportsTo).toBe("gtm-lead");
    expect(agent?.doctrine).toContain("content-offers.md");
    expect(agent?.schedule).toBe("0 6 * * *");
  });

  it("keeps the reporting hierarchy referentially intact", () => {
    const ids = new Set(agents.map((agent) => agent.id));
    for (const agent of agents) {
      if (agent.reportsTo) {
        expect(ids.has(agent.reportsTo)).toBe(true);
      }
    }
    expect(agents.filter((agent) => agent.reportsTo === null)).toHaveLength(1);
  });
});

describe("contentIdeasOutputSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(contentIdeasOutputSchema.safeParse({ ideas: [idea] }).success).toBe(true);
  });

  it("rejects an invalid awareness stage", () => {
    const bad = { ...idea, awareness_stage: "curious" };
    expect(contentIdeasOutputSchema.safeParse({ ideas: [bad] }).success).toBe(false);
  });
});
