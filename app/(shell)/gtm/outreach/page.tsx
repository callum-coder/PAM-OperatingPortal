import { requirePermission } from "@/lib/rbac/guard";

export default async function OutreachPage() {
  await requirePermission("gtm.outreach.read");

  return (
    <section className="portal-panel">
      <p className="portal-kicker">gtm.outreach.read</p>
      <h1 className="portal-title">Outreach loops</h1>
      <p className="portal-muted mt-3 max-w-2xl">
        Build last. This surface stays inert until lawful basis, suppression, and
        product-specific sending rules are reviewed.
      </p>
    </section>
  );
}
