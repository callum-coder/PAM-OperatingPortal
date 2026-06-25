import * as z from "zod/v4";

// Pure module: the Content Writer's draft schema and the transforms that turn a
// content item into a drafting brief and a structured draft into stored markdown.
// No server-only / Supabase / Anthropic imports, so it is unit-testable.

export const draftSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
});

export const contentDraftSchema = z.object({
  headline: z.string(),
  standfirst: z.string(),
  sections: z.array(draftSectionSchema),
  cta: z.string(),
  meta_description: z.string(),
});

export type ContentDraft = z.infer<typeof contentDraftSchema>;

export type ContentItemBrief = {
  title: string;
  targetKeyword: string | null;
  notes: string | null;
};

export function buildDrafterInput(brief: ContentItemBrief): string {
  return [
    "Write a complete first draft for this approved content idea.",
    "",
    `Working title: ${brief.title}`,
    brief.targetKeyword
      ? `Target keyword: ${brief.targetKeyword}`
      : "Target keyword: (none — write naturally)",
    "",
    "The strategist's brief (job, awareness stage, value lever, weakest lever, positioning, CTA, proof):",
    brief.notes ?? "(no brief captured — infer from the title and the doctrine)",
    "",
    "Follow the doctrine exactly. Produce a sharp headline, a one- to two-sentence",
    "standfirst that sets the stakes, body sections with headings, a single CTA",
    "tied to the 14-day trial, and a meta description. Return only the structured draft.",
  ].join("\n");
}

export function assembleDraftMarkdown(draft: ContentDraft): string {
  const sections = draft.sections
    .map((section) => `## ${section.heading}\n\n${section.body}`)
    .join("\n\n");

  return [
    `# ${draft.headline}`,
    "",
    `_${draft.standfirst}_`,
    "",
    sections,
    "",
    "---",
    "",
    `**${draft.cta}**`,
    "",
    `<!-- meta description: ${draft.meta_description} -->`,
  ].join("\n");
}
