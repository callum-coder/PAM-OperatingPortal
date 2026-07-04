import { AlertTriangle, CheckCircle2, Clock3, Route } from "lucide-react";
import Link from "next/link";

import { getSystemStatus } from "@/lib/dashboard-data";
import {
  conversionRate,
  evaluateTargets,
  flattenBriefMetrics,
} from "@/lib/gtm/journey";
import { getTargets } from "@/lib/gtm/journey-data";
import { readPamTrialFunnel } from "@/lib/gtm/pam-readonly";
import { getHubspotGtmMetrics } from "@/lib/hubspot";
import { DEFAULT_PRODUCT } from "@/lib/products";
import { getReadableModules, hasPermission } from "@/lib/rbac/permissions";
import { requireUser } from "@/lib/rbac/guard";

const statusTone = {
  ok: "text-[#28734d]",
  warning: "text-[#9f6a00]",
  error: "text-[#b42318]",
  idle: "text-[#697567]",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const readableModules = getReadableModules(user.roles);
  const canSeeRevenue = hasPermission(user.roles, "gtm.briefs.read");

  const [statuses, funnel, crm, targetRows] = await Promise.all([
    getSystemStatus(readableModules),
    canSeeRevenue ? readPamTrialFunnel() : Promise.resolve(null),
    canSeeRevenue
      ? getHubspotGtmMetrics()
      : Promise.resolve({ source: "hubspot" as const, contacts: null, leads: null, deals: null, subscriptions: null }),
    canSeeRevenue ? getTargets() : Promise.resolve([]),
  ]);

  const attention = statuses.flatMap((row) =>
    Array.isArray(row.needs_attention) ? row.needs_attention : [],
  );

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
  const rate = conversionRate(funnel?.trialsStarted7d ?? null, funnel?.trialsConverted7d ?? null);

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Cross-module status spine</p>
          <h1 className="portal-title">Operating dashboard</h1>
        </div>
        <div className="portal-deadline">
          <span>MTD wedge date</span>
          <strong>7 Aug 2026</strong>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visible modules" value={readableModules.length} />
        <MetricCard label="Subsystems reporting" value={statuses.length} />
        <MetricCard label="Needs attention" value={attention.length} />
      </section>

      <section className="portal-panel">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <p className="portal-kicker">Primary product</p>
            <h2 className="portal-section-title">{DEFAULT_PRODUCT.name}</h2>
            <p className="portal-muted mt-2">
              {DEFAULT_PRODUCT.audience} · {DEFAULT_PRODUCT.lifecycleModel} lifecycle. Future
              products can share the same status, journey, agent, and integration contracts.
            </p>
          </div>
          <Link className="portal-nav-link inline-flex h-fit w-auto md:justify-center" href="/gtm/customers">
            <Route size={16} />
            Customer 360
          </Link>
        </div>
      </section>

      {canSeeRevenue ? (
        <section className="portal-panel">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="portal-kicker">Trial → paid</p>
              <h2 className="portal-section-title">Revenue engine</h2>
            </div>
            <Link className="portal-nav-link inline-flex w-auto" href="/gtm/journey">
              <Route size={16} />
              Journey
            </Link>
          </div>

          {funnel ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <RevenueTile label="Trials started (7d)" value={funnel.trialsStarted7d} />
              <RevenueTile label="In trial" value={funnel.trialsActive} />
              <RevenueTile label="Converted (7d)" value={funnel.trialsConverted7d} />
              <RevenueTile label="Conversion" suffix={rate === null ? undefined : "%"} value={rate} />
              <RevenueTile label="Paying" value={funnel.payingTotal} />
            </div>
          ) : (
            <p className="portal-muted">
              Trial funnel not connected yet — apply the trial-funnel view to the customer PAM
              project to see it here.
            </p>
          )}

          {targets.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {targets.map((target) => (
                <div key={target.metric}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{target.label}</span>
                    <span className="font-medium">
                      {target.current ?? "—"} / {target.target}
                      {target.progressPct !== null ? ` · ${target.progressPct}%` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e7ebe1]">
                    <div
                      className="h-full rounded-full bg-[#d9ff73]"
                      style={{ width: `${Math.min(100, target.progressPct ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="portal-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="portal-section-title">System status</h2>
            <p className="portal-muted">
              One shared table, filtered by the permissions attached to your roles.
            </p>
          </div>
          <Clock3 className="text-[#71806a]" size={20} />
        </div>

        {statuses.length ? (
          <div className="divide-y divide-[#dfe5d8]">
            {statuses.map((row) => (
              <div className="grid gap-3 py-4 md:grid-cols-[1fr_140px_180px]" key={row.id}>
                <div>
                  <p className="font-medium">
                    {row.module.toUpperCase()} / {row.subsystem}
                    {row.product ? ` / ${row.product}` : ""}
                  </p>
                  <p className="portal-muted">{row.headline ?? "No headline recorded"}</p>
                </div>
                <p className={`flex items-center gap-2 font-medium ${statusTone[row.status]}`}>
                  {row.status === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {row.status}
                </p>
                <p className="portal-muted">
                  {row.last_run_at
                    ? new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(row.last_run_at))
                    : "Not run yet"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No status rows yet" body="Run a cron route after Supabase is configured and subsystem cards will appear here." />
        )}
      </section>
    </div>
  );
}

function RevenueTile({
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="portal-panel">
      <p className="portal-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-[#c6d0bc] bg-[#f8faf4] p-6">
      <p className="font-medium">{title}</p>
      <p className="portal-muted mt-1">{body}</p>
    </div>
  );
}
