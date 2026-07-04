import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import type { TargetInput } from "./journey";

export type TargetRow = TargetInput & { id: string };

export async function getTargets(): Promise<TargetRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_targets")
    .select("id,metric,label,target,due_date")
    .order("metric", { ascending: true });

  // Table may not be applied yet — degrade to no targets.
  if (error) return [];

  return ((data ?? []) as (Omit<TargetRow, "target"> & { target: unknown })[]).map((row) => ({
    ...row,
    target: Number(row.target),
  }));
}
