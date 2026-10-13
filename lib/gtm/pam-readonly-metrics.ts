import type { BriefMetrics } from "./briefs";
import type { TrialFunnelMetrics } from "./journey";

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

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Maps a portal_readonly.gtm_trial_funnel row; missing columns become null. */
export function mapTrialFunnelRow(row: Record<string, unknown>): TrialFunnelMetrics {
  return {
    trialsActive: num(row.trials_active),
    trialsStarted7d: num(row.trials_started_7d),
    trialsConverted7d: num(row.trials_converted_7d),
    trialsExpired7d: num(row.trials_expired_7d),
    payingTotal: num(row.paying_total),
    avgDaysToConvert: num(row.avg_days_to_convert),
    demoStarted7d: num(row.demo_started_7d),
    demoActive: num(row.demo_active),
    demoEngaged7d: num(row.demo_engaged_7d),
    demoConverted7d: num(row.demo_converted_7d),
    demoConvertedTotal: num(row.demo_converted_total),
    signupsFromDemo7d: num(row.signups_from_demo_7d),
  };
}
