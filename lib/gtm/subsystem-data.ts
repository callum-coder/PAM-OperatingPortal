import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";

export type CompetitorWatchRow = {
  id: string;
  competitor: string;
  url: string;
  watch_type: string;
  last_checked_at: string | null;
};

export type ContentItemRow = {
  id: string;
  title: string;
  target_keyword: string | null;
  stage: string | null;
  priority_score: number | null;
  updated_at: string | null;
};

export type ExperimentRow = {
  id: string;
  name: string;
  metric: string | null;
  baseline: number | null;
  target: number | null;
  status: string | null;
  created_at: string | null;
};

export async function getCompetitorWatches(): Promise<CompetitorWatchRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_competitor_watch")
    .select("id,competitor,url,watch_type,last_checked_at")
    .order("competitor", { ascending: true });

  if (error) throw new Error(`Failed to load competitor watches: ${error.message}`);
  return (data ?? []) as CompetitorWatchRow[];
}

export async function getContentItems(): Promise<ContentItemRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_content_items")
    .select("id,title,target_keyword,stage,priority_score,updated_at")
    .order("priority_score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) throw new Error(`Failed to load content items: ${error.message}`);
  return (data ?? []) as ContentItemRow[];
}

export async function getExperiments(): Promise<ExperimentRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_experiments")
    .select("id,name,metric,baseline,target,status,created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw new Error(`Failed to load experiments: ${error.message}`);
  return (data ?? []) as ExperimentRow[];
}
