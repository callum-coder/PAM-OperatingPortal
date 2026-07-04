import "server-only";

import { verifyCronRequest } from "@/lib/cron-auth";
import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import { getMtdCountdown } from "@/lib/gtm/briefs";
import { evaluateTargets, flattenBriefMetrics } from "@/lib/gtm/journey";
import { getTargets } from "@/lib/gtm/journey-data";
import { readPamTrialFunnel } from "@/lib/gtm/pam-readonly";
import { getHubspotGtmMetrics } from "@/lib/hubspot";

import { getAgent, listAgents } from "./registry";
import { logAgentRun } from "./runs";
import { sendAgentMessage } from "./messages";
import { buildStandupText, type StandupFleetRow } from "./standup-report";

const AGENT_ID = "gtm-lead" as const;

export async function runGtmStandupCron(request: Request) {
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

  const result = await executeGtmStandup();
  return Response.json(
    { ok: result.ok, agent: AGENT_ID, status: result.status, ...(result.ok ? {} : { error: result.message }) },
    { status: result.ok ? 200 : 500 },
  );
}

export type StandupExecution = {
  ok: boolean;
  status: "ok" | "error";
  message: string;
};

// The GTM Lead's daily roll-up: what the fleet did, what's in the inbox, where
// the trial→paid funnel stands, and progress against targets. Deterministic —
// no LLM — and posted to Slack + mirrored to the agent's message log.
export async function executeGtmStandup(): Promise<StandupExecution> {
  const agent = getAgent(AGENT_ID);
  if (!agent) {
    return { ok: false, status: "error", message: `Unknown agent: ${AGENT_ID}` };
  }

  const startedAt = new Date().toISOString();

  try {
    const supabase = createPortalAdminClient();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [runsResult, signalsResult, statusResult, funnel, crm, targetRows] = await Promise.all([
      supabase
        .from("gtm_agent_runs")
        .select("agent_id,status,summary,items_created,created_at")
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false }),
      supabase
        .from("gtm_signals")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
      supabase
        .from("system_status")
        .select("subsystem,status")
        .eq("module", "gtm")
        .in("status", ["warning", "error"]),
      readPamTrialFunnel(),
      getHubspotGtmMetrics(),
      getTargets(),
    ]);

    if (runsResult.error) throw new Error(`Failed to read agent runs: ${runsResult.error.message}`);
    if (signalsResult.error) throw new Error(`Failed to count signals: ${signalsResult.error.message}`);
    if (statusResult.error) throw new Error(`Failed to read system status: ${statusResult.error.message}`);

    // Latest run per agent in the last 24h, labelled with registry names.
    const names = new Map(listAgents().map((entry) => [entry.id, entry.name]));
    const latestByAgent = new Map<string, StandupFleetRow>();
    for (const run of runsResult.data ?? []) {
      if (run.agent_id === AGENT_ID || latestByAgent.has(run.agent_id)) continue;
      latestByAgent.set(run.agent_id, {
        agentName: names.get(run.agent_id) ?? run.agent_id,
        status: String(run.status),
        summary: run.summary ?? null,
        itemsCreated: Number(run.items_created ?? 0),
      });
    }

    const currentFlat = flattenBriefMetrics({ crm, funnel: funnel ?? {} });
    const targets = evaluateTargets(
      targetRows.map((row) => ({
        metric: row.metric,
        label: row.label,
        target: row.target,
        due_date: row.due_date,
      })),
      currentFlat,
    );

    const text = buildStandupText({
      date: new Date().toISOString().slice(0, 10),
      mtdDaysRemaining: getMtdCountdown().daysRemaining,
      fleet: Array.from(latestByAgent.values()),
      openSignals: signalsResult.count ?? 0,
      attentionSubsystems: (statusResult.data ?? []).length,
      funnel,
      targets,
      baseUrl: process.env.PORTAL_BASE_URL ?? null,
    });

    await sendAgentMessage({ agentId: agent.id, text, context: { kind: "standup" } });

    await logAgentRun({
      agent_id: agent.id,
      status: "ok",
      model: null,
      summary: "Posted daily standup",
      output: { text },
      items_created: 0,
      input_tokens: null,
      output_tokens: null,
      error: null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: true, status: "ok", message: "Standup posted" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown standup error";

    await logAgentRun({
      agent_id: AGENT_ID,
      status: "error",
      model: null,
      summary: "Standup failed",
      output: null,
      items_created: 0,
      input_tokens: null,
      output_tokens: null,
      error: message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: false, status: "error", message };
  }
}
