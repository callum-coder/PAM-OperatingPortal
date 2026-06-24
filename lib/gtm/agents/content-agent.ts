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
  buildContentAgentInput,
  contentIdeasOutputSchema,
  mapIdeaToContentRow,
  type ContentIdea,
  type ContentSnapshot,
} from "./content-ideas";

const AGENT_ID = "content-strategist" as const;
const SUBSYSTEM = "content_agent";
const RUNTIME_INSTRUCTION =
  "You are running as a scheduled daily agent. Reason carefully using the doctrine above, then return only the structured ideas via the required output format. Do not include any commentary outside the structured output.";

export async function runContentAgentCron(request: Request) {
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

  const agent = getAgent(AGENT_ID);
  if (!agent) {
    return Response.json({ ok: false, error: `Unknown agent: ${AGENT_ID}` }, { status: 500 });
  }

  const startedAt = new Date().toISOString();

  try {
    const snapshot = await senseContentContext();
    const systemPrompt = `${composeDoctrine(agent.doctrine)}\n\n---\n\n${RUNTIME_INSTRUCTION}`;

    const result = await invokeStructuredAgent({
      schema: contentIdeasOutputSchema,
      systemPrompt,
      userInput: buildContentAgentInput(snapshot),
      model: agent.model ?? undefined,
    });

    const ideas = result.data.ideas;
    const itemsCreated = await insertContentIdeas(ideas, snapshot.product);
    const headline = `Content Strategist generated ${ideas.length} ideas (${itemsCreated} new in pipeline)`;

    await upsertStatus({
      module: "gtm",
      subsystem: SUBSYSTEM,
      product: "pam",
      status: "ok",
      headline,
      metrics: {
        agent: agent.id,
        model: result.model,
        ideas: ideas.length,
        itemsCreated,
        usage: result.usage,
      },
      needs_attention: [],
    });

    await logAgentRun({
      agent_id: agent.id,
      status: "ok",
      model: result.model,
      summary: headline,
      output: { ideas },
      items_created: itemsCreated,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      error: null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, agent: agent.id, status: "ok", ideas: ideas.length, itemsCreated });
  } catch (error) {
    const configIssue = error instanceof AgentConfigError;
    const message = error instanceof Error ? error.message : "Unknown content agent error";

    await upsertStatus({
      module: "gtm",
      subsystem: SUBSYSTEM,
      product: "pam",
      status: configIssue ? "idle" : "error",
      headline: configIssue
        ? `Content Strategist idle — ${message}`
        : `Content Strategist failed: ${message}`,
      metrics: {
        agent: AGENT_ID,
        configKind: configIssue ? "missing_api_key" : "runtime_error",
      },
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

    return Response.json(
      { ok: configIssue, agent: AGENT_ID, status: configIssue ? "skipped" : "error", error: message },
      { status: configIssue ? 200 : 500 },
    );
  }
}

async function senseContentContext(): Promise<ContentSnapshot> {
  const supabase = createPortalAdminClient();
  const mtd = getMtdCountdown();

  const [itemsResult, signalsResult] = await Promise.all([
    supabase
      .from("gtm_content_items")
      .select("title,stage,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("gtm_signals")
      .select("title,detail")
      .eq("product", "pam")
      .like("signal_type", "content_%")
      .in("status", ["open", "in_progress"])
      .limit(10),
  ]);

  if (itemsResult.error) {
    throw new Error(`Failed to read content items: ${itemsResult.error.message}`);
  }
  if (signalsResult.error) {
    throw new Error(`Failed to read content signals: ${signalsResult.error.message}`);
  }

  const rows = (itemsResult.data ?? []) as { title: string; stage: string | null }[];
  const contentByStage = rows.reduce<Record<string, number>>((acc, row) => {
    const stage = String(row.stage ?? "idea");
    acc[stage] = (acc[stage] ?? 0) + 1;
    return acc;
  }, {});

  const signalRows = (signalsResult.data ?? []) as { title: string; detail: string | null }[];

  return {
    product: "pam",
    today: new Date().toISOString().slice(0, 10),
    mtd,
    contentByStage,
    recentTitles: rows.slice(0, 15).map((row) => String(row.title)),
    openSignals: signalRows.map((row) => ({ title: String(row.title), detail: row.detail ?? null })),
  };
}

async function insertContentIdeas(ideas: ContentIdea[], product: string): Promise<number> {
  if (!ideas.length) {
    return 0;
  }

  const supabase = createPortalAdminClient();
  const titles = ideas.map((idea) => idea.title);

  const { data: existing, error: existingError } = await supabase
    .from("gtm_content_items")
    .select("title")
    .in("title", titles);

  if (existingError) {
    throw new Error(`Failed to check existing content titles: ${existingError.message}`);
  }

  const existingTitles = new Set((existing ?? []).map((row) => String(row.title)));
  const rows = ideas
    .filter((idea) => !existingTitles.has(idea.title))
    .map((idea) => mapIdeaToContentRow(idea, product));

  if (!rows.length) {
    return 0;
  }

  const { error } = await supabase.from("gtm_content_items").insert(rows);
  if (error) {
    throw new Error(`Failed to insert content ideas: ${error.message}`);
  }

  return rows.length;
}
