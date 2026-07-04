// Pure module: parsing Xero's Profit & Loss report JSON into a flat summary.
// Xero reports are nested Rows/Cells structures whose exact shape varies by
// chart of accounts, so this scans for the well-known summary labels and
// degrades to null for anything it can't find. No server-only imports.

export type PnlSummary = {
  totalIncome: number | null;
  totalExpenses: number | null;
  netProfit: number | null;
};

type XeroCell = { Value?: unknown };
type XeroRow = {
  RowType?: string;
  Title?: string;
  Cells?: XeroCell[];
  Rows?: XeroRow[];
};
type XeroReportBody = {
  Reports?: { Rows?: XeroRow[] }[];
};

const LABELS: Record<string, keyof PnlSummary> = {
  "total income": "totalIncome",
  "total revenue": "totalIncome",
  "total operating expenses": "totalExpenses",
  "total expenses": "totalExpenses",
  "net profit": "netProfit",
  "net income": "netProfit",
  "profit for the period": "netProfit",
};

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function walkRows(rows: XeroRow[] | undefined, summary: PnlSummary): void {
  for (const row of rows ?? []) {
    const label = String(row.Cells?.[0]?.Value ?? row.Title ?? "").trim().toLowerCase();
    const key = LABELS[label];
    if (key && summary[key] === null) {
      const lastCell = row.Cells?.[row.Cells.length - 1];
      summary[key] = parseAmount(lastCell?.Value);
    }
    if (row.Rows?.length) {
      walkRows(row.Rows, summary);
    }
  }
}

export function extractPnlSummary(body: unknown): PnlSummary {
  const summary: PnlSummary = { totalIncome: null, totalExpenses: null, netProfit: null };
  const report = (body as XeroReportBody)?.Reports?.[0];
  walkRows(report?.Rows, summary);
  return summary;
}

export function monthRange(now = new Date()): { fromDate: string; toDate: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  };
}

export function previousMonthRange(now = new Date()): { fromDate: string; toDate: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}
