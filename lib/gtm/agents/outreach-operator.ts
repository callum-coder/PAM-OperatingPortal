import "server-only";

import { createPortalAdminClient } from "@/lib/supabase";

import { composeDoctrine } from "./doctrine";
import { getAgent } from "./registry";
import { logAgentRun } from "./runs";
import { sendAgentMessage } from "./messages";
import { AgentConfigError, invokeStructuredAgent } from "./runner";
import {
  buildOutreachDraftInput,
  mapDraftToRow,
  outreachDraftsOutputSchema,
  type PlayForDrafting,
} from "./outreach-drafts";

const AGENT_ID = "outreach-operator" as const;
const RUNTIME_INSTRUCTION =
  "You are drafting outreach copy for one lead-gen play. Draft-only — a human reviews, personalises, and sends. Follow the doctrine exactly and return only the structured drafts.";

export type OutreachOperatorExecution = {
  ok: boolean;
  status: "ok" | "skipped" | "error";
  drafts: number;
  message: string;
};

// Drafts outreach copy for one lead play and stores it in gtm_outreach_drafts.
// Deliberately on-demand only (no cron): outreach copy is produced when a human
// picks a play to run, and nothing here ever sends.
export async function executeOutreachOperator(playId: string): Promise<OutreachOperatorExecution> {
  const agent = getAgent(AGENT_ID);
  if (!agent) {
    return { ok: false, status: "error", drafts: 0, message: `Unknown agent: ${AGENT_ID}` };
  }

  const startedAt = new Date().toISOString();
  const supabase = createPortalAdminClient();

  try {
    const { data: play, error: playError } = await supabase
      .from("gtm_lead_plays")
      .select("id,title,channel,audience,hook,lead_magnet,first_action")
      .eq("id", playId)
      .single();

    if (playError || !play) {
      throw new Error(`Lead play not found: ${playError?.message ?? playId}`);
    }

    const typedPlay = play as PlayForDrafting;
    const systemPrompt = `${composeDoctrine(agent.doctrine)}\n\n---\n\n${RUNTIME_INSTRUCTION}`;
    const result = await invokeStructuredAgent({
      schema: outreachDraftsOutputSchema,
      systemPrompt,
      userInput: buildOutreachDraftInput(typedPlay),
      model: agent.model ?? undefined,
    });

    const rows = result.data.drafts.map((draft) => mapDraftToRow(draft, typedPlay));
    if (rows.length) {
      const { error: insertError } = await supabase.from("gtm_outreach_drafts").insert(rows);
      if (insertError) {
        throw new Error(`Failed to save outreach drafts: ${insertError.message}`);
      }
    }

    const summary = `Drafted ${rows.length} outreach variants for "${typedPlay.title}"`;

    await logAgentRun({
      agent_id: agent.id,
      status: "ok",
      model: result.model,
      summary,
      output: { playId, drafts: result.data.drafts },
      items_created: rows.length,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      error: null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    const baseUrl = process.env.PORTAL_BASE_URL ?? null;
    await sendAgentMessage({
      agentId: agent.id,
      text: `Outreach Operator — ${rows.length} draft variants ready for "${typedPlay.title}" (draft-only; review, personalise, send manually).${
        baseUrl ? `\nReview: ${baseUrl}/gtm/outreach` : ""
      }`,
      context: { playId, drafts: rows.length },
    });

    return { ok: true, status: "ok", drafts: rows.length, message: summary };
  } catch (error) {
    const configIssue = error instanceof AgentConfigError;
    const message = error instanceof Error ? error.message : "Unknown outreach drafting error";

    await logAgentRun({
      agent_id: AGENT_ID,
      status: configIssue ? "skipped" : "error",
      model: agent.model,
      summary: configIssue ? "Skipped: Anthropic not configured" : "Draft run failed",
      output: { playId },
      items_created: 0,
      input_tokens: null,
      output_tokens: null,
      error: message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: configIssue, status: configIssue ? "skipped" : "error", drafts: 0, message };
  }
}
