import { describe, expect, it } from "vitest";

import {
  normalizeCompetitorWatchInput,
  normalizeContentItemInput,
  normalizeExperimentInput,
} from "./entity-inputs";

describe("normalizeCompetitorWatchInput", () => {
  it("requires a competitor and URL", () => {
    expect(normalizeCompetitorWatchInput({ competitor: "", url: "" })).toEqual({
      error: "Enter a competitor and URL.",
    });
  });

  it("normalizes a competitor watch payload", () => {
    expect(
      normalizeCompetitorWatchInput({
        competitor: "  Acme  ",
        url: " https://example.com/pricing ",
        watch_type: "pricing",
      }),
    ).toEqual({
      value: {
        product: "pam",
        competitor: "Acme",
        url: "https://example.com/pricing",
        watch_type: "pricing",
      },
    });
  });
});

describe("normalizeContentItemInput", () => {
  it("requires a title", () => {
    expect(normalizeContentItemInput({ title: "" })).toEqual({
      error: "Enter a content title.",
    });
  });

  it("normalizes scores and optional fields", () => {
    expect(
      normalizeContentItemInput({
        title: " MTD guide ",
        target_keyword: " mtd landlord ",
        stage: "idea",
        keyword_intent: "5",
        product_fit: "4",
        mtd_urgency: "5",
        effort: "2",
      }),
    ).toEqual({
      value: {
        product: "pam",
        title: "MTD guide",
        target_keyword: "mtd landlord",
        stage: "idea",
        keyword_intent: 5,
        product_fit: 4,
        mtd_urgency: 5,
        effort: 2,
        priority_score: 90,
        notes: null,
      },
    });
  });
});

describe("normalizeExperimentInput", () => {
  it("requires a name", () => {
    expect(normalizeExperimentInput({ name: "" })).toEqual({
      error: "Enter an experiment name.",
    });
  });

  it("normalizes numeric fields", () => {
    expect(
      normalizeExperimentInput({
        name: " Landing page CTA ",
        metric: "signup_rate",
        baseline: "2.5",
        target: "4",
        hypothesis: "Clearer CTA increases signup.",
      }),
    ).toEqual({
      value: {
        product: "pam",
        name: "Landing page CTA",
        metric: "signup_rate",
        baseline: 2.5,
        target: 4,
        hypothesis: "Clearer CTA increases signup.",
        status: "design",
      },
    });
  });
});
