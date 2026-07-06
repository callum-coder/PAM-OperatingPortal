import { CheckCircle2, Plug, TriangleAlert } from "lucide-react";

import { getIntegrationHealth, type IntegrationHealthRow, type IntegrationStatus } from "@/lib/integrations";
import { productLabel } from "@/lib/products";
import { requireUser } from "@/lib/rbac/guard";

const statusStyles: Record<IntegrationStatus, string> = {
  connected: "text-[#28734d]",
  degraded: "text-[#9f6a00]",
  missing: "text-[#b42318]",
  planned: "text-[#697567]",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function IntegrationsPage() {
  await requireUser();
  const integrations = await getIntegrationHealth();
  const connected = integrations.filter((integration) => integration.status === "connected").length;
  const missing = integrations.filter((integration) => integration.status === "missing").length;

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Data and action layer</p>
          <h1 className="portal-title">Integrations</h1>
        </div>
        <div className="portal-deadline">
          <span>Connected</span>
          <strong>
            {connected} / {integrations.length}
          </strong>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Connected" value={connected} />
        <MetricCard label="Missing" value={missing} />
        <MetricCard label="Tracked" value={integrations.length} />
      </section>

      <section className="portal-panel">
        <div className="mb-4 flex items-center gap-2">
          <Plug className="text-[#71806a]" size={18} />
          <h2 className="portal-section-title">Connection health</h2>
        </div>
        <div className="divide-y divide-[#dfe5d8]">
          {integrations.map((integration) => (
            <IntegrationRow integration={integration} key={integration.key} />
          ))}
        </div>
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

function IntegrationRow({ integration }: { integration: IntegrationHealthRow }) {
  const Icon = integration.status === "connected" ? CheckCircle2 : TriangleAlert;

  return (
    <div className="grid gap-3 py-4 md:grid-cols-[1fr_150px_200px]">
      <div>
        <div className="flex items-center gap-2">
          <Icon className={statusStyles[integration.status]} size={16} />
          <p className="font-medium">{integration.name}</p>
        </div>
        <p className="portal-muted mt-1">{integration.notes ?? "No integration notes recorded."}</p>
        {integration.env_keys?.length ? (
          <p className="portal-muted mt-2 text-xs">{integration.env_keys.join(", ")}</p>
        ) : null}
      </div>
      <div>
        <p className="portal-muted text-xs uppercase">{integration.category}</p>
        <p className="text-sm">{productLabel(integration.product)}</p>
      </div>
      <div>
        <p className={`font-medium ${statusStyles[integration.status]}`}>{integration.status}</p>
        <p className="portal-muted text-xs">Last checked {formatWhen(integration.last_checked_at)}</p>
        {integration.last_error ? <p className="mt-1 text-xs text-[#b42318]">{integration.last_error}</p> : null}
      </div>
    </div>
  );
}
