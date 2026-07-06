import { Magnet, MailPlus, Sparkles } from "lucide-react";

import { getLeadPlays, type LeadPlayRow } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { draftOutreachForPlay, generateLeadPlays } from "../actions";

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
  const canDraftOutreach = hasPermission(user.roles, "gtm.outreach.write");

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
          <p className="portal-kicker">Demand generation</p>
          <h1 className="portal-title">Lead engine</h1>
          <p className="portal-muted mt-4 max-w-2xl text-lg">
            Prioritised acquisition plays. Keep this lean: channel, audience, hook, next action.
          </p>
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

      {plays.length === 0 ? (
        <div className="portal-panel">
          <div className="flex items-center gap-3">
            <Magnet className="text-[#4b7fd8]" size={20} />
            <p className="portal-muted">
              No lead plays yet. {canGenerate ? "Generate plays to design the engine." : "The Lead Finder runs weekly."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-4">
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
                      <PlayCard canDraftOutreach={canDraftOutreach} key={play.id} play={play} />
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

function PlayCard({ play, canDraftOutreach }: { play: LeadPlayRow; canDraftOutreach: boolean }) {
  return (
    <div className="rounded-2xl border border-[#dceaf8] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{play.title}</p>
        <span className="shrink-0 text-xl font-medium text-[#202226]">
          {play.priority_score ?? 0}
          <span className="portal-muted text-xs font-normal">/100</span>
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <Field label="Audience" value={play.audience} />
        <Field label="Hook" value={play.hook} />
        <Field label="First action" value={play.first_action} />
      </dl>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="portal-muted text-xs uppercase">{play.status}</p>
        {canDraftOutreach ? (
          <form action={draftOutreachForPlay}>
            <input name="play_id" type="hidden" value={play.id} />
            <button className="portal-secondary-button inline-flex items-center gap-2" type="submit">
              <MailPlus size={14} />
              Draft outreach
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[#7b8491]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
