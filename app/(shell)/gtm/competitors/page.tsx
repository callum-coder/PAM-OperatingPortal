import { Radar, SearchCheck } from "lucide-react";

import { getCompetitorChanges, getCompetitorWatches } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { CompetitorWatchForm } from "../subsystem-forms";
import { scanCompetitors } from "../actions";

const SIGNIFICANCE_STYLES: Record<string, string> = {
  high: "bg-[#fff0f0] text-[#9d3535]",
  medium: "bg-[#fff4df] text-[#8a621b]",
  low: "bg-[#f5faff] text-[#4b5f7a]",
};

const MONITORING_STRATEGY = [
  {
    title: "Pricing and packaging",
    detail: "Track plan pages, trial terms, discounts, and feature gates. This tells us how competitors are selling value.",
  },
  {
    title: "Positioning shifts",
    detail: "Track homepages, comparison pages, and landlord-specific copy. This catches changes in who they are targeting.",
  },
  {
    title: "Product proof",
    detail: "Track changelogs, case studies, reviews, and release notes. This surfaces features and claims worth responding to.",
  },
];

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function CompetitorsPage() {
  const user = await requirePermission("gtm.competitors.read");
  const [watches, changes] = await Promise.all([getCompetitorWatches(), getCompetitorChanges()]);
  const canScan = hasPermission(user.roles, "gtm.competitors.write");

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Market intelligence</p>
          <h1 className="portal-title">Competitor monitor</h1>
          <p className="portal-muted mt-4 max-w-2xl text-lg">
            Monitor the few signals that change GTM decisions, not every page on the internet.
          </p>
        </div>
        {canScan ? (
          <form action={scanCompetitors}>
            <button className="portal-primary-button inline-flex items-center gap-2" type="submit">
              <Radar size={16} />
              Scan now
            </button>
          </form>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {MONITORING_STRATEGY.map((item) => (
          <div className="portal-panel" key={item.title}>
            <div className="mb-4 flex size-10 items-center justify-center rounded-2xl border border-[#dceaf8] bg-[#f5faff] text-[#4b7fd8]">
              <SearchCheck size={18} />
            </div>
            <h2 className="portal-section-title text-lg">{item.title}</h2>
            <p className="portal-muted mt-2">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <CompetitorWatchForm />
        <div className="portal-panel">
          <h2 className="portal-section-title">Watchlist</h2>
          <div className="mt-4 divide-y divide-[#dceaf8]">
            {watches.length ? watches.map((watch) => (
              <div className="grid gap-2 py-4 md:grid-cols-[1fr_150px]" key={watch.id}>
                <div>
                  <p className="font-medium">{watch.competitor}</p>
                  <p className="portal-muted break-all">{watch.url}</p>
                </div>
                <div>
                  <p className="portal-muted uppercase">{watch.watch_type}</p>
                  <p className="portal-muted text-xs">
                    {watch.last_checked_at ? `checked ${formatWhen(watch.last_checked_at)}` : "not yet checked"}
                  </p>
                </div>
              </div>
            )) : (
              <p className="portal-muted">No competitor watches yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="portal-panel">
        <h2 className="portal-section-title">Detected changes</h2>
        <div className="mt-4 space-y-4">
          {changes.length ? changes.map((change) => (
            <div className="border-t border-[#dceaf8] pt-4 first:border-t-0 first:pt-0" key={change.id}>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                    SIGNIFICANCE_STYLES[change.significance ?? "low"] ?? "bg-[#eceee8] text-[#5f6d58]"
                  }`}
                >
                  {change.significance ?? "low"}
                </span>
                <p className="font-medium">{change.competitor}</p>
                <span className="portal-muted text-xs uppercase">{change.watch_type}</span>
                <span className="portal-muted ml-auto text-xs">{formatWhen(change.detected_at)}</span>
              </div>
              {change.diff_summary ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{change.diff_summary}</p>
              ) : null}
            </div>
          )) : (
            <p className="portal-muted">
              No changes detected yet. The Scout baselines each page on its first scan, then reports
              real changes on the next.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
