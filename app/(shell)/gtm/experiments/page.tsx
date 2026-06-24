import { getExperiments } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { ExperimentForm } from "../subsystem-forms";

export default async function ExperimentsPage() {
  await requirePermission("gtm.experiments.read");
  const experiments = await getExperiments();

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">gtm.experiments.read</p>
          <h1 className="portal-title">Experiment loop</h1>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ExperimentForm />
        <div className="portal-panel">
          <h2 className="portal-section-title">Experiment ledger</h2>
          <div className="mt-4 divide-y divide-[#dfe5d8]">
            {experiments.length ? experiments.map((experiment) => (
              <div className="grid gap-2 py-4 md:grid-cols-[1fr_120px]" key={experiment.id}>
                <div>
                  <p className="font-medium">{experiment.name}</p>
                  <p className="portal-muted">
                    {experiment.metric ?? "No metric"} / {experiment.baseline ?? "-"} to {experiment.target ?? "-"}
                  </p>
                </div>
                <p className="portal-muted uppercase">{experiment.status}</p>
              </div>
            )) : (
              <p className="portal-muted">No experiments yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
