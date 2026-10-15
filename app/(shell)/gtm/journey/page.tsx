import Link from "next/link";
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
import { readPamLifecycle, readPamTrialFunnel } from "@/lib/gtm/pam-readonly";
import { activationRate, answerRate } from "@/lib/gtm/lifecycle";
import { getHubspotGtmMetrics } from "@/lib/hubspot";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { deleteTarget, upsertTarget } from "../actions";

export default async function JourneyPage() {
  const user = await requirePermission("gtm.briefs.read");
  const canEdit = hasPermission(user.roles, "gtm.briefs.write");

  const [funnel, crm, targets, briefs, lifecycle] = await Promise.all([
    readPamTrialFunnel(),
    getHubspotGtmMetrics(),
    getTargets(),
    getLatestGtmBriefs(1),
    readPamLifecycle(),
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
  const demoRate = conversionRate(funnel?.demoStarted7d ?? null, funnel?.demoConverted7d ?? null);

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Free trial → paid membership</p>
          <h1 className="portal-title">Trial journey</h1>
        </div>
        <div className="portal-deadline">
          <span>Next MTD deadline</span>
          <strong>{mtd.daysRemaining} days</strong>
        </div>
      </section>

      <section className="portal-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="portal-kicker">The 14-day journey</p>
            <h2 className="portal-section-title">Success map</h2>
          </div>
          <Route className="text-[#8b94a3]" size={20} />
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {TRIAL_JOURNEY.map((stage, index) => (
            <div className="rounded-lg border border-[#e6e8ef] bg-[#ffffff] p-4" key={stage.phase}>
              <p className="text-xs font-semibold uppercase text-[#5b6472]">
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
        <div className="mb-4">
          <p className="portal-kicker">Lifecycle engine · last 7 days</p>
          <h2 className="portal-section-title">What PAM did this week</h2>
        </div>
        {lifecycle && lifecycle.touchesSent7d !== null ? (
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <FunnelMetric label="Touches sent" value={lifecycle.touchesSent7d} />
            <FunnelMetric label="By WhatsApp" value={lifecycle.touchesWhatsapp7d} />
            <FunnelMetric label="Answered within 48h" value={answerRate(lifecycle)} suffix={answerRate(lifecycle) === null ? undefined : "%"} />
            <FunnelMetric label="Demo → trial" value={lifecycle.demoToTrial7d} />
            <FunnelMetric label="Opted out" value={lifecycle.optOuts7d} />
            <FunnelMetric label="Failed sends" value={lifecycle.touchesFailed7d} />
            <FunnelMetric label="Trials with a property" value={activationRate(lifecycle, "trialsWithProperty")} suffix="%" />
            <FunnelMetric label="…with a tenant" value={activationRate(lifecycle, "trialsWithTenant")} suffix="%" />
            <FunnelMetric label="…collecting rent" value={activationRate(lifecycle, "trialsWithGocardless")} suffix="%" />
            <FunnelMetric label="…bank connected" value={activationRate(lifecycle, "trialsWithBankFeed")} suffix="%" />
            <FunnelMetric label="…HMRC connected" value={activationRate(lifecycle, "trialsWithHmrc")} suffix="%" />
            <FunnelMetric label="…messaged PAM" value={activationRate(lifecycle, "trialsOnWhatsapp")} suffix="%" />
          </div>
        ) : (
          <p className="portal-muted">Lifecycle not connected: run PAM migration-064 (it adds <code>portal_readonly.lifecycle_stages</code>).</p>
        )}
      </section>

      <section className="portal-panel">
        <h2 className="portal-section-title">Live funnel</h2>
        {funnel && funnel.demoStarted7d !== null && funnel.demoStarted7d !== undefined ? (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="portal-kicker">WhatsApp demo · +44 7868 264023</p>
              <Link className="text-sm font-medium text-[#1a1a2e] underline-offset-4 hover:underline" href="/gtm/demo">
                Read every conversation →
              </Link>
            </div>
            <div className="mt-2 grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
              <FunnelMetric label="Demos started (7d)" value={funnel.demoStarted7d} />
              <FunnelMetric label="Demos active" value={funnel.demoActive ?? null} />
              <FunnelMetric label="Engaged (7d)" value={funnel.demoEngaged7d ?? null} />
              <FunnelMetric label="Signed up (7d)" value={funnel.demoConverted7d ?? null} />
              <FunnelMetric
                label="Demo → sign-up (7d)"
                value={demoRate}
                suffix={demoRate === null ? undefined : "%"}
              />
            </div>
            <p className="portal-kicker mt-6">14-day trial</p>
          </div>
        ) : null}
        {funnel ? (
          <div className="mt-2 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
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
            <div className="mt-4 divide-y divide-[#e6e8ef]">
              {storedDeltas.map((row) => (
                <div className="flex items-center justify-between gap-3 py-2" key={row.key}>
                  <p className="text-sm">{row.label}</p>
                  <p className="text-sm">
                    <span className="font-semibold">{row.current}</span>{" "}
                    <span className={row.delta && row.delta > 0 ? "text-[#0a6648]" : "text-[#8b94a3]"}>
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
            <TargetIcon className="text-[#8b94a3]" size={18} />
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
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6e8ef]">
                    <div
                      className="h-full rounded-full bg-[#2ec4a0]"
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
            <form action={upsertTarget} className="mt-6 grid gap-2 border-t border-[#e6e8ef] pt-4 sm:grid-cols-[1fr_110px_150px_auto]">
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
    <div className="rounded-lg border border-[#e6e8ef] bg-[#ffffff] p-4">
      <p className="portal-muted text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold">
        {value === null ? "—" : `${value.toLocaleString("en-GB")}${suffix ?? ""}`}
      </p>
    </div>
  );
}
