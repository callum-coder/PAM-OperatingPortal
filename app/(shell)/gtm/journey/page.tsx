import { Route, Target as TargetIcon, Trash2 } from "lucide-react";

import { getLatestGtmBriefs } from "@/lib/gtm/briefs-data";
import { getMtdCountdown } from "@/lib/gtm/briefs";
import {
  TARGETABLE_METRICS,
  TRIAL_JOURNEY,
  conversionRate,
  evaluateTargets,
  flattenBriefMetrics,
  formatDelta,
  type MetricDelta,
} from "@/lib/gtm/journey";
import { getTargets } from "@/lib/gtm/journey-data";
import { readPamTrialFunnel } from "@/lib/gtm/pam-readonly";
import { getHubspotGtmMetrics } from "@/lib/hubspot";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { deleteTarget, upsertTarget } from "../actions";

export default async function JourneyPage() {
  const user = await requirePermission("gtm.briefs.read");
  const canEdit = hasPermission(user.roles, "gtm.briefs.write");

  const [funnel, crm, targets, briefs] = await Promise.all([
    readPamTrialFunnel(),
    getHubspotGtmMetrics(),
    getTargets(),
    getLatestGtmBriefs(1),
  ]);

  const mtd = getMtdCountdown();
  const currentFlat = flattenBriefMetrics({ crm, funnel: funnel ?? {} });
  const evaluatedTargets = evaluateTargets(
    targets.map((row) => ({
      metric: row.metric,
      label: row.label,
      target: row.target,
      due_date: row.due_date,
    })),
    currentFlat,
  );
  const storedDeltas = ((briefs[0]?.raw_metrics?.deltas as MetricDelta[] | undefined) ?? []).filter(
    (row) => row && row.delta !== null,
  );
  const rate = conversionRate(funnel?.trialsStarted7d ?? null, funnel?.trialsConverted7d ?? null);

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Free trial → paid membership</p>
          <h1 className="portal-title">Trial journey</h1>
        </div>
        <div className="portal-deadline">
          <span>MTD wedge</span>
          <strong>{mtd.daysRemaining} days</strong>
        </div>
      </section>

      <section className="portal-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="portal-kicker">The 14-day journey</p>
            <h2 className="portal-section-title">Success map</h2>
          </div>
          <Route className="text-[#71806a]" size={20} />
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {TRIAL_JOURNEY.map((stage, index) => (
            <div className="rounded-lg border border-[#dfe5d8] bg-[#fbfcf7] p-4" key={stage.phase}>
              <p className="text-xs font-semibold uppercase text-[#64715d]">
                {index + 1}. {stage.days}
              </p>
              <p className="mt-1 font-semibold">{stage.phase}</p>
              <p className="mt-2 text-sm leading-6">{stage.goal}</p>
              <p className="portal-muted mt-3 text-xs">{stage.measure}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="portal-panel">
        <h2 className="portal-section-title">Live funnel</h2>
        {funnel ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <FunnelMetric label="Trials started (7d)" value={funnel.trialsStarted7d} />
            <FunnelMetric label="Trials active" value={funnel.trialsActive} />
            <FunnelMetric label="Converted (7d)" value={funnel.trialsConverted7d} />
            <FunnelMetric label="Expired (7d)" value={funnel.trialsExpired7d} />
            <FunnelMetric label="Paying total" value={funnel.payingTotal} />
            <FunnelMetric
              label="Conversion (7d)"
              value={rate}
              suffix={rate === null ? undefined : "%"}
            />
          </div>
        ) : (
          <p className="portal-muted mt-3 max-w-2xl">
            Funnel not connected yet. Apply{" "}
            <code>supabase/customer-pam/002_portal_readonly_trial_funnel.sql</code> to the customer
            PAM project (with the real table names) and the live trial → paid funnel appears here,
            in the weekly brief, and in the daily standup.
          </p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="portal-panel">
          <h2 className="portal-section-title">Week-over-week</h2>
          {storedDeltas.length ? (
            <div className="mt-4 divide-y divide-[#dfe5d8]">
              {storedDeltas.map((row) => (
                <div className="flex items-center justify-between gap-3 py-2" key={row.key}>
                  <p className="text-sm">{row.label}</p>
                  <p className="text-sm">
                    <span className="font-semibold">{row.current}</span>{" "}
                    <span className={row.delta && row.delta > 0 ? "text-[#28734d]" : "text-[#697567]"}>
                      ({formatDelta(row.delta)})
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="portal-muted mt-3">
              Movement appears once two weekly briefs have captured the same metrics.
            </p>
          )}
        </div>

        <div className="portal-panel">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="portal-section-title">Targets</h2>
            <TargetIcon className="text-[#71806a]" size={18} />
          </div>

          {evaluatedTargets.length ? (
            <div className="space-y-4">
              {evaluatedTargets.map((target) => (
                <div key={target.metric}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{target.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm">
                        {target.current ?? "—"} / {target.target}
                        {target.progressPct !== null ? ` · ${target.progressPct}%` : ""}
                        {target.due_date ? ` · by ${target.due_date}` : ""}
                      </p>
                      {canEdit ? (
                        <form action={deleteTarget}>
                          <input name="metric" type="hidden" value={target.metric} />
                          <button aria-label={`Delete ${target.label} target`} className="text-[#8a9683] hover:text-[#b42318]" type="submit">
                            <Trash2 size={14} />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7ebe1]">
                    <div
                      className="h-full rounded-full bg-[#d9ff73]"
                      style={{ width: `${Math.min(100, target.progressPct ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="portal-muted">No targets set yet.</p>
          )}

          {canEdit ? (
            <form action={upsertTarget} className="mt-6 grid gap-2 border-t border-[#dfe5d8] pt-4 sm:grid-cols-[1fr_110px_150px_auto]">
              <select className="portal-input" defaultValue="payingTotal" name="metric">
                {TARGETABLE_METRICS.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
              <input className="portal-input" min="1" name="target" placeholder="Target" required type="number" />
              <input className="portal-input" name="due_date" type="date" />
              <button className="portal-secondary-button" type="submit">
                Set target
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FunnelMetric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-[#dfe5d8] bg-[#fbfcf7] p-4">
      <p className="portal-muted text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold">
        {value === null ? "—" : `${value.toLocaleString("en-GB")}${suffix ?? ""}`}
      </p>
    </div>
  );
}
