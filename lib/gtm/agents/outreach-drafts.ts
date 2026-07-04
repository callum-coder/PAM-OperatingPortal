import * as z from "zod/v4";

import { LEAD_CHANNELS } from "./lead-plays";

// Pure module: the Outreach Operator's draft schema and transforms. No
// server-only / Supabase / Anthropic imports, so it is unit-testable.

export const outreachDraftSchema = z.object({
  channel: z.enum(LEAD_CHANNELS),
  variant: z.enum(["A", "B"]),
  subject: z.string().nullable(),
  body: z.string(),
  personalisation: z.array(z.string()),
});

export const outreachDraftsOutputSchema = z.object({
  drafts: z.array(outreachDraftSchema),
});

export type OutreachDraft = z.infer<typeof outreachDraftSchema>;

export type PlayForDrafting = {
  id: string;
  title: string;
  channel: string;
  audience: string | null;
  hook: string | null;
  lead_magnet: string | null;
  first_action: string | null;
};

export function buildOutreachDraftInput(play: PlayForDrafting): string {
  return [
    "Draft the outreach copy that executes this lead-gen play.",
    "",
    `Play: ${play.title}`,
    `Channel: ${play.channel}`,
    `Audience: ${play.audience ?? "(not specified — keep it broad UK landlord)"}`,
    `Hook: ${play.hook ?? "(use the MTD deadline per the doctrine)"}`,
    `The give (lead magnet): ${play.lead_magnet ?? "(propose the most fitting give from the doctrine)"}`,
    `First action this week: ${play.first_action ?? "(not specified)"}`,
    "",
    "Produce two genuinely different variants (A and B) shaped for this channel.",
    "Use {{personalisation_slots}} for anything you cannot know, and list every",
    "slot. Draft-only: a human reviews, personalises, and sends. Return only the",
    "structured drafts.",
  ].join("\n");
}

export type OutreachDraftRow = {
  product: string;
  play_id: string;
  play_title: string;
  channel: OutreachDraft["channel"];
  variant: string;
  subject: string | null;
  body: string;
  personalisation: string[];
  status: "draft";
};

export function mapDraftToRow(draft: OutreachDraft, play: PlayForDrafting): OutreachDraftRow {
  return {
    product: "pam",
    play_id: play.id,
    play_title: play.title,
    channel: draft.channel,
    variant: draft.variant,
    subject: draft.subject,
    body: draft.body,
    personalisation: draft.personalisation,
    status: "draft",
  };
}
