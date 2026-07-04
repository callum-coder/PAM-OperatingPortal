import { describe, expect, it } from "vitest";

import { extractPnlSummary, monthRange, previousMonthRange } from "./xero-report";

const sampleReport = {
  Reports: [
    {
      Rows: [
        { RowType: "Header", Cells: [{ Value: "" }, { Value: "30 Jun 2026" }] },
        {
          RowType: "Section",
          Title: "Income",
          Rows: [
            { RowType: "Row", Cells: [{ Value: "Subscriptions" }, { Value: "1,250.00" }] },
            { RowType: "SummaryRow", Cells: [{ Value: "Total Income" }, { Value: "1,250.00" }] },
          ],
        },
        {
          RowType: "Section",
          Title: "Operating Expenses",
          Rows: [
            { RowType: "SummaryRow", Cells: [{ Value: "Total Operating Expenses" }, { Value: "480.25" }] },
          ],
        },
        {
          RowType: "Section",
          Rows: [{ RowType: "Row", Cells: [{ Value: "Net Profit" }, { Value: "769.75" }] }],
        },
      ],
    },
  ],
};

describe("extractPnlSummary", () => {
  it("finds income, expenses, and profit in a nested report", () => {
    expect(extractPnlSummary(sampleReport)).toEqual({
      totalIncome: 1250,
      totalExpenses: 480.25,
      netProfit: 769.75,
    });
  });

  it("degrades to nulls on an unexpected shape", () => {
    expect(extractPnlSummary({})).toEqual({
      totalIncome: null,
      totalExpenses: null,
      netProfit: null,
    });
    expect(extractPnlSummary(null)).toEqual({
      totalIncome: null,
      totalExpenses: null,
      netProfit: null,
    });
  });
});

describe("month ranges", () => {
  const now = new Date("2026-07-04T10:00:00Z");

  it("computes the month-to-date range", () => {
    expect(monthRange(now)).toEqual({ fromDate: "2026-07-01", toDate: "2026-07-04" });
  });

  it("computes the full previous month", () => {
    expect(previousMonthRange(now)).toEqual({ fromDate: "2026-06-01", toDate: "2026-06-30" });
  });
});
