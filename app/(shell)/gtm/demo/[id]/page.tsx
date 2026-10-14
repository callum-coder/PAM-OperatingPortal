import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  annotateGaps,
  classifyThread,
  demoStageLabel,
  humanAge,
  type DemoThread,
  type ThreadVerdict,
} from "@/lib/gtm/demo-threads";
import { Phone } from "../phone";
import { readPamDemoThread } from "@/lib/gtm/pam-readonly";
import { requirePermission } from "@/lib/rbac/guard";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const full = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function DemoThreadPage({ params }: PageProps) {
  const { id } = await params;
  await requirePermission("gtm.briefs.read");
  const data = await readPamDemoThread(id);
  if (!data) notFound();
  const { thread, messages } = data;
  const now = new Date();
  const verdict = classifyThread(thread, now);
  const items = annotateGaps(messages);

  return (
    <div className="space-y-6">
      <Link className="portal-nav-link inline-flex w-auto" href="/gtm/demo">
        <ArrowLeft size={16} />
        All demo threads
      </Link>

      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">WhatsApp demo · visitor ••• {thread.phoneLast4}</p>
          <h1 className="portal-title">{verdict.label}</h1>
          <p className="portal-muted mt-2 max-w-2xl">{verdict.detail}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
        <Phone thread={thread} items={items} verdict={verdict} />
        <Facts thread={thread} verdict={verdict} now={now} messageCount={messages.length} />
      </div>
    </div>
  );
}

function Facts({ thread, verdict, now, messageCount }: { thread: DemoThread; verdict: ThreadVerdict; now: Date; messageCount: number }) {
  const rows: [string, string][] = [
    ["Stage", demoStageLabel(thread.jobStatus)],
    ["Playing", thread.actingAs === "tenant" ? "the tenant" : "the landlord"],
    ["Messages", `${thread.inboundCount} from the visitor · ${thread.outboundCount} from PAM${thread.failedCount ? ` · ${thread.failedCount} failed` : ""} (${messageCount} on the line)`],
    ["Started", `${full.format(new Date(thread.startedAt))} (${humanAge(now.getTime() - Date.parse(thread.startedAt))})`],
    ["Last message", thread.lastMessageAt ? `${full.format(new Date(thread.lastMessageAt))} (${humanAge(now.getTime() - Date.parse(thread.lastMessageAt))})` : "none"],
    ["Expires", thread.expiresAt ? full.format(new Date(thread.expiresAt)) : "—"],
    ["Signed up", thread.converted ? (thread.convertedAt ? full.format(new Date(thread.convertedAt)) : "yes") : "not yet"],
  ];
  return (
    <div className="space-y-6">
      <section className="portal-panel">
        <p className="portal-kicker">Where it stands</p>
        <h2 className="portal-section-title">{verdict.label}</h2>
        <p className="mt-2 text-sm text-[#2f3a2c]">{verdict.detail}</p>
        <p className="mt-3 text-sm text-[#64715d]">{nextMove(verdict)}</p>
      </section>
      <section className="portal-panel">
        <h2 className="portal-section-title">Facts</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8rem_1fr] gap-3">
              <dt className="text-[#71806a]">{k}</dt>
              <dd className="text-[#162016]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="portal-panel">
        <h2 className="portal-section-title">Reading the phone</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-[#2f3a2c]">
          <li>Green bubbles on the right are the visitor. White on the left is PAM.</li>
          <li>A purple-edged bubble is a mirror: what PAM would have sent to the other side, shown so the visitor sees both halves.</li>
          <li>Blue rows under a bubble are the reply buttons PAM offered.</li>
          <li>An amber ⏱ pill marks a pause over ten minutes. That is usually where a conversation died.</li>
          <li>A red ring is a send that failed; the error is under the time.</li>
        </ul>
      </section>
    </div>
  );
}

function nextMove(v: ThreadVerdict): string {
  switch (v.state) {
    case "broken":
      return v.label === "No reply from PAM"
        ? "Check the WhatsApp webhook logs on Vercel around that time. If the visitor's message reached PAM and nothing came back, it is a bug or a model timeout."
        : v.label === "Beat overdue"
          ? "The maintenance-orchestrator cron (every 5 minutes) should have sent the next scripted line. Check it ran and that the demo job is still pam_managed."
          : "Check the error on the failed bubble. Meta rejects sends outside the 24-hour window unless they use a template.";
    case "quiet":
      return "Today nothing follows a quiet visitor. A next-day template with the sign-up link would be the first unprompted touch PAM has ever sent.";
    case "waiting_on_visitor":
      return "Normal. The scripted repair continues when the visitor replies.";
    case "active":
      return "The scripted repair is mid-flight; the next line goes out on the orchestrator cron.";
    case "waiting_on_pam":
      return "Give it a minute. If it is still here on reload, treat it as broken.";
    case "converted":
      return "This visitor has a real account now. Their trial starts from that sign-up date.";
    case "expired":
      return "The sandbox is past its 14 days and the nightly cleanup will delete it. No message went out before expiry.";
    case "never_started":
      return "A seeded sandbox with no traffic. Review sandboxes look like this.";
  }
}
