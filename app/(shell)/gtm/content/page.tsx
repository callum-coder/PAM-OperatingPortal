import Link from "next/link";

import { getContentItems } from "@/lib/gtm/subsystem-data";
import { requirePermission } from "@/lib/rbac/guard";
import { hasPermission } from "@/lib/rbac/permissions";
import { ContentItemForm } from "../subsystem-forms";
import { draftContentItem } from "../actions";

export default async function ContentPage() {
  const user = await requirePermission("gtm.content.read");
  const items = await getContentItems();
  const canDraft = hasPermission(user.roles, "gtm.content.write");

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
              <div className="grid items-center gap-2 py-4 md:grid-cols-[1fr_84px_70px_92px]" key={item.id}>
                <div>
                  <Link className="font-medium hover:underline" href={`/gtm/content/${item.id}`}>
                    {item.title}
                  </Link>
                  <p className="portal-muted">{item.target_keyword ?? "No keyword"}</p>
                </div>
                <p className="portal-muted uppercase">{item.stage}</p>
                <p className="font-semibold">
                  {item.priority_score ?? 0}
                  <span className="portal-muted text-xs font-normal">/100</span>
                </p>
                <div className="justify-self-end">
                  {canDraft && item.stage === "idea" ? (
                    <form action={draftContentItem}>
                      <input name="item_id" type="hidden" value={item.id} />
                      <button className="portal-secondary-button" type="submit">
                        Draft
                      </button>
                    </form>
                  ) : item.stage === "review" ? (
                    <span className="text-xs font-semibold uppercase text-[#3f5a23]">Drafted</span>
                  ) : null}
                </div>
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
