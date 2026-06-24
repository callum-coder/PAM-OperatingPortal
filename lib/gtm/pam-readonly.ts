import "server-only";

import postgres from "postgres";

import type { BriefMetrics } from "./briefs";
import { mapWeeklyMetricsViewRow, type WeeklyMetricsViewRow } from "./pam-readonly-metrics";
import {
  classifyPamReadonlyConfig,
  type PamReadonlyConfigKind,
} from "./pam-readonly-config";

export { classifyPamReadonlyConfig, type PamReadonlyConfigKind };

export async function readPamBriefMetrics(): Promise<BriefMetrics> {
  const url = process.env.PAM_DATABASE_URL_READONLY;
  const kind = classifyPamReadonlyConfig(url);

  if (kind !== "postgres") {
    throw new PamReadonlyConfigError(kind);
  }

  const sql = postgres(url!, {
    max: 1,
    ssl: "require",
    idle_timeout: 3,
    connect_timeout: 10,
  });

  try {
    const aggregateMetrics = await readWeeklyMetricsView(sql);
    if (aggregateMetrics) {
      return aggregateMetrics;
    }

    const [tables, authUsers, propertyRecords, payingSignals] = await Promise.all([
      countPublicTables(sql),
      countIfTableExists(sql, "auth", "users"),
      countLikelyTable(sql, ["properties", "property", "units", "homes"]),
      countLikelyTable(sql, ["subscriptions", "customers", "stripe_customers", "plans"]),
    ]);

    return {
      source: "pam_readonly",
      tablesAvailable: tables,
      authUsers,
      propertyRecords,
      payingSignals,
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export class PamReadonlyConfigError extends Error {
  constructor(public readonly kind: PamReadonlyConfigKind) {
    super(toPamReadonlyMessage(kind));
  }
}

function toPamReadonlyMessage(kind: PamReadonlyConfigKind): string {
  if (kind === "missing") {
    return "PAM_DATABASE_URL_READONLY is not configured.";
  }

  if (kind === "https_project_url") {
    return "PAM_DATABASE_URL_READONLY is a Supabase project URL. Use a read-only Postgres connection string for backend metrics.";
  }

  return "PAM_DATABASE_URL_READONLY is not a supported Postgres connection string.";
}

async function readWeeklyMetricsView(sql: postgres.Sql): Promise<BriefMetrics | null> {
  const exists = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.views
      where table_schema = 'portal_readonly'
        and table_name = 'gtm_weekly_metrics'
    )
  `;

  if (!exists[0]?.exists) {
    return null;
  }

  const rows = await sql<WeeklyMetricsViewRow[]>`
    select
      tables_available,
      auth_users,
      property_records,
      paying_signals
    from portal_readonly.gtm_weekly_metrics
    limit 1
  `;

  return rows[0] ? mapWeeklyMetricsViewRow(rows[0]) : null;
}

async function countPublicTables(sql: postgres.Sql): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    select count(*)::text as count
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  `;

  return Number(rows[0]?.count ?? 0);
}

async function countIfTableExists(
  sql: postgres.Sql,
  schema: string,
  table: string,
): Promise<number | null> {
  const exists = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = ${schema}
        and table_name = ${table}
    )
  `;

  if (!exists[0]?.exists) {
    return null;
  }

  const tableIdent = sql(`${schema}.${table}`);
  const rows = await sql<{ count: string }[]>`
    select count(*)::text as count
    from ${tableIdent}
  `;

  return Number(rows[0]?.count ?? 0);
}

async function countLikelyTable(
  sql: postgres.Sql,
  candidates: string[],
): Promise<number | null> {
  const rows = await sql<{ table_schema: string; table_name: string }[]>`
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name in ${sql(candidates)}
    order by array_position(${candidates}, table_name)
    limit 1
  `;

  const table = rows[0];
  if (!table) {
    return null;
  }

  return countIfTableExists(sql, table.table_schema, table.table_name);
}
