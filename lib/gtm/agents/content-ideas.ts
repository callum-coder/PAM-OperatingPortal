import * as z from "zod/v4";

// Pure module: the Content Strategist's output schema and the transforms that
// turn its ideas into rows and prompts. No server-only / Supabase / Anthropic
// imports, so it is unit-testable in isolation.

export const AWARENESS_STAGES = [
  "unaware",
  "problem",
  "solution",
  "product",
  "most",
] as const;

export const VALUE_LEVERS = ["outcome", "likelihood", "time", "effort"] as const;

export const OFFER_MECHANICS = ["lead_magnet", "start_free", "convert_paid"] as const;

// Mirrors §10 of doctrine/content-offers.md. Fields exist so a human can audit
// the agent's reasoning, not just the headline.
export const contentIdeaSchema = z.object({
  title: z.string(),
  format: z.string(),
  job: z.string(),
  awareness_stage: z.enum(AWARENESS_STAGES),
  dream_outcome: z.string(),
  lever: z.enum(VALUE_LEVERS),
  weakest_lever: z.string(),
  positioning_frame: z.string(),
  offer_mechanic: z.enum(OFFER_MECHANICS),
  cta: z.string(),
  proof_needed: z.string(),
  relevance_score: z.number().int().min(1).max(5),
  value_score: z.number().int().min(1).max(5),
});

export const contentIdeasOutputSchema = z.object({
  ideas: z.array(contentIdeaSchema),
});

export type ContentIdea = z.infer<typeof contentIdeaSchema>;

export type ContentSnapshot = {
  product: string;
  today: string;
  mtd: { targetDate: string; daysRemaining: number };
  contentByStage: Record<string, number>;
  recentTitles: string[];
  openSignals: { title: string; detail: string | null }[];
};

export function buildContentAgentInput(snapshot: ContentSnapshot): string {
  const stageLines =
    Object.entries(snapshot.contentByStage)
      .map(([stage, count]) => `  - ${stage}: ${count}`)
      .join("\n") || "  - (pipeline empty)";

  const recent = snapshot.recentTitles.length
    ? snapshot.recentTitles.map((title) => `  - ${title}`).join("\n")
    : "  - (none yet)";

  const signals = snapshot.openSignals.length
    ? snapshot.openSignals
        .map((signal) => `  - ${signal.title}${signal.detail ? `: ${signal.detail}` : ""}`)
        .join("\n")
    : "  - (none)";

  return [
    `Today is ${snapshot.today}. Generate 5 to 8 content ideas for ${snapshot.product.toUpperCase()}.`,
    `${snapshot.mtd.daysRemaining} days remain until the ${snapshot.mtd.targetDate} MTD wedge date — weight urgency accordingly.`,
    "",
    "Current content pipeline by stage:",
    stageLines,
    "",
    "Recent titles already in the pipeline — do NOT duplicate these:",
    recent,
    "",
    "Open GTM content signals ideas could address:",
    signals,
    "",
    "Follow the doctrine exactly. Each idea must target one tier persona and one",
    "awareness stage, pull a real value lever, and carry a single clear CTA",
    "grounded in the 14-day trial funnel. Return only the structured ideas.",
  ].join("\n");
}

export function formatIdeaNotes(idea: ContentIdea): string {
  return [
    `Job: ${idea.job}`,
    `Awareness stage: ${idea.awareness_stage}`,
    `Dream outcome: ${idea.dream_outcome}`,
    `Strongest lever: ${idea.lever}`,
    `Weakest lever (editor's note): ${idea.weakest_lever}`,
    `Positioning frame: ${idea.positioning_frame}`,
    `Offer mechanic: ${idea.offer_mechanic}`,
    `CTA: ${idea.cta}`,
    `Proof needed: ${idea.proof_needed}`,
    `Relevance ${idea.relevance_score}/5 · Value ${idea.value_score}/5`,
  ].join("\n");
}

export type ContentItemRow = {
  product: string;
  title: string;
  target_keyword: string | null;
  stage: "idea";
  notes: string;
  conversion_path: string;
  priority_score: number;
};

// relevance_score × value_score gives a 1–25 composite for ranking the pipeline;
// the full framework reasoning is preserved in `notes`.
export function mapIdeaToContentRow(idea: ContentIdea, product: string): ContentItemRow {
  return {
    product,
    title: idea.title,
    target_keyword: null,
    stage: "idea",
    notes: formatIdeaNotes(idea),
    conversion_path: idea.offer_mechanic,
    priority_score: idea.relevance_score * idea.value_score,
  };
}
