import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";

export type AiWorkItemRow = {
  id: string;
  product: string;
  agent_id: string;
  title: string;
  summary: string | null;
  recommendation: string | null;
  confidence: number | null;
  priority: "critical" | "high" | "medium" | "low";
  status: "needs_review" | "approved" | "in_progress" | "done" | "rejected";
  due_date: string | null;
  created_at: string;
};

export async function getAiWorkItems(): Promise<AiWorkItemRow[]> {
  if (!hasPortalSupabaseConfig()) {
    return [];
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_ai_work_items")
    .select("id,product,agent_id,title,summary,recommendation,confidence,priority,status,due_date,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AiWorkItemRow[];
}
