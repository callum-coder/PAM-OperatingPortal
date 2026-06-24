import "server-only";

import { createHash } from "node:crypto";

import { verifyCronRequest } from "@/lib/cron-auth";
import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import { upsertStatus } from "@/lib/status";
import { anthropicConfig } from "@/lib/anthropic";

import { composeDoctrine } from "./doctrine";
import { getAgent } from "./registry";
import { logAgentRun } from "./runs";
import { AgentConfigError, invokeStructuredAgent } from "./runner";
import {
  buildCompetitorDiffInput,
  classifyScan,
  competitorChangeSchema,
  extractReadableText,
  mapChangeRow,
} from "./competitor-scan";

const AGENT_ID = "competitor-scout" as const;
const SUBSYSTEM = "competitors";
const FETCH_TIMEOUT_MS = 15000;
const RUNTIME_INSTRUCTION =
  "You are the competitor scout. Compare only the two snapshots provided, classify significance for PAM, and return only the structured change via the required output format.";

type WatchRow = {
  id: string;
  competitor: string;
  url: string;
  watch_type: string;
  last_snapshot: string | null;
  last_hash: string | null;
};

export type CompetitorScoutExecution = {
  ok: boolean;
  status: "ok" | "skipped" | "error";
  checked: number;
  changes: number;
  message: string;
};

export async function runCompetitorScoutCron(request: Request) {
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

  const result = await executeCompetitorScout();
  return Response.json(
    {
      ok: result.ok,
      agent: AGENT_ID,
      status: result.status,
      checked: result.checked,
      changes: result.changes,
      ...(result.ok ? {} : { error: result.message }),
    },
    { status: result.status === "error" ? 500 : 200 },
  );
}

export async function executeCompetitorScout(): Promise<CompetitorScoutExecution> {
  const agent = getAgent(AGENT_ID);
  if (!agent) {
    return { ok: false, status: "error", checked: 0, changes: 0, message: `Unknown agent: ${AGENT_ID}` };
  }

  const startedAt = new Date().toISOString();
  const model = agent.model ?? anthropicConfig.synthesisModel;

  try {
    if (!anthropicConfig.apiKey) {
      throw new AgentConfigError("ANTHROPIC_API_KEY is not configured");
    }

    const supabase = createPortalAdminClient();
    const { data, error } = await supabase
      .from("gtm_competitor_watch")
      .select("id,competitor,url,watch_type,last_snapshot,last_hash");

    if (error) {
      throw new Error(`Failed to read competitor watches: ${error.message}`);
    }

    const watches = (data ?? []) as WatchRow[];
    if (!watches.length) {
      await upsertStatus({
        module: "gtm",
        subsystem: SUBSYSTEM,
        product: "pam",
        status: "idle",
        headline: "No competitor watches configured yet",
        metrics: { agent: agent.id },
        needs_attention: [],
      });
      await logAgentRun({
        agent_id: agent.id,
        status: "ok",
        model,
        summary: "No competitor watches configured",
        output: { checked: 0, changes: 0 },
        items_created: 0,
        input_tokens: null,
        output_tokens: null,
        error: null,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      });
      return { ok: true, status: "ok", checked: 0, changes: 0, message: "No competitor watches configured" };
    }

    const systemPrompt = `${composeDoctrine(agent.doctrine)}\n\n---\n\n${RUNTIME_INSTRUCTION}`;

    let checked = 0;
    let changes = 0;
    let high = 0;
    let unreachable = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    for (const watch of watches) {
      const text = await fetchReadable(watch.url);
      if (text === null) {
        unreachable += 1;
        continue;
      }
      checked += 1;

      const hash = sha256(text);
      const outcome = classifyScan(watch.last_hash, hash);

      if (outcome === "unchanged") {
        await touchWatch(supabase, watch.id, null);
        continue;
      }

      if (outcome === "baseline") {
        await touchWatch(supabase, watch.id, { snapshot: text, hash });
        continue;
      }

      // changed → analyse the real diff
      const result = await invokeStructuredAgent({
        schema: competitorChangeSchema,
        systemPrompt,
        userInput: buildCompetitorDiffInput({
          competitor: watch.competitor,
          watchType: watch.watch_type,
          url: watch.url,
          previousText: watch.last_snapshot ?? "",
          currentText: text,
        }),
        model: agent.model ?? undefined,
      });

      inputTokens += result.usage.inputTokens;
      outputTokens += result.usage.outputTokens;

      const { error: insertError } = await supabase
        .from("gtm_competitor_changes")
        .insert(mapChangeRow(result.data, watch.competitor, watch.watch_type));

      if (insertError) {
        throw new Error(`Failed to insert competitor change: ${insertError.message}`);
      }

      if (result.data.significance === "high") {
        high += 1;
      }
      changes += 1;
      await touchWatch(supabase, watch.id, { snapshot: text, hash });
    }

    const headline = `Scanned ${checked} watches; ${changes} changes (${high} high)${
      unreachable ? `, ${unreachable} unreachable` : ""
    }`;

    await upsertStatus({
      module: "gtm",
      subsystem: SUBSYSTEM,
      product: "pam",
      status: high > 0 ? "warning" : "ok",
      headline,
      metrics: { agent: agent.id, model, checked, changes, high, unreachable },
      needs_attention:
        high > 0
          ? [{ severity: "high", message: `${high} high-significance competitor changes detected.` }]
          : [],
    });

    await logAgentRun({
      agent_id: agent.id,
      status: "ok",
      model,
      summary: headline,
      output: { checked, changes, high, unreachable },
      items_created: changes,
      input_tokens: inputTokens || null,
      output_tokens: outputTokens || null,
      error: null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: true, status: "ok", checked, changes, message: headline };
  } catch (error) {
    const configIssue = error instanceof AgentConfigError;
    const message = error instanceof Error ? error.message : "Unknown competitor scout error";

    await upsertStatus({
      module: "gtm",
      subsystem: SUBSYSTEM,
      product: "pam",
      status: configIssue ? "idle" : "error",
      headline: configIssue ? `Competitor Scout idle — ${message}` : `Competitor Scout failed: ${message}`,
      metrics: { agent: AGENT_ID, configKind: configIssue ? "missing_api_key" : "runtime_error" },
      needs_attention: configIssue ? [] : [{ severity: "high", message }],
    });

    await logAgentRun({
      agent_id: AGENT_ID,
      status: configIssue ? "skipped" : "error",
      model,
      summary: configIssue ? "Skipped: Anthropic not configured" : "Run failed",
      output: null,
      items_created: 0,
      input_tokens: null,
      output_tokens: null,
      error: message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: configIssue, status: configIssue ? "skipped" : "error", checked: 0, changes: 0, message };
  }
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function fetchReadable(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; PAM-OperatingPortal CompetitorScout)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      return null;
    }
    return extractReadableText(await response.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function touchWatch(
  supabase: ReturnType<typeof createPortalAdminClient>,
  id: string,
  snapshot: { snapshot: string; hash: string } | null,
): Promise<void> {
  const update: Record<string, unknown> = { last_checked_at: new Date().toISOString() };
  if (snapshot) {
    update.last_snapshot = snapshot.snapshot;
    update.last_hash = snapshot.hash;
  }
  const { error } = await supabase.from("gtm_competitor_watch").update(update).eq("id", id);
  if (error) {
    throw new Error(`Failed to update competitor watch: ${error.message}`);
  }
}
