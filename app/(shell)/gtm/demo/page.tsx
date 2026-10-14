import Link from "next/link";
import { MessageSquare } from "lucide-react";

import {
  classifyThread,
  demoStageLabel,
  groupThreads,
  humanAge,
  threadTitle,
  truncate,
  type ThreadState,
} from "@/lib/gtm/demo-threads";
import { readPamDemoThreads } from "@/lib/gtm/pam-readonly";
import { requirePermission } from "@/lib/rbac/guard";

export const dynamic = "force-dynamic";

const PILL: Record<ThreadState, string> = {
  broken: "bg-[#fde8e8] text-[#8a1f1f]",
  quiet: "bg-[#fff3d6] text-[#7a4b00]",
  waiting_on_pam: "bg-[#e7f0ff] text-[#1f3d8a]",
  active: "bg-[#e7f0ff] text-[#1f3d8a]",
  waiting_on_visitor: "bg-[#eef3e8] text-[#2f4a2a]",
  converted: "bg-[#d9ff73] text-[#162016]",
  expired: "bg-[#eceeea] text-[#64715d]",
  never_started: "bg-[#eceeea] text-[#64715d]",
};

export default async function DemoThreadsPage() {
  await requirePermission("gtm.briefs.read");
  const threads = await readPamDemoThreads();
  const now = new Date();
  const groups = threads ? groupThreads(threads, now) : [];
  const attention = threads ? threads.filter((t) => classifyThread(t, now).needsAttention).length : 0;

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">WhatsApp demo · +44 7868 264023</p>
          <h1 className="portal-title">Demo threads</h1>
          <p className="portal-muted mt-2 max-w-2xl">
            Every conversation on the demo line, read as the visitor saw it on their phone. Numbers are masked to their last four digits.
            A thread is flagged when PAM stopped replying, a send failed, a scripted beat did not run, or the visitor went quiet and nothing follows up.
          </p>
        </div>
        {threads ? (
          <div className="portal-deadline">
            <span>Need attention</span>
            <strong>{attention}</strong>
          </div>
        ) : null}
      </section>

      {threads === null ? (
        <section className="portal-panel">
          <h2 className="portal-section-title">Demo threads not connected</h2>
          <p className="portal-muted mt-2">
            The read-only connection is up for the funnel but the thread views are missing. Run PAM <code>migration-060-demo-thread-views.sql</code> in
            the pam-portal SQL editor (it grants to <code>pam_portal_readonly</code>), then reload.
          </p>
        </section>
      ) : threads.length === 0 ? (
        <section className="portal-panel">
          <h2 className="portal-section-title">No conversations yet</h2>
          <p className="portal-muted mt-2">Nobody has messaged the demo number. The first one will appear here within a minute of their first message.</p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.title} className="portal-panel">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="portal-section-title">{group.title}</h2>
              <span className="portal-muted text-sm">{group.items.length}</span>
            </div>
            <ul className="divide-y divide-[#e4e9df]">
              {group.items.map(({ thread, verdict }) => (
                <li key={thread.sandboxId}>
                  <Link
                    href={`/gtm/demo/${thread.sandboxId}`}
                    className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-3 transition hover:bg-[#f4f7ef] md:flex-row md:items-start md:gap-6"
                  >
                    <div className="flex min-w-[11rem] items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1b2419] text-[#d9ff73]">
                        <MessageSquare size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-[#162016]">{threadTitle(thread)}</p>
                        <p className="text-xs text-[#71806a]">
                          {thread.actingAs === "tenant" ? "Playing the tenant" : "Playing the landlord"} · {thread.inboundCount} in / {thread.outboundCount} out
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL[verdict.state]}`}>{verdict.label}</span>
                        <span className="text-xs text-[#71806a]">{demoStageLabel(thread.jobStatus)}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#2f3a2c]">{verdict.detail}</p>
                      {thread.lastBody ? (
                        <p className="mt-1 truncate text-sm text-[#64715d]">
                          <span className="font-medium">{thread.lastDirection === "inbound" ? "Visitor" : "PAM"}:</span> {truncate(thread.lastBody, 110)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-[#71806a] md:min-w-[7rem]">
                      <p>{thread.lastMessageAt ? humanAge(now.getTime() - Date.parse(thread.lastMessageAt)) : "no messages"}</p>
                      <p>started {humanAge(now.getTime() - Date.parse(thread.startedAt))}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
