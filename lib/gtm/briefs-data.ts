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
