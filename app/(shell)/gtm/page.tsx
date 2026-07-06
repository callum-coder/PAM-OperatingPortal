import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles, Target, TrendingUp } from "lucide-react";

import { getSystemStatus } from "@/lib/dashboard-data";
import { getGtmOperatingSnapshot } from "@/lib/gtm/operating-data";
import { getHubspotGtmMetrics, hasHubspotConfig } from "@/lib/hubspot";
import { requirePermission } from "@/lib/rbac/guard";
import { updateSignalStatus } from "./actions";
import { CampaignForm, ManualInputForm, OutreachReadinessChecklist } from "./operating-forms";

const subsystems = [
  ["briefs", "Weekly briefs", "/gtm/briefs"],
  ["leads", "Lead engine", "/gtm/leads"],
  ["competitors", "Competitor monitor", "/gtm/competitors"],
  ["experiments", "Experiment loop", "/gtm/experiments"],
  ["content", "Content pipeline", "/gtm/content"],
  ["outreach", "Outreach loops", "/gtm/outreach"],
] as const;

export default async function GtmPage() {
  await requirePermission("gtm.briefs.read");
  const statuses = await getSystemStatus(["gtm"]);
  const snapshot = await getGtmOperatingSnapshot();
  const crm = await getHubspotGtmMetrics();

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Module 1 · Agent OS</p>
          <h1 className="portal-title">GTM control room</h1>
          <p className="portal-muted mt-4 max-w-2xl text-lg">
            Inspect the pipeline, watch the agent fleet, and turn signals into actions.
          </p>
        </div>
      </section>

      <section className="portal-hero-card">
        <div className="grid gap-6 p-5 xl:grid-cols-[0.9fr_1.1fr] xl:p-8">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <span className="portal-status-pill">
                <TrendingUp size={16} />
                HubSpot CRM
              </span>
              <h2 className="mt-5 text-4xl font-medium tracking-normal text-[#202226]">
                Pipeline
              </h2>
              <p className="portal-muted mt-3">
                Conversation, lead, deal, and subscription movement, framed as an operating chart.
              </p>
            </div>
            {hasHubspotConfig() ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <PipelineMetric label="Contacts" value={crm.contacts} />
                <PipelineMetric label="Leads" value={crm.leads} />
                <PipelineMetric label="Deals" value={crm.deals} />
                <PipelineMetric label="Paying subscriptions" value={crm.subscriptions} />
              </div>
            ) : (
              <p className="portal-muted">
                Connect HubSpot (set <code>HUBSPOT_ACCESS_TOKEN</code>) to see live pipeline metrics.
              </p>
            )}
          </div>
          <div className="portal-soft-shell">
            <div className="portal-os-frame p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#202226]">GTM momentum</p>
                  <p className="portal-muted text-xs">Last 7 days</p>
                </div>
                <span className="font-medium text-[#58bd72]">+18%</span>
              </div>
              <div className="portal-mini-bars mt-6" aria-hidden="true">
                <span style={{ height: "28%" }} />
                <span style={{ height: "42%" }} />
                <span style={{ height: "48%" }} />
                <span style={{ height: "57%" }} />
                <span style={{ height: "71%" }} />
                <span style={{ height: "68%" }} />
                <span style={{ height: "84%" }} />
                <span style={{ height: "88%" }} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SmallInsight label="Open signals" value={snapshot.signals.length} />
                <SmallInsight label="Actions" value={snapshot.actions.length} />
                <SmallInsight label="Campaigns" value={snapshot.campaigns.length} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {subsystems.map(([id, label, href]) => {
          const status = statuses.find((row) => row.subsystem === id);
          return (
            <Link className="portal-panel group" href={href} key={id}>
              <div className="flex items-start justify-between gap-3">
                <p className="portal-muted">{label}</p>
                <Sparkles className="text-[#4b7fd8] opacity-70" size={16} />
              </div>
              <p className="mt-4 text-2xl font-medium text-[#202226]">{status?.status ?? "idle"}</p>
              <p className="portal-muted mt-2 line-clamp-2">
                {status?.headline ?? "Awaiting first cron run"}
              </p>
              <ArrowRight
                className="mt-5 text-[#71806a] transition group-hover:translate-x-1"
                size={18}
              />
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="portal-panel">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="portal-kicker">Daily worklist</p>
              <h2 className="portal-section-title">Signal inbox</h2>
            </div>
            <ClipboardList className="text-[#71806a]" size={20} />
          </div>
          {snapshot.signals.length ? (
            <div className="divide-y divide-[#dceaf8]">
              {snapshot.signals.slice(0, 8).map((signal) => (
                <div className="grid gap-2 py-4 md:grid-cols-[130px_1fr_120px]" key={signal.id}>
                  <p className="portal-status-pill uppercase">{signal.severity}</p>
                  <div>
                    <p className="font-medium">{signal.title}</p>
                    <p className="portal-muted">{signal.next_action ?? signal.detail}</p>
                  </div>
                  <div>
                    <p className="portal-muted">{signal.status}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {signal.status !== "in_progress" ? (
                        <SignalStatusButton signalId={signal.id} status="in_progress" label="Start" />
                      ) : null}
                      {signal.status !== "snoozed" ? (
                        <SignalStatusButton signalId={signal.id} status="snoozed" label="Snooze" />
                      ) : null}
                      <SignalStatusButton signalId={signal.id} status="closed" label="Close" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="portal-muted">No open GTM signals yet. Manual inputs and subsystem warnings land here.</p>
          )}
        </div>

        <div className="portal-panel">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="portal-kicker">Decision support</p>
              <h2 className="portal-section-title">Next best actions</h2>
            </div>
            <Target className="text-[#71806a]" size={20} />
          </div>
          {snapshot.nextBestActions.length ? (
            <div className="space-y-3">
              {snapshot.nextBestActions.slice(0, 6).map((action, index) => (
                <div className="rounded-2xl border border-[#dceaf8] bg-white p-4" key={`${action.subsystem}-${index}`}>
                  <p className="text-sm font-semibold uppercase text-[#7b8491]">
                    {action.priority} / {action.subsystem}
                  </p>
                  <p className="text-sm leading-6">{action.action}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="portal-muted">No warnings or attention items are active.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <OutreachReadinessChecklist checks={snapshot.outreachReadiness} />
        <ManualInputForm />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CampaignForm />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Ledger title="Brief actions" empty="No brief actions recorded yet">
          {snapshot.actions.map((action) => (
            <LedgerItem
              key={action.id}
              label={`${action.action_type} / ${action.status}`}
              title={action.title}
              detail={action.detail}
            />
          ))}
        </Ledger>
        <Ledger title="Campaigns" empty="No campaigns recorded yet">
          {snapshot.campaigns.map((campaign) => (
            <LedgerItem
              key={campaign.id}
              label={`${campaign.status}${campaign.channel ? ` / ${campaign.channel}` : ""}`}
              title={campaign.name}
              detail={campaign.audience}
            />
          ))}
        </Ledger>
        <Ledger title="Manual inputs" empty="No manual inputs captured yet">
          {snapshot.manualInputs.map((input) => (
            <LedgerItem
              key={input.id}
              label={`${input.input_type} / ${input.severity}`}
              title={input.title}
              detail={input.detail}
            />
          ))}
        </Ledger>
      </section>
    </div>
  );
}

function PipelineMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="portal-metric-tile">
      <p className="portal-muted">{label}</p>
      <p className="mt-2 text-3xl font-medium text-[#202226]">{value === null ? "—" : value.toLocaleString("en-GB")}</p>
    </div>
  );
}

function SmallInsight({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#dceaf8] bg-[#f8fbff] p-3">
      <p className="portal-muted text-xs">{label}</p>
      <p className="mt-1 text-2xl font-medium text-[#202226]">{value}</p>
    </div>
  );
}

function SignalStatusButton({
  signalId,
  status,
  label,
}: {
  signalId: string;
  status: "in_progress" | "snoozed" | "closed";
  label: string;
}) {
  return (
    <form action={updateSignalStatus}>
      <input name="signal_id" type="hidden" value={signalId} />
      <input name="status" type="hidden" value={status} />
      <button className="portal-secondary-button" type="submit">
        {label}
      </button>
    </form>
  );
}

function Ledger({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="portal-panel">
      <h2 className="portal-section-title">{title}</h2>
      <div className="mt-4 space-y-4">
        {Array.isArray(children) && children.length === 0 ? (
          <p className="portal-muted">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function LedgerItem({
  label,
  title,
  detail,
}: {
  label: string;
  title: string;
  detail?: string | null;
}) {
  return (
    <div className="border-t border-[#dceaf8] pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase text-[#7b8491]">{label}</p>
      <p className="mt-1 font-medium">{title}</p>
      {detail ? <p className="portal-muted mt-1">{detail}</p> : null}
    </div>
  );
}
