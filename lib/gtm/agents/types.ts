export type AgentId =
  | "gtm-lead"
  | "content-strategist"
  | "content-writer"
  | "brief-analyst"
  | "lead-finder"
  | "competitor-scout"
  | "outreach-operator";

export type AgentStatus = "active" | "planned" | "paused";

// Agents are first-class, code-defined entities so the roster and reporting
// hierarchy stay in git (like the doctrine they run on). The future AI-Team
// section reads definitions from here and run history from gtm_agent_runs.
export type AgentDefinition = {
  id: AgentId;
  name: string;
  role: string;
  // Who this agent reports to in the AI-Team hierarchy; null for the head.
  reportsTo: AgentId | null;
  description: string;
  module: "gtm";
  // null → use the configured synthesis model (lib/anthropic.ts).
  model: string | null;
  // Doctrine files (under /doctrine) composed on top of _house.md.
  doctrine: string[];
  // Cron expression, or null if the agent is not scheduled yet.
  schedule: string | null;
  // Tables/artifacts this agent writes.
  outputs: string[];
  // Tool scope. "none" = a single structured call; "read-only" = a tool loop
  // restricted to read-only sources (e.g. HubSpot/PAM) once wired.
  tools: "none" | "read-only";
  status: AgentStatus;
};

export type AgentRunStatus = "ok" | "warning" | "error" | "skipped";

export type AgentRunRecord = {
  agent_id: string;
  status: AgentRunStatus;
  model: string | null;
  summary: string;
  output: Record<string, unknown> | null;
  items_created: number;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  started_at: string;
  finished_at: string;
};
