import "server-only";

import { verifyCronRequest } from "@/lib/cron-auth";
import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import { upsertStatus, type StatusInput } from "@/lib/status";

import { getHubspotGtmMetrics } from "@/lib/hubspot";

import { buildBriefNarrative, getMtdCountdown, getWeeklyPeriod } from "./briefs";
import { computeMetricDeltas, evaluateTargets, flattenBriefMetrics } from "./journey";
import { getTargets } from "./journey-data";
import { PamReadonlyConfigError, readPamBriefMetrics, readPamTrialFunnel } from "./pam-readonly";
import { syncSignalsForStatus } from "./status-jobs";
import { synthesizeWeeklyBrief } from "./agents/brief-analyst";
import { AgentConfigError } from "./agents/runner";
import { logAgentRun } from "./agents/runs";
import { mapBriefActionRow, type BriefAction } from "./agents/weekly-brief-synthesis";

export async function runWeeklyBriefsCron(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPortalSupabaseConfig()) {
    return Response.json(
      { ok: false, subsystem: "briefs", error: "Portal Supabase is not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await generateWeeklyBrief();
    const headline = result.skipped
      ? `Weekly brief already exists for ${result.periodStart} to ${result.periodEnd}`
      : `Weekly brief generated for ${result.periodStart} to ${result.periodEnd}`;

    const statusPayload: StatusInput = {
      module: "gtm",
      subsystem: "briefs",
      product: "pam",
      status: "ok",
      headline,
      metrics: result.metrics ?? {},
      needs_attention: [],
    };

    await upsertStatus(statusPayload);
    await syncSignalsForStatus({
      subsystem: statusPayload.subsystem,
      product: statusPayload.product ?? "pam",
      status: statusPayload.status,
      headline,
      metrics: statusPayload.metrics,
      needs_attention: statusPayload.needs_attention,
    });

    return Response.json({
      ok: true,
      subsystem: "briefs",
      status: "ok",
      briefId: result.briefId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown briefs job error";
    const status = error instanceof PamReadonlyConfigError ? 200 : 500;

    const statusPayload: StatusInput = {
      module: "gtm",
      subsystem: "briefs",
      product: "pam",
      status: error instanceof PamReadonlyConfigError ? "warning" : "error",
      headline: message,
      metrics: {
        source: "pam_readonly",
        configKind: error instanceof PamReadonlyConfigError ? error.kind : "runtime_error",
      },
      needs_attention: [
        {
          severity: error instanceof PamReadonlyConfigError ? "medium" : "high",
          message,
        },
      ],
    };

    await upsertStatus(statusPayload);
    await syncSignalsForStatus({
      subsystem: statusPayload.subsystem,
      product: statusPayload.product ?? "pam",
      status: statusPayload.status,
      headline: message,
      metrics: statusPayload.metrics,
      needs_attention: statusPayload.needs_attention,
    });

    return Response.json(
      {
        ok: false,
        subsystem: "briefs",
        status: error instanceof PamReadonlyConfigError ? "warning" : "error",
        error: message,
      },
      { status },
    );
  }
}

async function generateWeeklyBrief() {
  const { periodStart, periodEnd } = getWeeklyPeriod();

  // One brief per weekly period: if a brief was generated in the last 6 days,
  // return it instead of synthesising (and duplicating actions) again.
  const guardClient = createPortalAdminClient();
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await guardClient
    .from("gtm_briefs")
    .select("id,period_start,period_end")
    .eq("product", "pam")
    .gte("created_at", sixDaysAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent?.length) {
    return {
      briefId: recent[0].id as string,
      periodStart: (recent[0].period_start as string) ?? periodStart,
      periodEnd: (recent[0].period_end as string) ?? periodEnd,
      metrics: null,
      skipped: true as const,
    };
  }

  const metrics = await readPamBriefMetrics();
  const crm = await getHubspotGtmMetrics();
  const funnel = await readPamTrialFunnel();
  const targetRows = await getTargets();
  const mtdCountdown = getMtdCountdown();

  // Week-over-week deltas against the previous brief's stored metrics.
  const { data: prevRows } = await guardClient
    .from("gtm_briefs")
    .select("raw_metrics")
    .eq("product", "pam")
    .order("created_at", { ascending: false })
    .limit(1);
  const previousRaw = (prevRows?.[0]?.raw_metrics ?? null) as Record<string, unknown> | null;

  const currentFlat = flattenBriefMetrics({
    authUsers: metrics.authUsers,
    propertyRecords: metrics.propertyRecords,
    payingSignals: metrics.payingSignals,
    crm,
    funnel: funnel ?? {},
  });
  const deltas = computeMetricDeltas(previousRaw, currentFlat);
  const targets = evaluateTargets(
    targetRows.map((row) => ({
      metric: row.metric,
      label: row.label,
      target: row.target,
      due_date: row.due_date,
    })),
    currentFlat,
  );

  const startedAt = new Date().toISOString();
  let narrative: string;
  let actions: BriefAction[] = [];
  let source: "agent" | "deterministic" = "deterministic";
  let model: string | null = null;
  let usage: { inputTokens: number; outputTokens: number } | null = null;
  let agentError: string | null = null;

  try {
    const synthesis = await synthesizeWeeklyBrief({
      product: "pam",
      periodStart,
      periodEnd,
      mtd: mtdCountdown,
      metrics,
      crm,
      funnel,
      deltas,
      targets,
    });
    narrative = synthesis.narrative;
    actions = synthesis.actions;
    source = "agent";
    model = synthesis.model;
    usage = synthesis.usage;
  } catch (error) {
    // Any synthesis failure falls back to the deterministic narrative so the
    // brief job stays resilient. A missing API key is "skipped"; anything else
    // is a real error worth recording on the run log.
    narrative = buildBriefNarrative({
      product: "pam",
      periodStart,
      periodEnd,
      mtdCountdown,
      metrics,
    });
    if (!(error instanceof AgentConfigError)) {
      agentError = error instanceof Error ? error.message : "Unknown brief synthesis error";
    }
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_briefs")
    .insert({
      product: "pam",
      period_start: periodStart,
      period_end: periodEnd,
      raw_metrics: {
        ...metrics,
        mtdCountdown,
        crm,
        funnel,
        deltas,
        targets,
        synthesis: { source, model },
      },
      narrative,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert weekly brief: ${error.message}`);
  }

  const briefId = data.id as string;

  if (actions.length) {
    const { error: actionsError } = await supabase
      .from("gtm_brief_actions")
      .insert(actions.map((action) => mapBriefActionRow(action, briefId, "pam")));

    if (actionsError) {
      throw new Error(`Failed to insert brief actions: ${actionsError.message}`);
    }
  }

  await logAgentRun({
    agent_id: "brief-analyst",
    status: source === "agent" ? "ok" : agentError ? "error" : "skipped",
    model,
    summary:
      source === "agent"
        ? `Synthesised brief for ${periodStart} to ${periodEnd} with ${actions.length} actions`
        : "Deterministic brief (Brief Analyst unavailable)",
    output: { briefId, actions },
    items_created: actions.length,
    input_tokens: usage?.inputTokens ?? null,
    output_tokens: usage?.outputTokens ?? null,
    error: agentError,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  return {
    briefId,
    periodStart,
    periodEnd,
    metrics,
    skipped: false as const,
  };
}
