import Link from "next/link";
import { Bot, ClipboardList, Clock, Network, Play } from "lucide-react";

import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { listAgents } from "@/lib/gtm/agents/registry";
import { getAiTeamSnapshot, type AgentRunRow } from "@/lib/gtm/agents/agent-data";
import type { AgentDefinition, AgentStatus } from "@/lib/gtm/agents/types";
import { runContentAgentNow } from "./actions";

const AGENT_STATUS_STYLES: Record<AgentStatus, string> = {
  active: "bg-[#eef8f1] text-[#2c7b45]",
  planned: "bg-[#f5faff] text-[#4b5f7a]",
  paused: "bg-[#fff4df] text-[#8a621b]",
};

const RUN_STATUS_STYLES: Record<string, string> = {
  ok: "bg-[#eef8f1] text-[#2c7b45]",
  error: "bg-[#fff0f0] text-[#9d3535]",
  skipped: "bg-[#fff4df] text-[#8a621b]",
  warning: "bg-[#fff4df] text-[#8a621b]",
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function AiTeamPage() {
  const user = await requirePermission("gtm.briefs.read");
  const agents = listAgents();
  const { runsByAgent, latestRunByAgent } = await getAiTeamSnapshot();
  const canRun = hasPermission(user.roles, "gtm.content.write");

  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  const head = agents.find((agent) => agent.reportsTo === null);
  const reports = agents.filter((agent) => agent.reportsTo !== null);

  const activeCount = agents.filter((agent) => agent.status === "active").length;

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Agent OS</p>
          <h1 className="portal-title">AI Team</h1>
          <p className="portal-muted mt-4 max-w-2xl text-lg">
            A compact roster of the agents running the GTM operating loop.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="portal-muted">
            {agents.length} agents · {activeCount} active
          </p>
          {hasPermission(user.roles, "gtm.ai_work_items.read") ? (
            <Link className="portal-nav-link inline-flex w-auto" href="/ai-team/work-items">
              <ClipboardList size={16} />
              Work items
            </Link>
          ) : null}
        </div>
      </section>

      <section className="portal-hero-card p-5 lg:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="portal-kicker">Reporting structure</p>
            <h2 className="portal-section-title">Roster</h2>
          </div>
          <Network className="text-[#4b7fd8]" size={20} />
        </div>

        {head ? (
          <div className="space-y-4">
            <AgentCard
              agent={head}
              managerName={null}
              latestRun={latestRunByAgent[head.id]}
              runs={runsByAgent[head.id] ?? []}
              canRun={canRun}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  managerName={agent.reportsTo ? agentsById.get(agent.reportsTo)?.name ?? null : null}
                  latestRun={latestRunByAgent[agent.id]}
                  runs={runsByAgent[agent.id] ?? []}
                  canRun={canRun}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="portal-muted">No agents registered.</p>
        )}
      </section>
    </div>
  );
}

function AgentCard({
  agent,
  managerName,
  latestRun,
  runs,
  canRun,
}: {
  agent: AgentDefinition;
  managerName: string | null;
  latestRun: AgentRunRow | undefined;
  runs: AgentRunRow[];
  canRun: boolean;
}) {
  const showRunButton = canRun && agent.status === "active" && agent.id === "content-strategist";

  return (
    <div className="rounded-3xl border border-[#dceaf8] bg-white p-5 shadow-[0_16px_40px_rgb(84_117_156/0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-2xl border border-[#dceaf8] bg-[#f5faff] text-[#4b7fd8]">
            <Bot size={18} />
          </span>
          <div>
            <Link className="font-medium text-[#202226] hover:underline" href={`/ai-team/${agent.id}`}>
              {agent.name}
            </Link>
            <p className="portal-muted">{agent.role}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${AGENT_STATUS_STYLES[agent.status]}`}
        >
          {agent.status}
        </span>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4d535c]">{agent.description}</p>

      <dl className="mt-4 grid gap-2 text-sm">
        <Meta label="Reports to" value={managerName ?? "—"} />
        <Meta
          label="Schedule"
          value={agent.schedule ? `cron · ${agent.schedule}` : "manual / on-demand"}
        />
      </dl>

      <div className="mt-4 border-t border-[#dceaf8] pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="text-[#4b7fd8]" size={14} />
          <p className="text-xs font-semibold uppercase text-[#7b8491]">Last run</p>
        </div>
        {latestRun ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                  RUN_STATUS_STYLES[latestRun.status] ?? "bg-[#f5faff] text-[#4b5f7a]"
                }`}
              >
                {latestRun.status}
              </span>
              <span className="portal-muted">{formatWhen(latestRun.finished_at ?? latestRun.created_at)}</span>
            </div>
            <p className="line-clamp-2 text-sm">{latestRun.summary ?? latestRun.error ?? "—"}</p>
            {latestRun.input_tokens !== null || latestRun.output_tokens !== null ? (
              <p className="portal-muted text-xs">
                {latestRun.input_tokens ?? 0} in / {latestRun.output_tokens ?? 0} out tokens
              </p>
            ) : null}
          </div>
        ) : (
          <p className="portal-muted">No runs recorded yet.</p>
        )}

        {runs.length > 1 ? (
          <div className="mt-3 space-y-1">
            {runs.slice(1, 4).map((run) => (
              <div className="flex items-center justify-between gap-3 text-xs" key={run.id}>
                <span className="portal-muted">{formatWhen(run.finished_at ?? run.created_at)}</span>
                <span className="text-[#7b8491]">
                  {run.status}
                  {run.items_created ? ` · ${run.items_created} new` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showRunButton ? (
        <form action={runContentAgentNow} className="mt-4">
          <button className="portal-secondary-button inline-flex items-center gap-2" type="submit">
            <Play size={14} />
            Run now
          </button>
        </form>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[#7b8491]">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}
