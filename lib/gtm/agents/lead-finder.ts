import "server-only";

import { verifyCronRequest } from "@/lib/cron-auth";
import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import { upsertStatus } from "@/lib/status";
import { getMtdCountdown } from "@/lib/gtm/briefs";

import { composeDoctrine } from "./doctrine";
import { getAgent } from "./registry";
import { logAgentRun } from "./runs";
import { AgentConfigError, invokeStructuredAgent } from "./runner";
import {
  buildLeadFinderInput,
  leadPlaysOutputSchema,
  mapPlayToRow,
  type LeadPlay,
  type LeadSnapshot,
} from "./lead-plays";

const AGENT_ID = "lead-finder" as const;
const SUBSYSTEM = "leads";
const RUNTIME_INSTRUCTION =
  "You are running to refresh the lead engine. Reason carefully using the doctrine above, then return only the structured plays via the required output format. Do not include any commentary outside the structured output.";

export type LeadFinderExecution = {
  ok: boolean;
  status: "ok" | "skipped" | "error";
  plays: number;
  created: number;
  message: string;
};

export async function runLeadFinderCron(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPortalSupabaseConfig()) {
    return Response.json(
      { ok: false, agent: AGENT_ID, error: "Portal Supabase is not configured" },
      { status: 503 },
    );
  }

  const result = await executeLeadFinder();
  return Response.json(
    {
      ok: result.ok,
      agent: AGENT_ID,
      status: result.status,
      plays: result.plays,
      created: result.created,
      ...(result.ok ? {} : { error: result.message }),
    },
    { status: result.status === "error" ? 500 : 200 },
  );
}

export async function executeLeadFinder(): Promise<LeadFinderExecution> {
  const agent = getAgent(AGENT_ID);
  if (!agent) {
    return { ok: false, status: "error", plays: 0, created: 0, message: `Unknown agent: ${AGENT_ID}` };
  }

  const startedAt = new Date().toISOString();

  try {
    const snapshot = await senseLeadContext();
    const systemPrompt = `${composeDoctrine(agent.doctrine)}\n\n---\n\n${RUNTIME_INSTRUCTION}`;

    const result = await invokeStructuredAgent({
      schema: leadPlaysOutputSchema,
      systemPrompt,
      userInput: buildLeadFinderInput(snapshot),
      model: agent.model ?? undefined,
    });

    const plays = result.data.plays;
    const created = await insertLeadPlays(plays, snapshot.product);
    const headline = `Lead Finder proposed ${plays.length} plays (${created} new)`;

    await upsertStatus({
      module: "gtm",
      subsystem: SUBSYSTEM,
      product: "pam",
      status: "ok",
      headline,
      metrics: { agent: agent.id, model: result.model, plays: plays.length, created, usage: result.usage },
      needs_attention: [],
    });

    await logAgentRun({
      agent_id: agent.id,
      status: "ok",
      model: result.model,
      summary: headline,
      output: { plays },
      items_created: created,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      error: null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: true, status: "ok", plays: plays.length, created, message: headline };
  } catch (error) {
    const configIssue = error instanceof AgentConfigError;
    const message = error instanceof Error ? error.message : "Unknown lead finder error";

    await upsertStatus({
      module: "gtm",
      subsystem: SUBSYSTEM,
      product: "pam",
      status: configIssue ? "idle" : "error",
      headline: configIssue ? `Lead Finder idle — ${message}` : `Lead Finder failed: ${message}`,
      metrics: { agent: AGENT_ID, configKind: configIssue ? "missing_api_key" : "runtime_error" },
      needs_attention: configIssue ? [] : [{ severity: "high", message }],
    });

    await logAgentRun({
      agent_id: AGENT_ID,
      status: configIssue ? "skipped" : "error",
      model: agent.model,
      summary: configIssue ? "Skipped: Anthropic not configured" : "Run failed",
      output: null,
      items_created: 0,
      input_tokens: null,
      output_tokens: null,
      error: message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: configIssue, status: configIssue ? "skipped" : "error", plays: 0, created: 0, message };
  }
}

async function senseLeadContext(): Promise<LeadSnapshot> {
  const supabase = createPortalAdminClient();
  const mtd = getMtdCountdown();

  const { data, error } = await supabase
    .from("gtm_lead_plays")
    .select("title,channel")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    throw new Error(`Failed to read lead plays: ${error.message}`);
  }

  const rows = (data ?? []) as { title: string; channel: string }[];
  const playsByChannel = rows.reduce<Record<string, number>>((acc, row) => {
    const channel = String(row.channel);
    acc[channel] = (acc[channel] ?? 0) + 1;
    return acc;
  }, {});

  return {
    product: "pam",
    today: new Date().toISOString().slice(0, 10),
    mtd,
    existingTitles: rows.slice(0, 25).map((row) => String(row.title)),
    playsByChannel,
  };
}

async function insertLeadPlays(plays: LeadPlay[], product: string): Promise<number> {
  if (!plays.length) {
    return 0;
  }

  const supabase = createPortalAdminClient();
  const titles = plays.map((play) => play.title);

  const { data: existing, error: existingError } = await supabase
    .from("gtm_lead_plays")
    .select("title")
    .in("title", titles);

  if (existingError) {
    throw new Error(`Failed to check existing lead plays: ${existingError.message}`);
  }

  const existingTitles = new Set((existing ?? []).map((row) => String(row.title)));
  const rows = plays
    .filter((play) => !existingTitles.has(play.title))
    .map((play) => mapPlayToRow(play, product));

  if (!rows.length) {
    return 0;
  }

  const { error } = await supabase.from("gtm_lead_plays").insert(rows);
  if (error) {
    throw new Error(`Failed to insert lead plays: ${error.message}`);
  }

  return rows.length;
}
