import { getContentItems } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { ContentItemForm } from "../subsystem-forms";

export default async function ContentPage() {
  await requirePermission("gtm.content.read");
  const items = await getContentItems();

  return (
    <div className="space-y-6">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">gtm.content.read</p>
          <h1 className="portal-title">Content pipeline</h1>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ContentItemForm />
        <div className="portal-panel">
          <h2 className="portal-section-title">Priority queue</h2>
          <div className="mt-4 divide-y divide-[#dfe5d8]">
            {items.length ? items.map((item) => (
              <div className="grid gap-2 py-4 md:grid-cols-[1fr_100px_90px]" key={item.id}>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="portal-muted">{item.target_keyword ?? "No keyword"}</p>
                </div>
                <p className="portal-muted uppercase">{item.stage}</p>
                <p className="font-semibold">{item.priority_score ?? 0}</p>
              </div>
            )) : (
              <p className="portal-muted">No content items yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
