import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "./supabase";

export type SystemStatusRow = {
  id: string;
  module: string;
  subsystem: string;
  product: string | null;
  status: "ok" | "warning" | "error" | "idle";
  headline: string | null;
  metrics: Record<string, unknown>;
  needs_attention: unknown[];
  last_run_at: string | null;
  updated_at: string | null;
};

export async function getSystemStatus(moduleIds: string[]): Promise<SystemStatusRow[]> {
  if (!hasPortalSupabaseConfig() || moduleIds.length === 0) {
    return [];
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("system_status")
    .select("*")
    .in("module", moduleIds)
    .order("module")
    .order("subsystem");

  if (error) {
    throw new Error(`Failed to load system status: ${error.message}`);
  }

  return (data ?? []) as SystemStatusRow[];
}
