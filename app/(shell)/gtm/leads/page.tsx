import { Magnet, Sparkles } from "lucide-react";

import { getLeadPlays, type LeadPlayRow } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { generateLeadPlays } from "../actions";

const CHANNELS: { key: string; label: string }[] = [
  { key: "warm_outreach", label: "Warm outreach" },
  { key: "cold_outreach", label: "Cold outreach" },
  { key: "content", label: "Content" },
  { key: "paid_ads", label: "Paid ads" },
];

export default async function LeadsPage() {
  const user = await requirePermission("gtm.leads.read");
  const plays = await getLeadPlays();
  const canGenerate = hasPermission(user.roles, "gtm.leads.write");

  const byChannel = new Map<string, LeadPlayRow[]>();
  for (const play of plays) {
    const list = byChannel.get(play.channel) ?? [];
    list.push(play);
    byChannel.set(play.channel, list);
  }

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">gtm.leads.read</p>
          <h1 className="portal-title">Lead engine</h1>
        </div>
        {canGenerate ? (
          <form action={generateLeadPlays}>
            <button className="portal-primary-button inline-flex items-center gap-2" type="submit">
              <Sparkles size={16} />
              Generate plays
            </button>
          </form>
        ) : null}
      </section>

      <p className="portal-muted max-w-prose">
        Core Four lead-gen plays for PAM landlords, with the MTD deadline as the hook. These are
        demand-gen strategies, not contact records — real sourced leads land here once a lead data
        source is connected.
      </p>

      {plays.length === 0 ? (
        <div className="portal-panel">
          <div className="flex items-center gap-3">
            <Magnet className="text-[#71806a]" size={20} />
            <p className="portal-muted">
              No lead plays yet. {canGenerate ? "Generate plays to design the engine." : "The Lead Finder runs weekly."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {CHANNELS.map((channel) => {
            const channelPlays = byChannel.get(channel.key) ?? [];
            return (
              <div className="portal-panel" key={channel.key}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="portal-section-title">{channel.label}</h2>
                  <span className="portal-muted text-xs">{channelPlays.length}</span>
                </div>
                {channelPlays.length ? (
                  <div className="space-y-4">
                    {channelPlays.map((play) => (
                      <PlayCard key={play.id} play={play} />
                    ))}
                  </div>
                ) : (
                  <p className="portal-muted text-sm">No plays in this channel yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayCard({ play }: { play: LeadPlayRow }) {
  return (
    <div className="rounded-lg border border-[#dfe5d8] bg-[#fbfcf7] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{play.title}</p>
        <span className="shrink-0 font-semibold">
          {play.priority_score ?? 0}
          <span className="portal-muted text-xs font-normal">/100</span>
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <Field label="Audience" value={play.audience} />
        <Field label="Hook" value={play.hook} />
        <Field label="Lead magnet" value={play.lead_magnet} />
        <Field label="First action" value={play.first_action} />
      </dl>
      <p className="portal-muted mt-3 text-xs uppercase">{play.status}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[#64715d]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
