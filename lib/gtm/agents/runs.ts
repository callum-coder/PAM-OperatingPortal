import "server-only";

import { createPortalAdminClient } from "@/lib/supabase";
import type { AgentRunRecord } from "./types";

// Best-effort telemetry. A run log failure (e.g. migration not yet applied)
// must never turn a successful agent run into a failed one, so this swallows
// its own errors and reports them to the server console instead.
export async function logAgentRun(record: AgentRunRecord): Promise<void> {
  try {
    const supabase = createPortalAdminClient();
    const { error } = await supabase.from("gtm_agent_runs").insert(record);
    if (error) {
      console.warn(`gtm_agent_runs insert failed: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`gtm_agent_runs insert threw: ${message}`);
  }
}
