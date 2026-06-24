import { getLatestGtmBriefs } from "@/lib/gtm/briefs-data";
import { requirePermission } from "@/lib/rbac/guard";

export default async function BriefsPage() {
  await requirePermission("gtm.briefs.read");
  const briefs = await getLatestGtmBriefs();

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">gtm.briefs.read</p>
          <h1 className="portal-title">Weekly briefs</h1>
        </div>
      </section>

      <section className="portal-panel">
        <h2 className="portal-section-title">Latest run</h2>
        <p className="portal-muted mt-2 max-w-3xl">
          The backend now attempts a read-only PAM metric scan, inserts successful
          briefs, and writes warning/error status when PAM access is not ready.
        </p>
      </section>

      {briefs.length ? (
        <section className="space-y-4">
          {briefs.map((brief) => (
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
              <p className="max-w-4xl text-base leading-7 text-[#33402f]">
                {brief.narrative}
              </p>
              <pre className="mt-5 overflow-auto border border-[#d8ded0] bg-[#f8faf4] p-4 text-xs text-[#33402f]">
                {JSON.stringify(brief.raw_metrics, null, 2)}
              </pre>
            </article>
          ))}
        </section>
      ) : (
        <section className="portal-panel">
          <h2 className="portal-section-title">No briefs yet</h2>
          <p className="portal-muted mt-2">
            Run `/api/cron/briefs` after the PAM read-only Postgres URL is set.
            Until then, the dashboard status will explain what configuration is
            missing.
          </p>
        </section>
      )}
    </div>
  );
}
