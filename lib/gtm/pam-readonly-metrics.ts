import type { BriefMetrics } from "./briefs";

export type WeeklyMetricsViewRow = {
  tables_available: number | string | null;
  auth_users: number | string | null;
  property_records: number | string | null;
  paying_signals: number | string | null;
};

export function mapWeeklyMetricsViewRow(row: WeeklyMetricsViewRow): BriefMetrics {
  return {
    source: "pam_readonly",
    tablesAvailable: toNullableNumber(row.tables_available) ?? 0,
    authUsers: toNullableNumber(row.auth_users),
    propertyRecords: toNullableNumber(row.property_records),
    payingSignals: toNullableNumber(row.paying_signals),
  };
}

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}
