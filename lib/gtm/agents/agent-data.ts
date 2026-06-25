import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";

export type AgentRunRow = {
  id: string;
  agent_id: string;
  status: "ok" | "warning" | "error" | "skipped";
  model: string | null;
  summary: string | null;
  items_created: number;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type AiTeamSnapshot = {
  runsByAgent: Record<string, AgentRunRow[]>;
  latestRunByAgent: Record<string, AgentRunRow | undefined>;
};

export type AgentMessageRow = {
  id: string;
  agent_id: string;
  channel: string | null;
  text: string;
  slack_ts: string | null;
  status: string;
  created_at: string;
};

export async function getAgentRunsForAgent(agentId: string, limit = 20): Promise<AgentRunRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_agent_runs")
    .select(
      "id,agent_id,status,model,summary,items_created,input_tokens,output_tokens,error,started_at,finished_at,created_at",
    )
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as AgentRunRow[];
}

export async function getAgentMessages(agentId: string, limit = 20): Promise<AgentMessageRow[]> {
  if (!hasPortalSupabaseConfig()) return [];

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_agent_messages")
    .select("id,agent_id,channel,text,slack_ts,status,created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Table may not be applied yet — degrade to no messages.
  if (error) return [];
  return (data ?? []) as AgentMessageRow[];
}

export async function getAiTeamSnapshot(): Promise<AiTeamSnapshot> {
  if (!hasPortalSupabaseConfig()) {
    return { runsByAgent: {}, latestRunByAgent: {} };
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_agent_runs")
    .select(
      "id,agent_id,status,model,summary,items_created,input_tokens,output_tokens,error,started_at,finished_at,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // The run log table may not be applied yet — degrade to an empty history
  // rather than crashing the page.
  if (error) {
    return { runsByAgent: {}, latestRunByAgent: {} };
  }

  const rows = (data ?? []) as AgentRunRow[];
  const runsByAgent: Record<string, AgentRunRow[]> = {};
  const latestRunByAgent: Record<string, AgentRunRow | undefined> = {};

  for (const row of rows) {
    (runsByAgent[row.agent_id] ??= []).push(row);
    if (!latestRunByAgent[row.agent_id]) {
      latestRunByAgent[row.agent_id] = row;
    }
  }

  return { runsByAgent, latestRunByAgent };
}
