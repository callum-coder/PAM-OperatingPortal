import { getBriefActionsByBrief, getLatestGtmBriefs } from "@/lib/gtm/briefs-data";
import { requirePermission } from "@/lib/rbac/guard";

const ACTION_STYLES: Record<string, string> = {
  recommended: "bg-[#d0f5ee] text-[#0a6648]",
  warning: "bg-[#fee2e2] text-[#b42318]",
  observation: "bg-[#eef0f4] text-[#5b6472]",
  follow_up: "bg-[#dbe7f4] text-[#2a4a6b]",
};

export default async function BriefsPage() {
  await requirePermission("gtm.briefs.read");
  const briefs = await getLatestGtmBriefs();
  const actionsByBrief = await getBriefActionsByBrief(briefs.map((brief) => brief.id));

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">GTM · Weekly briefs</p>
          <h1 className="portal-title">Weekly briefs</h1>
        </div>
      </section>

      <section className="portal-panel">
        <p className="portal-muted max-w-3xl">
          Every Monday the Brief Analyst synthesises the week: the trial → paid funnel,
          week-over-week movement, targets, and PAM metrics — then extracts the actions below.
          Actions also land in the signal inbox on the GTM control room.
        </p>
      </section>

      {briefs.length ? (
        <section className="space-y-4">
          {briefs.map((brief) => {
            const actions = actionsByBrief[brief.id] ?? [];
            return (
              <article className="portal-panel" key={brief.id}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
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

                <p className="max-w-4xl text-base leading-7 text-[#1a1a2e]">{brief.narrative}</p>

                {actions.length ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs font-semibold uppercase text-[#5b6472]">Actions</p>
                    {actions.map((action) => (
                      <div className="flex items-start gap-3" key={action.id}>
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                            ACTION_STYLES[action.action_type] ?? "bg-[#eef0f4] text-[#5b6472]"
                          }`}
                        >
                          {action.action_type}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{action.title}</p>
                          {action.detail ? (
                            <p className="portal-muted text-sm">{action.detail}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <details className="mt-5">
                  <summary className="cursor-pointer text-xs font-semibold uppercase text-[#5b6472]">
                    Raw metrics
                  </summary>
                  <pre className="mt-2 overflow-auto border border-[#e6e8ef] bg-[#ffffff] p-4 text-xs text-[#1a1a2e]">
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
