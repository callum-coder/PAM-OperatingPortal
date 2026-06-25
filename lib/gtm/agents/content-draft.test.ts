import { describe, expect, it } from "vitest";

import {
  assembleDraftMarkdown,
  buildDrafterInput,
  contentDraftSchema,
  type ContentDraft,
  type ContentItemBrief,
} from "./content-draft";

const draft: ContentDraft = {
  headline: "44 Days to MTD: A Last-Minute Filing Plan",
  standfirst: "The deadline is close. Here is the calm version of what to do.",
  sections: [
    { heading: "Where you stand", body: "You have weeks, not months." },
    { heading: "The plan", body: "Three steps, no accountant required." },
  ],
  cta: "Start your 14-day trial — no credit card.",
  meta_description: "A simple last-minute MTD filing plan for UK landlords.",
};

describe("buildDrafterInput", () => {
  it("passes the strategist brief through as the spec", () => {
    const brief: ContentItemBrief = {
      title: "44 Days to MTD",
      targetKeyword: "mtd deadline landlord",
      notes: "Job: file on time\nWeakest lever: proof it's easy",
    };
    const input = buildDrafterInput(brief);
    expect(input).toContain("44 Days to MTD");
    expect(input).toContain("mtd deadline landlord");
    expect(input).toContain("Weakest lever: proof it's easy");
  });

  it("handles a missing keyword and missing brief", () => {
    const input = buildDrafterInput({ title: "X", targetKeyword: null, notes: null });
    expect(input).toContain("write naturally");
    expect(input).toContain("no brief captured");
  });
});

describe("assembleDraftMarkdown", () => {
  it("renders headline, standfirst, sections, CTA, and meta", () => {
    const md = assembleDraftMarkdown(draft);
    expect(md).toContain("# 44 Days to MTD: A Last-Minute Filing Plan");
    expect(md).toContain("## Where you stand");
    expect(md).toContain("## The plan");
    expect(md).toContain("**Start your 14-day trial — no credit card.**");
    expect(md).toContain("<!-- meta description:");
  });
});

describe("contentDraftSchema", () => {
  it("accepts a well-formed draft", () => {
    expect(contentDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects a draft missing sections", () => {
    const { sections: _omit, ...bad } = draft;
    void _omit;
    expect(contentDraftSchema.safeParse(bad).success).toBe(false);
  });
});
