import { ShieldAlert } from "lucide-react";

import { getOutreachDrafts, type OutreachDraftRow } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { setOutreachDraftStatus } from "../actions";

const CHANNEL_LABELS: Record<string, string> = {
  warm_outreach: "Warm outreach",
  cold_outreach: "Cold outreach",
  content: "Content",
  paid_ads: "Paid ads",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#f2ecd5] text-[#6b5d22]",
  approved: "bg-[#e6f4d8] text-[#3f5a23]",
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function OutreachPage() {
  const user = await requirePermission("gtm.outreach.read");
  const drafts = await getOutreachDrafts();
  const canManage = hasPermission(user.roles, "gtm.outreach.write");

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">gtm.outreach.read</p>
          <h1 className="portal-title">Outreach loops</h1>
        </div>
      </section>

      <section className="portal-panel">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-[#9f6a00]" size={18} />
          <p className="portal-muted max-w-3xl">
            Draft-only mode. The Outreach Operator writes copy for lead plays (from the Lead engine
            page); a human reviews, personalises the marked slots, and sends manually. Automated
            sending stays behind the readiness gate on the GTM control room.
          </p>
        </div>
      </section>

      <section className="portal-panel">
        <h2 className="portal-section-title">Drafts</h2>
        {drafts.length ? (
          <div className="mt-4 space-y-6">
            {drafts.map((draft) => (
              <DraftCard canManage={canManage} draft={draft} key={draft.id} />
            ))}
          </div>
        ) : (
          <p className="portal-muted mt-3">
            No drafts yet. Open the Lead engine and use &ldquo;Draft outreach&rdquo; on a play to
            generate copy.
          </p>
        )}
      </section>
    </div>
  );
}

function DraftCard({ draft, canManage }: { draft: OutreachDraftRow; canManage: boolean }) {
  return (
    <div className="rounded-lg border border-[#dfe5d8] bg-[#fbfcf7] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
            STATUS_STYLES[draft.status] ?? "bg-[#eceee8] text-[#5f6d58]"
          }`}
        >
          {draft.status}
        </span>
        <span className="text-xs font-semibold uppercase text-[#64715d]">
          {CHANNEL_LABELS[draft.channel] ?? draft.channel}
          {draft.variant ? ` · Variant ${draft.variant}` : ""}
        </span>
        <span className="portal-muted ml-auto text-xs">{formatWhen(draft.created_at)}</span>
      </div>

      {draft.play_title ? (
        <p className="portal-muted mt-2 text-sm">Play: {draft.play_title}</p>
      ) : null}

      {draft.subject ? (
        <p className="mt-3 font-medium">Subject: {draft.subject}</p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{draft.body}</p>

      {draft.personalisation?.length ? (
        <p className="portal-muted mt-3 text-xs">
          Fill before sending: {draft.personalisation.join(" · ")}
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-4 flex gap-2">
          {draft.status !== "approved" ? (
            <form action={setOutreachDraftStatus}>
              <input name="draft_id" type="hidden" value={draft.id} />
              <input name="status" type="hidden" value="approved" />
              <button className="portal-secondary-button" type="submit">
                Approve
              </button>
            </form>
          ) : null}
          <form action={setOutreachDraftStatus}>
            <input name="draft_id" type="hidden" value={draft.id} />
            <input name="status" type="hidden" value="archived" />
            <button className="portal-secondary-button" type="submit">
              Archive
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
