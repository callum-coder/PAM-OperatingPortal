import "server-only";

import { verifyCronRequest } from "@/lib/cron-auth";
import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import { upsertStatus } from "@/lib/status";
import type { SystemStatusValue } from "@/lib/status-payload";
import { evaluateOutreachReadiness } from "./outreach-readiness";

type JobResult = {
  subsystem: string;
  product?: string | null;
  status: SystemStatusValue;
  headline: string;
  metrics?: Record<string, unknown>;
  needs_attention?: unknown[];
};

export async function runCompetitorStatusCron(request: Request) {
  return runGuardedStatusJob(request, buildCompetitorStatus);
}

export async function runContentStatusCron(request: Request) {
  return runGuardedStatusJob(request, buildContentStatus);
}

export async function runExperimentsStatusCron(request: Request) {
  return runGuardedStatusJob(request, buildExperimentStatus);
}

export async function runOutreachStatusCron(request: Request) {
  return runGuardedStatusJob(request, buildOutreachStatus);
}

async function runGuardedStatusJob(
  request: Request,
  buildStatus: () => Promise<JobResult>,
) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPortalSupabaseConfig()) {
    return Response.json({ ok: false, error: "Portal Supabase is not configured" }, { status: 503 });
  }

  try {
    const result = await buildStatus();
    await upsertStatus({
      module: "gtm",
      subsystem: result.subsystem,
      product: result.product ?? "pam",
      status: result.status,
      headline: result.headline,
      metrics: result.metrics ?? {},
      needs_attention: result.needs_attention ?? [],
    });
    await syncSignalsForStatus(result);

    return Response.json({
      ok: true,
      subsystem: result.subsystem,
      status: result.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GTM status job error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

async function buildCompetitorStatus(): Promise<JobResult> {
  const supabase = createPortalAdminClient();
  const [{ count: watchCount, error: watchError }, { count: highChanges, error: changeError }] =
    await Promise.all([
      supabase
        .from("gtm_competitor_watch")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("gtm_competitor_changes")
        .select("*", { count: "exact", head: true })
        .eq("significance", "high")
        .gte("detected_at", daysAgoIso(7)),
    ]);

  if (watchError) throw new Error(`Failed to count competitor watches: ${watchError.message}`);
  if (changeError) throw new Error(`Failed to count competitor changes: ${changeError.message}`);

  const watches = watchCount ?? 0;
  const high = highChanges ?? 0;

  return {
    subsystem: "competitors",
    product: "pam",
    status: watches > 0 ? (high > 0 ? "warning" : "ok") : "idle",
    headline:
      watches > 0
        ? `${watches} competitor watches configured; ${high} high-significance changes in 7 days`
        : "No competitor watches configured yet",
    metrics: { watches, highSignificanceChanges7d: high },
    needs_attention:
      high > 0
        ? [{ severity: "high", message: `${high} high-significance competitor changes need review.` }]
        : [],
  };
}

async function buildContentStatus(): Promise<JobResult> {
  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_content_items")
    .select("stage,stage_changed_at");

  if (error) throw new Error(`Failed to load content items: ${error.message}`);

  const counts = countBy(data ?? [], "stage");
  const stalledReview = (data ?? []).filter(
    (item) =>
      item.stage === "review" &&
      item.stage_changed_at &&
      new Date(item.stage_changed_at).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).length;

  return {
    subsystem: "content",
    product: "pam",
    status: stalledReview > 0 ? "warning" : (data?.length ?? 0) > 0 ? "ok" : "idle",
    headline:
      (data?.length ?? 0) > 0
        ? `${data?.length ?? 0} content items tracked; ${stalledReview} stalled in review`
        : "No content items in the pipeline yet",
    metrics: { total: data?.length ?? 0, byStage: counts, stalledReview },
    needs_attention:
      stalledReview > 0
        ? [{ severity: "medium", message: `${stalledReview} content items are stalled in review.` }]
        : [],
  };
}

async function buildExperimentStatus(): Promise<JobResult> {
  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_experiments")
    .select("status,time_cap");

  if (error) throw new Error(`Failed to load experiments: ${error.message}`);

  const counts = countBy(data ?? [], "status");
  const readyToCall = (data ?? []).filter(
    (experiment) =>
      experiment.status === "running" &&
      experiment.time_cap &&
      new Date(experiment.time_cap).getTime() <= Date.now(),
  ).length;

  return {
    subsystem: "experiments",
    product: "pam",
    status: readyToCall > 0 ? "warning" : (data?.length ?? 0) > 0 ? "ok" : "idle",
    headline:
      (data?.length ?? 0) > 0
        ? `${data?.length ?? 0} experiments tracked; ${readyToCall} ready to call`
        : "No GTM experiments configured yet",
    metrics: { total: data?.length ?? 0, byStatus: counts, readyToCall },
    needs_attention:
      readyToCall > 0
        ? [{ severity: "medium", message: `${readyToCall} experiments have reached time cap.` }]
        : [],
  };
}

async function buildOutreachStatus(): Promise<JobResult> {
  const supabase = createPortalAdminClient();
  const [
    readinessResult,
    sequencesResult,
    enrollmentsResult,
    suppressionResult,
  ] = await Promise.all([
    supabase
      .from("gtm_outreach_readiness_checks")
      .select("key,title,status,blocking")
      .order("blocking", { ascending: false })
      .order("key", { ascending: true }),
    supabase
      .from("gtm_sequences")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("gtm_sequence_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("next_action_at", new Date().toISOString()),
    supabase
      .from("gtm_suppression")
      .select("*", { count: "exact", head: true }),
  ]);

  if (readinessResult.error) {
    throw new Error(`Failed to load outreach readiness checks: ${readinessResult.error.message}`);
  }
  if (sequencesResult.error) {
    throw new Error(`Failed to count outreach sequences: ${sequencesResult.error.message}`);
  }
  if (enrollmentsResult.error) {
    throw new Error(`Failed to count due outreach enrollments: ${enrollmentsResult.error.message}`);
  }
  if (suppressionResult.error) {
    throw new Error(`Failed to count suppression records: ${suppressionResult.error.message}`);
  }

  const readiness = evaluateOutreachReadiness(readinessResult.data ?? []);
  const activeSequences = sequencesResult.count ?? 0;
  const dueEnrollments = enrollmentsResult.count ?? 0;
  const suppressionRecords = suppressionResult.count ?? 0;

  return {
    subsystem: "outreach",
    product: "pam",
    status: readiness.ready ? (dueEnrollments > 0 ? "warning" : "ok") : "idle",
    headline: readiness.ready
      ? `${activeSequences} active outreach sequences; ${dueEnrollments} enrollments due`
      : `${readiness.blockingPending} outreach readiness checks are blocking live sends`,
    metrics: {
      activeSequences,
      dueEnrollments,
      suppressionRecords,
      readiness: {
        approvedBlocking: readiness.approvedBlocking,
        totalBlocking: readiness.totalBlocking,
        blockingPending: readiness.blockingPending,
      },
    },
    needs_attention: readiness.ready
      ? dueEnrollments > 0
        ? [{ severity: "medium", message: `${dueEnrollments} outreach enrollments are due for review.` }]
        : []
      : readiness.attention,
  };
}

function countBy<T extends Record<string, unknown>>(items: T[], key: keyof T) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = String(item[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function syncSignalsForStatus(result: JobResult) {
  const supabase = createPortalAdminClient();
  const attention = result.needs_attention ?? [];
  const product = result.product ?? "pam";
  const currentSignalType = `${result.subsystem}_${result.status}`;

  const staleQuery = supabase
    .from("gtm_signals")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("product", product)
    .eq("source", "system_status")
    .like("signal_type", `${result.subsystem}_%`)
    .in("status", ["open", "in_progress", "snoozed"]);

  const { error: staleError } = attention.length > 0
    ? await staleQuery.neq("signal_type", currentSignalType)
    : await staleQuery;

  if (staleError) {
    throw new Error(`Failed to close stale GTM signals: ${staleError.message}`);
  }

  if (attention.length > 0) {
    const severity = result.status === "error" ? "high" : "medium";
    const { error } = await supabase.from("gtm_signals").upsert(
      {
        product,
        source: "system_status",
        signal_type: currentSignalType,
        title: result.headline,
        detail: attention
          .map((item) =>
            item && typeof item === "object" && "message" in item
              ? String((item as { message: unknown }).message)
              : null,
          )
          .filter(Boolean)
          .join("\n"),
        severity,
        status: "open",
        next_action: "Review and decide owner, action, and due date.",
        related_table: "system_status",
        payload: { subsystem: result.subsystem, status: result.status, attention },
      },
      { onConflict: "source,signal_type,product" },
    );

    if (error) {
      throw new Error(`Failed to sync GTM signal: ${error.message}`);
    }
  }
}
