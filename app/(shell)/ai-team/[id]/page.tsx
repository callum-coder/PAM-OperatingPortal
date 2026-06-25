import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, MessageSquare } from "lucide-react";

import { requirePermission } from "@/lib/rbac/guard";
import { listAgents } from "@/lib/gtm/agents/registry";
import {
  getAgentMessages,
  getAgentRunsForAgent,
  type AgentMessageRow,
} from "@/lib/gtm/agents/agent-data";
import type { AgentRunRow } from "@/lib/gtm/agents/agent-data";

const RUN_STATUS_STYLES: Record<string, string> = {
  ok: "bg-[#e6f4d8] text-[#3f5a23]",
  error: "bg-[#f7dada] text-[#7a2a2a]",
  skipped: "bg-[#f2ecd5] text-[#6b5d22]",
  warning: "bg-[#f2ecd5] text-[#6b5d22]",
  sent: "bg-[#e6f4d8] text-[#3f5a23]",
  failed: "bg-[#f7dada] text-[#7a2a2a]",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("gtm.briefs.read");
  const { id } = await params;
  const agent = listAgents().find((entry) => entry.id === id);

  if (!agent) {
    notFound();
  }

  const [runs, messages] = await Promise.all([
    getAgentRunsForAgent(agent.id),
    getAgentMessages(agent.id),
  ]);

  return (
    <div className="space-y-6">
      <Link className="portal-nav-link inline-flex w-auto" href="/ai-team">
        <ArrowLeft size={16} />
        AI Team
      </Link>

      <section className="portal-page-header">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#162016] text-[#d9ff73]">
            <Bot size={20} />
          </span>
          <div>
            <p className="portal-kicker">{agent.role}</p>
            <h1 className="portal-title">{agent.name}</h1>
          </div>
        </div>
      </section>

      <p className="portal-muted max-w-prose">{agent.description}</p>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="portal-panel">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="text-[#71806a]" size={18} />
            <h2 className="portal-section-title">Messages</h2>
          </div>
          {messages.length ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
            </div>
          ) : (
            <p className="portal-muted">
              No messages yet. This agent posts to Slack when it runs (once a Slack token is set).
            </p>
          )}
        </div>

        <div className="portal-panel">
          <h2 className="portal-section-title">Run history</h2>
          <div className="mt-4 space-y-3">
            {runs.length ? (
              runs.map((run) => <RunItem key={run.id} run={run} />)
            ) : (
              <p className="portal-muted">No runs recorded yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageItem({ message }: { message: AgentMessageRow }) {
  return (
    <div className="border-t border-[#dfe5d8] pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
            RUN_STATUS_STYLES[message.status] ?? "bg-[#eceee8] text-[#5f6d58]"
          }`}
        >
          {message.status}
        </span>
        {message.channel ? <span className="portal-muted text-xs">{message.channel}</span> : null}
        <span className="portal-muted ml-auto text-xs">{formatWhen(message.created_at)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.text}</p>
    </div>
  );
}

function RunItem({ run }: { run: AgentRunRow }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-[#dfe5d8] pt-3 first:border-t-0 first:pt-0">
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
              RUN_STATUS_STYLES[run.status] ?? "bg-[#eceee8] text-[#5f6d58]"
            }`}
          >
            {run.status}
          </span>
          <span className="portal-muted text-xs">{formatWhen(run.finished_at ?? run.created_at)}</span>
        </div>
        <p className="mt-1 text-sm">{run.summary ?? run.error ?? "—"}</p>
      </div>
    </div>
  );
}
