import * as z from "zod/v4";

// Pure module: the Lead Finder's output schema and the transforms that build its
// prompt and turn plays into gtm_lead_plays rows. No server-only / Supabase /
// Anthropic imports, so it is unit-testable.

export const LEAD_CHANNELS = ["warm_outreach", "cold_outreach", "content", "paid_ads"] as const;

export const leadPlaySchema = z.object({
  title: z.string(),
  channel: z.enum(LEAD_CHANNELS),
  audience: z.string(),
  hook: z.string(),
  lead_magnet: z.string(),
  first_action: z.string(),
  impact: z.number().int().min(1).max(5),
  ease: z.number().int().min(1).max(5),
});

export const leadPlaysOutputSchema = z.object({
  plays: z.array(leadPlaySchema),
});

export type LeadPlay = z.infer<typeof leadPlaySchema>;

export type LeadSnapshot = {
  product: string;
  today: string;
  mtd: { targetDate: string; daysRemaining: number };
  existingTitles: string[];
  playsByChannel: Record<string, number>;
};

// impact × ease (each 1..5 → 1..25) normalized onto the shared 0..100 scale.
export const MAX_LEAD_PRIORITY = 25;

export function leadPriorityScore(impact: number, ease: number): number {
  return Math.max(0, Math.min(100, Math.round(((impact * ease) / MAX_LEAD_PRIORITY) * 100)));
}

export function buildLeadFinderInput(snapshot: LeadSnapshot): string {
  const channelLines =
    Object.entries(snapshot.playsByChannel)
      .map(([channel, count]) => `  - ${channel}: ${count}`)
      .join("\n") || "  - (no plays yet)";

  const existing = snapshot.existingTitles.length
    ? snapshot.existingTitles.map((title) => `  - ${title}`).join("\n")
    : "  - (none yet)";

  return [
    `Today is ${snapshot.today}. Propose 4 to 8 lead-gen plays for ${snapshot.product.toUpperCase()}.`,
    `${snapshot.mtd.daysRemaining} days remain until the ${snapshot.mtd.targetDate} MTD wedge date — use it as the hook.`,
    "",
    "Cover the Core Four; bias toward warm, high-ease plays. Existing plays by channel:",
    channelLines,
    "",
    "Plays already proposed — do NOT duplicate these:",
    existing,
    "",
    "Follow the doctrine exactly. Each play must use one Core Four channel, carry a",
    "real give (lead magnet), lead on a landlord fear/friction, and state a single",
    "concrete first action doable this week. Return only the structured plays.",
  ].join("\n");
}

export type LeadPlayRow = {
  product: string;
  title: string;
  channel: LeadPlay["channel"];
  audience: string;
  hook: string;
  lead_magnet: string;
  first_action: string;
  impact: number;
  ease: number;
  priority_score: number;
  status: "proposed";
};

export function mapPlayToRow(play: LeadPlay, product: string): LeadPlayRow {
  return {
    product,
    title: play.title,
    channel: play.channel,
    audience: play.audience,
    hook: play.hook,
    lead_magnet: play.lead_magnet,
    first_action: play.first_action,
    impact: play.impact,
    ease: play.ease,
    priority_score: leadPriorityScore(play.impact, play.ease),
    status: "proposed",
  };
}
