import * as z from "zod/v4";

import type { BriefMetrics, MtdCountdown } from "../briefs";

// Pure module: the Brief Analyst's output schema and the transforms that build
// its prompt and turn its actions into gtm_brief_actions rows. No server-only /
// Supabase / Anthropic imports, so it is unit-testable.

export const BRIEF_ACTION_TYPES = [
  "observation",
  "recommended",
  "warning",
  "follow_up",
] as const;

export const briefActionSchema = z.object({
  action_type: z.enum(BRIEF_ACTION_TYPES),
  title: z.string(),
  detail: z.string(),
});

export const weeklyBriefSchema = z.object({
  narrative: z.string(),
  actions: z.array(briefActionSchema),
});

export type WeeklyBriefSynthesis = z.infer<typeof weeklyBriefSchema>;
export type BriefAction = z.infer<typeof briefActionSchema>;

export type CrmMetrics = {
  contacts: number | null;
  leads: number | null;
  deals: number | null;
  subscriptions: number | null;
};

export type BriefSynthesisContext = {
  product: string;
  periodStart: string;
  periodEnd: string;
  mtd: MtdCountdown;
  metrics: BriefMetrics;
  crm?: CrmMetrics | null;
};

function metricLine(value: number | null, label: string): string {
  return value === null ? `  - ${label}: not available` : `  - ${label}: ${value}`;
}

function hasAnyCrmMetric(crm: CrmMetrics | null | undefined): crm is CrmMetrics {
  return Boolean(
    crm && (crm.contacts !== null || crm.leads !== null || crm.deals !== null || crm.subscriptions !== null),
  );
}

export function buildBriefSynthesisInput(context: BriefSynthesisContext): string {
  const m = context.metrics;
  const lines = [
    `Write this week's GTM brief for ${context.product.toUpperCase()}.`,
    `Period: ${context.periodStart} to ${context.periodEnd}.`,
    `${context.mtd.daysRemaining} days remain until the ${context.mtd.targetDate} MTD wedge date.`,
    "",
    "Aggregate PAM metrics (read-only, coarse counts — not deltas):",
    metricLine(m.authUsers, "auth users"),
    metricLine(m.propertyRecords, "property records"),
    metricLine(m.payingSignals, "paying signals"),
    `  - tables available: ${m.tablesAvailable}`,
  ];

  if (hasAnyCrmMetric(context.crm)) {
    lines.push(
      "",
      "HubSpot CRM funnel (live):",
      metricLine(context.crm.contacts, "contacts"),
      metricLine(context.crm.leads, "leads"),
      metricLine(context.crm.deals, "deals"),
      metricLine(context.crm.subscriptions, "paying subscriptions"),
    );
  }

  lines.push(
    "",
    "Follow the doctrine. Produce a concise narrative brief and 2–5 structured",
    "actions. Ground everything in these metrics and the MTD context — do not",
    "invent numbers. Return only the structured brief.",
  );

  return lines.join("\n");
}

export type BriefActionRow = {
  brief_id: string;
  product: string;
  action_type: BriefAction["action_type"];
  title: string;
  detail: string;
  status: "open";
};

export function mapBriefActionRow(
  action: BriefAction,
  briefId: string,
  product: string,
): BriefActionRow {
  return {
    brief_id: briefId,
    product,
    action_type: action.action_type,
    title: action.title,
    detail: action.detail,
    status: "open",
  };
}
