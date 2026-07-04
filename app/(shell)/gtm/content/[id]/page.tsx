import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getContentItem } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { draftContentItem, saveContentDraft, setContentStage } from "../../actions";

const STAGE_STYLES: Record<string, string> = {
  idea: "bg-[#eceee8] text-[#5f6d58]",
  drafting: "bg-[#f2ecd5] text-[#6b5d22]",
  review: "bg-[#f2ecd5] text-[#6b5d22]",
  scheduled: "bg-[#dbe7f4] text-[#2a4a6b]",
  published: "bg-[#e6f4d8] text-[#3f5a23]",
  parked: "bg-[#eceee8] text-[#5f6d58]",
};

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("gtm.content.read");
  const item = await getContentItem(id);

  if (!item) {
    notFound();
  }

  const canWrite = hasPermission(user.roles, "gtm.content.write");
  const stage = item.stage ?? "idea";

  return (
    <div className="space-y-6">
      <Link className="portal-nav-link inline-flex w-auto" href="/gtm/content">
        <ArrowLeft size={16} />
        Content pipeline
      </Link>

      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Content item</p>
          <h1 className="portal-title">{item.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              STAGE_STYLES[stage] ?? "bg-[#eceee8] text-[#5f6d58]"
            }`}
          >
            {stage}
          </span>
          <span className="font-semibold">
            {item.priority_score ?? 0}
            <span className="portal-muted text-xs font-normal">/100</span>
          </span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="portal-panel">
          <h2 className="portal-section-title">Draft</h2>
          {item.draft ? (
            <article className="mt-4 max-w-prose">
              <DraftView markdown={item.draft} />
            </article>
          ) : (
            <p className="portal-muted mt-4">
              No draft yet. {stage === "idea" ? "Hand it to the Content Writer to draft." : ""}
            </p>
          )}

          {canWrite && item.draft ? (
            <form action={saveContentDraft} className="mt-6 space-y-2">
              <input name="item_id" type="hidden" value={item.id} />
              <label className="text-xs font-semibold uppercase text-[#64715d]" htmlFor="draft">
                Edit draft (markdown)
              </label>
              <textarea
                className="portal-input min-h-64 font-mono text-sm"
                defaultValue={item.draft}
                id="draft"
                name="draft"
              />
              <button className="portal-secondary-button" type="submit">
                Save draft
              </button>
            </form>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="portal-panel">
            <h2 className="portal-section-title">Strategist brief</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Meta label="Target keyword" value={item.target_keyword ?? "—"} />
              <Meta label="Offer mechanic" value={item.conversion_path ?? "—"} />
              {item.scheduled_for ? <Meta label="Scheduled for" value={item.scheduled_for} /> : null}
              {item.published_url ? <Meta label="Published" value={item.published_url} /> : null}
            </dl>
            {item.notes ? (
              <pre className="portal-muted mt-3 whitespace-pre-wrap break-words text-sm">
                {item.notes}
              </pre>
            ) : null}
          </div>

          {canWrite ? <StageControls itemId={item.id} stage={stage} hasDraft={Boolean(item.draft)} /> : null}
        </div>
      </section>
    </div>
  );
}

function StageControls({
  itemId,
  stage,
  hasDraft,
}: {
  itemId: string;
  stage: string;
  hasDraft: boolean;
}) {
  return (
    <div className="portal-panel">
      <h2 className="portal-section-title">Pipeline</h2>
      <div className="mt-4 space-y-3">
        {stage === "idea" ? (
          <form action={draftContentItem}>
            <input name="item_id" type="hidden" value={itemId} />
            <button className="portal-primary-button w-full" type="submit">
              Draft with Content Writer
            </button>
          </form>
        ) : null}

        {hasDraft && (stage === "review" || stage === "idea") ? (
          <form action={draftContentItem}>
            <input name="item_id" type="hidden" value={itemId} />
            <button className="portal-secondary-button w-full" type="submit">
              Regenerate draft
            </button>
          </form>
        ) : null}

        {stage === "review" ? (
          <>
            <form action={setContentStage} className="space-y-2">
              <input name="item_id" type="hidden" value={itemId} />
              <input name="stage" type="hidden" value="scheduled" />
              <input className="portal-input" name="scheduled_for" type="date" />
              <button className="portal-primary-button w-full" type="submit">
                Approve &amp; schedule
              </button>
            </form>
            <StageButton itemId={itemId} stage="idea" label="Send back to idea" />
          </>
        ) : null}

        {stage === "scheduled" ? (
          <>
            <form action={setContentStage} className="space-y-2">
              <input name="item_id" type="hidden" value={itemId} />
              <input name="stage" type="hidden" value="published" />
              <input
                className="portal-input"
                name="published_url"
                placeholder="Published URL (optional)"
                type="url"
              />
              <button className="portal-primary-button w-full" type="submit">
                Mark published
              </button>
            </form>
            <StageButton itemId={itemId} stage="review" label="Back to review" />
          </>
        ) : null}

        {stage === "published" ? (
          <p className="portal-muted">Published. Pipeline complete.</p>
        ) : null}

        {stage === "parked" ? (
          <StageButton itemId={itemId} stage="idea" label="Revive as idea" />
        ) : stage === "idea" ? (
          <StageButton itemId={itemId} stage="parked" label="Park this idea" />
        ) : null}
      </div>
    </div>
  );
}

function StageButton({ itemId, stage, label }: { itemId: string; stage: string; label: string }) {
  return (
    <form action={setContentStage}>
      <input name="item_id" type="hidden" value={itemId} />
      <input name="stage" type="hidden" value={stage} />
      <button className="portal-secondary-button w-full" type="submit">
        {label}
      </button>
    </form>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[#64715d]">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}

// Minimal, injection-safe markdown renderer for the subset our drafts use
// (headings, paragraphs, horizontal rules, inline bold). Text is rendered as
// React children, never via dangerouslySetInnerHTML.
function DraftView({ markdown }: { markdown: string }) {
  const nodes: ReactNode[] = [];

  markdown.split("\n").forEach((line, index) => {
    const text = line.trim();
    if (!text || /^<!--.*-->$/.test(text)) {
      return;
    }
    if (text === "---" || text === "***") {
      nodes.push(<hr className="my-5 border-[#dfe5d8]" key={index} />);
      return;
    }
    if (text.startsWith("### ")) {
      nodes.push(
        <h3 className="mt-4 text-base font-semibold" key={index}>
          {renderInline(text.slice(4))}
        </h3>,
      );
      return;
    }
    if (text.startsWith("## ")) {
      nodes.push(
        <h2 className="mt-5 text-lg font-semibold" key={index}>
          {renderInline(text.slice(3))}
        </h2>,
      );
      return;
    }
    if (text.startsWith("# ")) {
      nodes.push(
        <h1 className="text-2xl font-semibold" key={index}>
          {renderInline(text.slice(2))}
        </h1>,
      );
      return;
    }
    nodes.push(
      <p className="mt-3 leading-7" key={index}>
        {renderInline(text)}
      </p>,
    );
  });

  return <div>{nodes}</div>;
}

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
