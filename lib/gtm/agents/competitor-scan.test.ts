import { describe, expect, it } from "vitest";

import {
  buildCompetitorDiffInput,
  classifyScan,
  competitorChangeSchema,
  extractReadableText,
  mapChangeRow,
  type CompetitorChange,
} from "./competitor-scan";

describe("extractReadableText", () => {
  it("strips scripts, styles, and tags and collapses whitespace", () => {
    const html =
      "<html><head><style>.a{color:red}</style><script>var x=1</script></head>" +
      "<body><h1>Pricing</h1>\n\n<p>From 12 &amp; up</p></body></html>";
    const text = extractReadableText(html);
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("var x");
    expect(text).toContain("Pricing From 12 & up");
  });

  it("caps the length", () => {
    const text = extractReadableText(`<p>${"a".repeat(10000)}</p>`, 100);
    expect(text.length).toBe(100);
  });
});

describe("classifyScan", () => {
  it("baselines when there is no previous hash", () => {
    expect(classifyScan(null, "abc")).toBe("baseline");
  });
  it("reports unchanged when hashes match", () => {
    expect(classifyScan("abc", "abc")).toBe("unchanged");
  });
  it("reports changed when hashes differ", () => {
    expect(classifyScan("abc", "def")).toBe("changed");
  });
});

describe("buildCompetitorDiffInput", () => {
  it("includes both snapshots and the watch metadata", () => {
    const input = buildCompetitorDiffInput({
      competitor: "Acme Lettings",
      watchType: "pricing",
      url: "https://acme.example/pricing",
      previousText: "From 15/mo",
      currentText: "From 10/mo",
    });
    expect(input).toContain("Acme Lettings");
    expect(input).toContain("From 15/mo");
    expect(input).toContain("From 10/mo");
  });
});

describe("mapChangeRow", () => {
  it("folds the recommended response into the stored diff summary", () => {
    const change: CompetitorChange = {
      diff_summary: "Dropped headline price from 15 to 10.",
      significance: "high",
      recommended_response: "Reinforce agent-grade-management framing.",
    };
    const row = mapChangeRow(change, "Acme Lettings", "pricing");
    expect(row.competitor).toBe("Acme Lettings");
    expect(row.watch_type).toBe("pricing");
    expect(row.significance).toBe("high");
    expect(row.diff_summary).toContain("15 to 10");
    expect(row.diff_summary).toContain("Suggested response:");
  });
});

describe("competitorChangeSchema", () => {
  it("rejects an invalid significance", () => {
    const bad = { diff_summary: "x", significance: "critical", recommended_response: "y" };
    expect(competitorChangeSchema.safeParse(bad).success).toBe(false);
  });
});
