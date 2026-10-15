import "server-only";

import postgres from "postgres";

import type { BriefMetrics } from "./briefs";
import type { TrialFunnelMetrics } from "./journey";
import { mapDemoMessageRow, mapDemoThreadRow, type DemoMessage, type DemoThread } from "./demo-threads";
import { mapLifecycleRow, type LifecycleMetrics } from "./lifecycle";
import { mapTrialFunnelRow, mapWeeklyMetricsViewRow, type WeeklyMetricsViewRow } from "./pam-readonly-metrics";
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

// Reads the trial→paid funnel aggregate from the customer PAM database via the
// portal_readonly.gtm_trial_funnel contract (customer-pam/002). Unlike the
// brief metrics, this is an enhancement: any failure — missing config, missing
// view, query error — degrades to null rather than throwing.
export async function readPamTrialFunnel(): Promise<TrialFunnelMetrics | null> {
  const url = process.env.PAM_DATABASE_URL_READONLY;
  if (classifyPamReadonlyConfig(url) !== "postgres") {
    return null;
  }

  const sql = postgres(url!, {
    max: 1,
    ssl: "require",
    idle_timeout: 3,
    connect_timeout: 10,
  });

  try {
    const exists = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from information_schema.views
        where table_schema = 'portal_readonly'
          and table_name = 'gtm_trial_funnel'
      )
    `;

    if (!exists[0]?.exists) {
      return null;
    }

    // Select the whole row: the customer view gained the WhatsApp demo
    // columns in PAM migration-059, and an older deployment of the view must
    // still produce the trial metrics rather than failing the query.
    const rows = await sql<Record<string, unknown>[]>`
      select *
      from portal_readonly.gtm_trial_funnel
      limit 1
    `;

    const row = rows[0];
    if (!row) return null;

    return mapTrialFunnelRow(row);
  } catch {
    return null;
  } finally {
    await sql.end({ timeout: 2 });
  }
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

function readonlyClient() {
  const url = process.env.PAM_DATABASE_URL_READONLY;
  if (classifyPamReadonlyConfig(url) !== "postgres") return null;
  return postgres(url!, { max: 1, ssl: "require", idle_timeout: 3, connect_timeout: 10 });
}

async function viewExists(sql: ReturnType<typeof postgres>, name: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from information_schema.views
      where table_schema = 'portal_readonly' and table_name = ${name}
    )
  `;
  return rows[0]?.exists === true;
}

// The WhatsApp demo line, one row per visitor sandbox, from
// portal_readonly.demo_threads (PAM migration-060). Null means "not
// connected" (no config, view not yet created, or the query failed); an
// empty array means connected with no threads.
export async function readPamDemoThreads(): Promise<DemoThread[] | null> {
  const sql = readonlyClient();
  if (!sql) return null;
  try {
    if (!(await viewExists(sql, "demo_threads"))) return null;
    const rows = await sql<Record<string, unknown>[]>`
      select * from portal_readonly.demo_threads
      order by coalesce(last_message_at, started_at) desc
      limit 500
    `;
    return rows.map(mapDemoThreadRow);
  } catch {
    return null;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One thread with every message on it, oldest first. Null when not
 *  connected or the sandbox does not exist. */
export async function readPamDemoThread(sandboxId: string): Promise<{ thread: DemoThread; messages: DemoMessage[] } | null> {
  if (!UUID.test(sandboxId)) return null;
  const sql = readonlyClient();
  if (!sql) return null;
  try {
    if (!(await viewExists(sql, "demo_thread_messages"))) return null;
    const threads = await sql<Record<string, unknown>[]>`
      select * from portal_readonly.demo_threads where sandbox_id = ${sandboxId}::uuid limit 1
    `;
    const row = threads[0];
    if (!row) return null;
    const messages = await sql<Record<string, unknown>[]>`
      select * from portal_readonly.demo_thread_messages
      where sandbox_id = ${sandboxId}::uuid
      order by created_at asc
      limit 2000
    `;
    return { thread: mapDemoThreadRow(row), messages: messages.map(mapDemoMessageRow) };
  } catch {
    return null;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

/** The lifecycle engine's counts (PAM migration-064). Null when not connected. */
export async function readPamLifecycle(): Promise<LifecycleMetrics | null> {
  const sql = readonlyClient();
  if (!sql) return null;
  try {
    if (!(await viewExists(sql, "lifecycle_stages"))) return null;
    const rows = await sql<Record<string, unknown>[]>`select * from portal_readonly.lifecycle_stages limit 1`;
    return rows[0] ? mapLifecycleRow(rows[0]) : null;
  } catch {
    return null;
  } finally {
    await sql.end({ timeout: 2 });
  }
}
