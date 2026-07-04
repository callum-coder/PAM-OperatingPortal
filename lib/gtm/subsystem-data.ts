import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";

export type CompetitorWatchRow = {
  id: string;
  competitor: string;
  url: string;
  watch_type: string;
  last_checked_at: string | null;
};

export type CompetitorChangeRow = {
  id: string;
  competitor: string;
  watch_type: string;
  diff_summary: string | null;
  significance: string | null;
  detected_at: string | null;
};

export async function getCompetitorChanges(): Promise<CompetitorChangeRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_competitor_changes")
    .select("id,competitor,watch_type,diff_summary,significance,detected_at")
    .order("detected_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to load competitor changes: ${error.message}`);
  return (data ?? []) as CompetitorChangeRow[];
}

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
    .neq("stage", "parked")
    .order("priority_score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) throw new Error(`Failed to load content items: ${error.message}`);
  return (data ?? []) as ContentItemRow[];
}

export type ContentItemDetail = {
  id: string;
  title: string;
  target_keyword: string | null;
  stage: string | null;
  priority_score: number | null;
  notes: string | null;
  draft: string | null;
  conversion_path: string | null;
  scheduled_for: string | null;
  published_url: string | null;
  updated_at: string | null;
};

export async function getContentItem(id: string): Promise<ContentItemDetail | null> {
  if (!hasPortalSupabaseConfig()) return null;

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_content_items")
    .select(
      "id,title,target_keyword,stage,priority_score,notes,draft,conversion_path,scheduled_for,published_url,updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load content item: ${error.message}`);
  return (data ?? null) as ContentItemDetail | null;
}

export type LeadPlayRow = {
  id: string;
  title: string;
  channel: string;
  audience: string | null;
  hook: string | null;
  lead_magnet: string | null;
  first_action: string | null;
  impact: number | null;
  ease: number | null;
  priority_score: number | null;
  status: string | null;
};

export async function getLeadPlays(): Promise<LeadPlayRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_lead_plays")
    .select("id,title,channel,audience,hook,lead_magnet,first_action,impact,ease,priority_score,status")
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  // The lead-plays table may not be applied yet — degrade to an empty engine so
  // the page still loads rather than 500ing.
  if (error) return [];
  return (data ?? []) as LeadPlayRow[];
}

export type OutreachDraftRow = {
  id: string;
  play_id: string | null;
  play_title: string | null;
  channel: string;
  variant: string | null;
  subject: string | null;
  body: string;
  personalisation: string[] | null;
  status: string;
  created_at: string;
};

export async function getOutreachDrafts(): Promise<OutreachDraftRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_outreach_drafts")
    .select("id,play_id,play_title,channel,variant,subject,body,personalisation,status,created_at")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(30);

  // Table may not be applied yet — degrade to no drafts.
  if (error) return [];
  return (data ?? []) as OutreachDraftRow[];
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
