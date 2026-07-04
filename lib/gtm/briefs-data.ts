import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";

export type GtmBriefRow = {
  id: string;
  product: string;
  period_start: string | null;
  period_end: string | null;
  raw_metrics: Record<string, unknown> | null;
  narrative: string | null;
  created_at: string;
};

export async function getLatestGtmBriefs(limit = 10): Promise<GtmBriefRow[]> {
  if (!hasPortalSupabaseConfig()) {
    return [];
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_briefs")
    .select("id,product,period_start,period_end,raw_metrics,narrative,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load GTM briefs: ${error.message}`);
  }

  return (data ?? []) as GtmBriefRow[];
}

export type GtmBriefActionRow = {
  id: string;
  brief_id: string | null;
  action_type: string;
  title: string;
  detail: string | null;
  status: string;
};

export async function getBriefActionsByBrief(
  briefIds: string[],
): Promise<Record<string, GtmBriefActionRow[]>> {
  if (!hasPortalSupabaseConfig() || briefIds.length === 0) {
    return {};
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_brief_actions")
    .select("id,brief_id,action_type,title,detail,status")
    .in("brief_id", briefIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load brief actions: ${error.message}`);
  }

  const byBrief: Record<string, GtmBriefActionRow[]> = {};
  for (const row of (data ?? []) as GtmBriefActionRow[]) {
    if (!row.brief_id) continue;
    (byBrief[row.brief_id] ??= []).push(row);
  }
  return byBrief;
}
