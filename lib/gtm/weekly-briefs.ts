import "server-only";

import { verifyCronRequest } from "@/lib/cron-auth";
import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import { upsertStatus, type StatusInput } from "@/lib/status";

import { buildBriefNarrative, getMtdCountdown, getWeeklyPeriod } from "./briefs";
import { PamReadonlyConfigError, readPamBriefMetrics } from "./pam-readonly";
import { syncSignalsForStatus } from "./status-jobs";

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
    const headline = `Weekly brief generated for ${result.periodStart} to ${result.periodEnd}`;

    const statusPayload: StatusInput = {
      module: "gtm",
      subsystem: "briefs",
      product: "pam",
      status: "ok",
      headline,
      metrics: result.metrics,
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
  const metrics = await readPamBriefMetrics();
  const { periodStart, periodEnd } = getWeeklyPeriod();
  const mtdCountdown = getMtdCountdown();
  const narrative = buildBriefNarrative({
    product: "pam",
    periodStart,
    periodEnd,
    mtdCountdown,
    metrics,
  });

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
      },
      narrative,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert weekly brief: ${error.message}`);
  }

  return {
    briefId: data.id as string,
    periodStart,
    periodEnd,
    metrics,
  };
}
