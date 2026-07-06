import { getBriefActionsByBrief, getLatestGtmBriefs } from "@/lib/gtm/briefs-data";
import { requirePermission } from "@/lib/rbac/guard";

const ACTION_STYLES: Record<string, string> = {
  recommended: "bg-[#eef8f1] text-[#2c7b45]",
  warning: "bg-[#fff4df] text-[#8a621b]",
  observation: "bg-[#f5faff] text-[#4b5f7a]",
  follow_up: "bg-[#edf5ff] text-[#315f9d]",
};

export default async function BriefsPage() {
  await requirePermission("gtm.briefs.read");
  const briefs = await getLatestGtmBriefs();
  const actionsByBrief = await getBriefActionsByBrief(briefs.map((brief) => brief.id));

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Brief Analyst</p>
          <h1 className="portal-title">Weekly briefs</h1>
          <p className="portal-muted mt-4 max-w-2xl text-lg">
            A concise weekly readout: movement, decisions, and the few actions that matter.
          </p>
        </div>
      </section>

      {briefs.length ? (
        <section className="space-y-3">
          {briefs.map((brief) => {
            const actions = actionsByBrief[brief.id] ?? [];
            return (
              <article className="portal-panel" key={brief.id}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#dceaf8] pb-4">
                  <div>
                    <p className="portal-kicker">{brief.product}</p>
                    <h2 className="portal-section-title">
                      {brief.period_start ?? "Unknown"} to {brief.period_end ?? "Unknown"}
                    </h2>
                  </div>
                  <p className="portal-muted">
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(brief.created_at))}
                  </p>
                </div>

                <p className="max-w-4xl text-base leading-7 text-[#202226]">{brief.narrative}</p>

                {actions.length ? (
                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {actions.slice(0, 4).map((action) => (
                      <div className="rounded-2xl border border-[#dceaf8] bg-white p-4" key={action.id}>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                            ACTION_STYLES[action.action_type] ?? "bg-[#eceee8] text-[#5f6d58]"
                          }`}
                        >
                          {action.action_type}
                        </span>
                        <div className="mt-3">
                          <p className="text-sm font-medium text-[#202226]">{action.title}</p>
                          {action.detail ? (
                            <p className="portal-muted text-sm">{action.detail}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <details className="mt-5">
                  <summary className="cursor-pointer text-xs font-semibold uppercase text-[#7b8491]">
                    Raw metrics
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-2xl border border-[#dceaf8] bg-[#f8fbff] p-4 text-xs text-[#202226]">
                    {JSON.stringify(brief.raw_metrics, null, 2)}
                  </pre>
                </details>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="portal-panel">
          <h2 className="portal-section-title">No briefs yet</h2>
          <p className="portal-muted mt-2">
            The first brief generates on the Monday cron (or run /api/cron/briefs manually). It
            needs the PAM read-only Postgres URL to be configured.
          </p>
        </section>
      )}
    </div>
  );
}
