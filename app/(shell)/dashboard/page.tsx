import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { getSystemStatus } from "@/lib/dashboard-data";
import { getReadableModules } from "@/lib/rbac/permissions";
import { requireUser } from "@/lib/rbac/guard";

const statusTone = {
  ok: "text-[#28734d]",
  warning: "text-[#9f6a00]",
  error: "text-[#b42318]",
  idle: "text-[#697567]",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const readableModules = getReadableModules(user.roles);
  const statuses = await getSystemStatus(readableModules);
  const attention = statuses.flatMap((row) =>
    Array.isArray(row.needs_attention) ? row.needs_attention : [],
  );

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Cross-module status spine</p>
          <h1 className="portal-title">Operating dashboard</h1>
        </div>
        <div className="portal-deadline">
          <span>MTD wedge date</span>
          <strong>7 Aug 2026</strong>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visible modules" value={readableModules.length} />
        <MetricCard label="Subsystems reporting" value={statuses.length} />
        <MetricCard label="Needs attention" value={attention.length} />
      </section>

      <section className="portal-panel">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="portal-section-title">System status</h2>
            <p className="portal-muted">
              One shared table, filtered by the permissions attached to your roles.
            </p>
          </div>
          <Clock3 className="text-[#71806a]" size={20} />
        </div>

        {statuses.length ? (
          <div className="divide-y divide-[#dfe5d8]">
            {statuses.map((row) => (
              <div className="grid gap-3 py-4 md:grid-cols-[1fr_140px_180px]" key={row.id}>
                <div>
                  <p className="font-medium">
                    {row.module.toUpperCase()} / {row.subsystem}
                    {row.product ? ` / ${row.product}` : ""}
                  </p>
                  <p className="portal-muted">{row.headline ?? "No headline recorded"}</p>
                </div>
                <p className={`flex items-center gap-2 font-medium ${statusTone[row.status]}`}>
                  {row.status === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {row.status}
                </p>
                <p className="portal-muted">
                  {row.last_run_at
                    ? new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(row.last_run_at))
                    : "Not run yet"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No status rows yet" body="Run a cron route after Supabase is configured and subsystem cards will appear here." />
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="portal-panel">
      <p className="portal-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-[#c6d0bc] bg-[#f8faf4] p-6">
      <p className="font-medium">{title}</p>
      <p className="portal-muted mt-1">{body}</p>
    </div>
  );
}
