import "server-only";

import { createPortalAdminClient } from "@/lib/supabase";
import { postSlackMessage } from "@/lib/slack";

export type AgentMessageRecord = {
  agent_id: string;
  channel: string | null;
  text: string;
  slack_ts: string | null;
  status: "sent" | "skipped" | "failed";
  error: string | null;
  context: Record<string, unknown> | null;
};

// Best-effort: a logging failure (e.g. table not yet applied) must never break
// the agent run that produced the message.
export async function logAgentMessage(record: AgentMessageRecord): Promise<void> {
  try {
    const supabase = createPortalAdminClient();
    const { error } = await supabase.from("gtm_agent_messages").insert(record);
    if (error) {
      console.warn(`gtm_agent_messages insert failed: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`gtm_agent_messages insert threw: ${message}`);
  }
}

// Posts an agent message to Slack and mirrors it into the message log. Both
// sides degrade gracefully — an unconfigured Slack records a "skipped" message.
export async function sendAgentMessage(input: {
  agentId: string;
  text: string;
  channel?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  const result = await postSlackMessage({ text: input.text, channel: input.channel });

  await logAgentMessage({
    agent_id: input.agentId,
    channel: result.channel ?? input.channel ?? null,
    text: input.text,
    slack_ts: result.ts ?? null,
    status: result.status,
    error: result.error ?? null,
    context: input.context ?? null,
  });
}
