import * as z from "zod/v4";

// Pure module: the Competitor Scout's change schema and the text/diff transforms.
// No server-only / Supabase / Anthropic / fetch imports, so it is unit-testable.

export const competitorChangeSchema = z.object({
  diff_summary: z.string(),
  significance: z.enum(["high", "medium", "low"]),
  recommended_response: z.string(),
});

export type CompetitorChange = z.infer<typeof competitorChangeSchema>;

export const MAX_SNAPSHOT_CHARS = 6000;

// Strip a fetched HTML page down to readable, comparable text. Removes scripts,
// styles, comments, and tags; decodes the common entities; collapses whitespace;
// caps length so snapshots stay small and diffs stay cheap.
export function extractReadableText(html: string, maxChars = MAX_SNAPSHOT_CHARS): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");

  const text = stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, maxChars);
}

export type ScanOutcome = "baseline" | "unchanged" | "changed";

// Decide what to do with a freshly-hashed snapshot relative to the stored one.
export function classifyScan(previousHash: string | null, nextHash: string): ScanOutcome {
  if (!previousHash) return "baseline";
  return previousHash === nextHash ? "unchanged" : "changed";
}

export function buildCompetitorDiffInput(input: {
  competitor: string;
  watchType: string;
  url: string;
  previousText: string;
  currentText: string;
}): string {
  return [
    "Compare two snapshots of a competitor page and report what changed.",
    "",
    `Competitor: ${input.competitor}`,
    `Watch type: ${input.watchType}`,
    `URL: ${input.url}`,
    "",
    "PREVIOUS snapshot:",
    input.previousText || "(empty)",
    "",
    "CURRENT snapshot:",
    input.currentText || "(empty)",
    "",
    "Report only real differences between the two snapshots — do not use outside",
    "knowledge or infer anything not in the text. Classify significance for PAM",
    "and recommend one concrete response. Return only the structured change.",
  ].join("\n");
}

export type CompetitorChangeRow = {
  competitor: string;
  watch_type: string;
  diff_summary: string;
  significance: "high" | "medium" | "low";
};

export function mapChangeRow(
  change: CompetitorChange,
  competitor: string,
  watchType: string,
): CompetitorChangeRow {
  return {
    competitor,
    watch_type: watchType,
    diff_summary: `${change.diff_summary}\n\nSuggested response: ${change.recommended_response}`,
    significance: change.significance,
  };
}
