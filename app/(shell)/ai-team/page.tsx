import Link from "next/link";
import { Bot, Clock, Network, Play } from "lucide-react";

import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { listAgents } from "@/lib/gtm/agents/registry";
import { getAiTeamSnapshot, type AgentRunRow } from "@/lib/gtm/agents/agent-data";
import type { AgentDefinition, AgentStatus } from "@/lib/gtm/agents/types";
import { runContentAgentNow } from "./actions";

const AGENT_STATUS_STYLES: Record<AgentStatus, string> = {
  active: "bg-[#e6f4d8] text-[#3f5a23]",
  planned: "bg-[#eceee8] text-[#5f6d58]",
  paused: "bg-[#f2ecd5] text-[#6b5d22]",
};

const RUN_STATUS_STYLES: Record<string, string> = {
  ok: "bg-[#e6f4d8] text-[#3f5a23]",
  error: "bg-[#f7dada] text-[#7a2a2a]",
  skipped: "bg-[#f2ecd5] text-[#6b5d22]",
  warning: "bg-[#f2ecd5] text-[#6b5d22]",
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
          <p className="portal-kicker">Operating layer</p>
          <h1 className="portal-title">AI Team</h1>
        </div>
        <p className="portal-muted">
          {agents.length} agents · {activeCount} active
        </p>
      </section>

      <section className="portal-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="portal-kicker">Reporting structure</p>
            <h2 className="portal-section-title">Org chart</h2>
          </div>
          <Network className="text-[#71806a]" size={20} />
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
            <div className="grid gap-4 lg:grid-cols-2">
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
    <div className="rounded-lg border border-[#dfe5d8] bg-[#fbfcf7] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-[#162016] text-[#d9ff73]">
            <Bot size={18} />
          </span>
          <div>
            <Link className="font-semibold hover:underline" href={`/ai-team/${agent.id}`}>
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

      <p className="mt-3 text-sm leading-6">{agent.description}</p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Meta label="Reports to" value={managerName ?? "—"} />
        <Meta label="Model" value={agent.model ?? "default synthesis model"} />
        <Meta
          label="Schedule"
          value={agent.schedule ? `cron · ${agent.schedule}` : "manual / on-demand"}
        />
        <Meta label="Writes" value={agent.outputs.join(", ")} />
      </dl>

      <div className="mt-4 border-t border-[#dfe5d8] pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="text-[#71806a]" size={14} />
          <p className="text-xs font-semibold uppercase text-[#64715d]">Last run</p>
        </div>
        {latestRun ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                  RUN_STATUS_STYLES[latestRun.status] ?? "bg-[#eceee8] text-[#5f6d58]"
                }`}
              >
                {latestRun.status}
              </span>
              <span className="portal-muted">{formatWhen(latestRun.finished_at ?? latestRun.created_at)}</span>
            </div>
            <p className="text-sm">{latestRun.summary ?? latestRun.error ?? "—"}</p>
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
                <span className="text-[#64715d]">
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
      <dt className="text-xs font-semibold uppercase text-[#64715d]">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}
