import "server-only";

import { verifyCronRequest } from "@/lib/cron-auth";
import { runCompetitorStatusCron, runContentStatusCron, runExperimentsStatusCron, runOutreachStatusCron } from "./status-jobs";
import { summarizeCronRun, type CronRunResult } from "./cron-all";
import { runWeeklyBriefsCron } from "./weekly-briefs";

const jobs = [
  ["briefs", runWeeklyBriefsCron],
  ["competitors", runCompetitorStatusCron],
  ["experiments", runExperimentsStatusCron],
  ["content", runContentStatusCron],
  ["outreach", runOutreachStatusCron],
] as const;

export async function runAllGtmCron(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const results: CronRunResult[] = [];

  for (const [subsystem, run] of jobs) {
    try {
      const response = await run(request);
      const body = await response.json().catch(() => null);
      const ok = response.ok && body?.ok !== false;

      results.push({
        subsystem,
        ok,
        status: String(body?.status ?? (ok ? "ok" : "error")),
        error: ok ? undefined : String(body?.error ?? response.statusText),
      });
    } catch (error) {
      results.push({
        subsystem,
        ok: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown cron job error",
      });
    }
  }

  const summary = summarizeCronRun(results);
  return Response.json(summary, { status: summary.ok ? 200 : 500 });
}
