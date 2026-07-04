import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2 } from "lucide-react";

import { getAiWorkItems, type AiWorkItemRow } from "@/lib/gtm/ai-work-items-data";
import { requirePermission } from "@/lib/rbac/guard";

const priorityStyles: Record<AiWorkItemRow["priority"], string> = {
  critical: "bg-[#f7dada] text-[#7a2a2a]",
  high: "bg-[#f2ecd5] text-[#6b5d22]",
  medium: "bg-[#e7eef9] text-[#244d7a]",
  low: "bg-[#eceee8] text-[#5f6d58]",
};

const statusStyles: Record<AiWorkItemRow["status"], string> = {
  needs_review: "bg-[#f2ecd5] text-[#6b5d22]",
  approved: "bg-[#e6f4d8] text-[#3f5a23]",
  in_progress: "bg-[#e7eef9] text-[#244d7a]",
  done: "bg-[#d9ff73] text-[#162016]",
  rejected: "bg-[#eceee8] text-[#5f6d58]",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AiWorkItemsPage() {
  await requirePermission("gtm.ai_work_items.read");
  const items = await getAiWorkItems();
  const needsReview = items.filter((item) => item.status === "needs_review").length;

  return (
    <div className="space-y-6">
      <Link className="portal-nav-link inline-flex w-auto" href="/ai-team">
        <ArrowLeft size={16} />
        AI Team
      </Link>

      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Human-in-the-loop</p>
          <h1 className="portal-title">AI work items</h1>
        </div>
        <div className="portal-deadline">
          <span>Needs review</span>
          <strong>{needsReview}</strong>
        </div>
      </section>

      <section className="portal-panel">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="text-[#71806a]" size={18} />
          <h2 className="portal-section-title">Review queue</h2>
        </div>
        {items.length ? (
          <div className="divide-y divide-[#dfe5d8]">
            {items.map((item) => (
              <WorkItemRow item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-[#71806a]" size={18} />
            <p className="portal-muted">
              No AI work items yet. Agents can write recommendations here with evidence,
              confidence, and a status before anything becomes operator work.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function WorkItemRow({ item }: { item: AiWorkItemRow }) {
  return (
    <div className="grid gap-3 py-4 lg:grid-cols-[130px_1fr_160px]">
      <div className="space-y-2">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${priorityStyles[item.priority]}`}>
          {item.priority}
        </span>
        <span className={`block w-fit rounded-full px-2 py-1 text-xs font-semibold uppercase ${statusStyles[item.status]}`}>
          {item.status.replace("_", " ")}
        </span>
      </div>
      <div>
        <p className="font-medium">{item.title}</p>
        {item.summary ? <p className="portal-muted mt-1">{item.summary}</p> : null}
        {item.recommendation ? <p className="mt-2 text-sm leading-6">{item.recommendation}</p> : null}
      </div>
      <div>
        <p className="portal-muted text-xs uppercase">{item.agent_id}</p>
        <p className="mt-1 text-sm">Confidence {item.confidence ?? "—"}</p>
        <p className="portal-muted text-xs">Created {formatWhen(item.created_at)}</p>
      </div>
    </div>
  );
}
