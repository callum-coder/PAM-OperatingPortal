import { getCompetitorWatches } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { CompetitorWatchForm } from "../subsystem-forms";

export default async function CompetitorsPage() {
  await requirePermission("gtm.competitors.read");
  const watches = await getCompetitorWatches();

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">gtm.competitors.read</p>
          <h1 className="portal-title">Competitor monitor</h1>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <CompetitorWatchForm />
        <div className="portal-panel">
          <h2 className="portal-section-title">Watchlist</h2>
          <div className="mt-4 divide-y divide-[#dfe5d8]">
            {watches.length ? watches.map((watch) => (
              <div className="grid gap-2 py-4 md:grid-cols-[1fr_120px]" key={watch.id}>
                <div>
                  <p className="font-medium">{watch.competitor}</p>
                  <p className="portal-muted break-all">{watch.url}</p>
                </div>
                <p className="portal-muted uppercase">{watch.watch_type}</p>
              </div>
            )) : (
              <p className="portal-muted">No competitor watches yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
