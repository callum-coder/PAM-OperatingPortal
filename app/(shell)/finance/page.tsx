import { Coins } from "lucide-react";

import { requirePermission } from "@/lib/rbac/guard";
import { getXeroFinanceSummary, hasXeroConfig } from "@/lib/xero";
import type { PnlSummary } from "@/lib/xero-report";

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function FinancePage() {
  await requirePermission("finance.overview.read");
  const summary = await getXeroFinanceSummary();

  return (
    <div className="space-y-8">
      <section className="portal-page-header">
        <div>
          <p className="portal-kicker">Module 2 · Xero</p>
          <h1 className="portal-title">Finance overview</h1>
        </div>
        {summary.organisation ? (
          <p className="portal-muted">{summary.organisation}</p>
        ) : null}
      </section>

      {hasXeroConfig() ? (
        <>
          <PnlPanel
            title="This month (to date)"
            pnl={summary.monthToDate}
            compare={summary.previousMonth}
          />
          <PnlPanel title="Last month" pnl={summary.previousMonth} compare={null} />
          <p className="portal-muted max-w-3xl text-sm">
            Figures come from Xero&rsquo;s Profit &amp; Loss report via a read-only custom
            connection. If everything shows &ldquo;—&rdquo;, check the connection&rsquo;s scopes
            include <code>accounting.reports.read</code>.
          </p>
        </>
      ) : (
        <section className="portal-panel">
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 shrink-0 text-[#71806a]" size={20} />
            <div>
              <h2 className="portal-section-title">Connect Xero</h2>
              <p className="portal-muted mt-2 max-w-2xl">
                Create a Xero <strong>custom connection</strong> (Xero developer portal → New app →
                Custom connection) with the <code>accounting.reports.read</code> and{" "}
                <code>accounting.settings.read</code> scopes, authorise it against the PAM
                organisation, then set <code>XERO_CLIENT_ID</code> and{" "}
                <code>XERO_CLIENT_SECRET</code> in Vercel. Income, expenses, and profit appear
                here — month to date and last month.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PnlPanel({
  title,
  pnl,
  compare,
}: {
  title: string;
  pnl: PnlSummary;
  compare: PnlSummary | null;
}) {
  return (
    <section className="portal-panel">
      <h2 className="portal-section-title">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <MoneyTile compareValue={compare?.totalIncome ?? null} label="Income" value={pnl.totalIncome} />
        <MoneyTile compareValue={compare?.totalExpenses ?? null} label="Expenses" value={pnl.totalExpenses} />
        <MoneyTile compareValue={compare?.netProfit ?? null} label="Net profit" value={pnl.netProfit} />
      </div>
    </section>
  );
}

function MoneyTile({
  label,
  value,
  compareValue,
}: {
  label: string;
  value: number | null;
  compareValue: number | null;
}) {
  const delta = value !== null && compareValue !== null ? value - compareValue : null;
  return (
    <div className="rounded-lg border border-[#dfe5d8] bg-[#fbfcf7] p-4">
      <p className="portal-muted text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{formatMoney(value)}</p>
      {delta !== null ? (
        <p className={`mt-1 text-xs ${delta >= 0 ? "text-[#28734d]" : "text-[#b42318]"}`}>
          {delta >= 0 ? "+" : ""}
          {formatMoney(delta)} vs last month
        </p>
      ) : null}
    </div>
  );
}
