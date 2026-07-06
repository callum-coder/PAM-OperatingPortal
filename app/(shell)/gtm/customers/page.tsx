import { Activity, HeartPulse, Route } from "lucide-react";

import { LIFECYCLE_STAGES, lifecycleNextAction, type LifecycleStage } from "@/lib/gtm/lifecycle";
import { getCustomerLifecycleSnapshot, type CustomerProfileRow } from "@/lib/gtm/lifecycle-data";
import { DEFAULT_PRODUCT } from "@/lib/products";
import { requirePermission } from "@/lib/rbac/guard";

const stageStyles: Record<LifecycleStage, string> = {
  visitor: "bg-[#eceee8] text-[#5f6d58]",
  lead: "bg-[#e7eef9] text-[#244d7a]",
  trial: "bg-[#f2ecd5] text-[#6b5d22]",
  activated: "bg-[#e6f4d8] text-[#3f5a23]",
  paying: "bg-[#d9ff73] text-[#162016]",
  at_risk: "bg-[#f7dada] text-[#7a2a2a]",
  churned: "bg-[#eceee8] text-[#5f6d58]",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CustomersPage() {
  await requirePermission("gtm.customers.read");
  const snapshot = await getCustomerLifecycleSnapshot(DEFAULT_PRODUCT.key);

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">{DEFAULT_PRODUCT.name} lifecycle</p>
          <h1 className="portal-title">Customer 360</h1>
        </div>
        <div className="portal-deadline">
          <span>Needs attention</span>
          <strong>{snapshot.summary.attentionCount}</strong>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Profiles" value={snapshot.summary.totalCustomers} />
        <MetricCard label="Average health" value={snapshot.summary.averageHealth ?? "—"} />
        <MetricCard label="Recent events" value={snapshot.events.length} />
      </section>

      <section className="portal-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="portal-kicker">Lifecycle model</p>
            <h2 className="portal-section-title">Stage map</h2>
          </div>
          <Route className="text-[#71806a]" size={20} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {LIFECYCLE_STAGES.map((stage) => (
            <div className="rounded-lg border border-[#dfe5d8] bg-[#fbfcf7] p-4" key={stage.key}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{stage.label}</p>
                <span className="text-2xl font-semibold">{snapshot.summary.byStage[stage.key]}</span>
              </div>
              <p className="mt-2 text-sm leading-6">{stage.intent}</p>
              <p className="portal-muted mt-3 text-xs">{stage.primaryMetric}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="portal-panel">
          <div className="mb-4 flex items-center gap-2">
            <HeartPulse className="text-[#71806a]" size={18} />
            <h2 className="portal-section-title">Profiles</h2>
          </div>
          {snapshot.customers.length ? (
            <div className="divide-y divide-[#dfe5d8]">
              {snapshot.customers.map((customer) => (
                <CustomerRow customer={customer} key={customer.id} />
              ))}
            </div>
          ) : (
            <p className="portal-muted">
              No customer profiles yet. Start sending lifecycle events from PAM, then upsert profiles
              by external user id or email.
            </p>
          )}
        </div>

        <div className="portal-panel">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="text-[#71806a]" size={18} />
            <h2 className="portal-section-title">Recent events</h2>
          </div>
          {snapshot.events.length ? (
            <div className="space-y-4">
              {snapshot.events.map((event) => (
                <div className="border-t border-[#dfe5d8] pt-3 first:border-t-0 first:pt-0" key={event.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{event.event_name}</p>
                    <span className="portal-muted text-xs">{formatWhen(event.occurred_at)}</span>
                  </div>
                  <p className="portal-muted mt-1 text-xs">
                    {event.stage ?? "unmapped"} / {event.source}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="portal-muted">Product events will appear here once PAM starts emitting them.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="portal-panel">
      <p className="portal-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold">{value}</p>
    </div>
  );
}

function CustomerRow({ customer }: { customer: CustomerProfileRow }) {
  return (
    <div className="grid gap-3 py-4 lg:grid-cols-[1fr_150px_110px_180px]">
      <div>
        <p className="font-medium">{customer.display_name ?? customer.email ?? customer.external_user_id ?? "Unknown customer"}</p>
        <p className="portal-muted">
          {customer.email ?? customer.external_user_id ?? "No identity attached"}
        </p>
        <p className="mt-2 text-sm">{lifecycleNextAction(customer.lifecycle_stage)}</p>
      </div>
      <span className={`h-fit rounded-full px-2 py-1 text-xs font-semibold uppercase ${stageStyles[customer.lifecycle_stage]}`}>
        {customer.lifecycle_stage.replace("_", " ")}
      </span>
      <div>
        <p className="portal-muted text-xs uppercase">Health</p>
        <p className="font-semibold">{customer.health_score ?? "—"}</p>
      </div>
      <div>
        <p className="portal-muted text-xs uppercase">Plan / MRR</p>
        <p className="font-medium">
          {customer.plan ?? "—"} / {formatMoney(customer.mrr)}
        </p>
        <p className="portal-muted text-xs">Last seen {formatWhen(customer.last_seen_at)}</p>
      </div>
    </div>
  );
}
