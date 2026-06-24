import "server-only";

import { createPortalAdminClient } from "@/lib/supabase";

import { composeDoctrine } from "./doctrine";
import { getAgent } from "./registry";
import { logAgentRun } from "./runs";
import { AgentConfigError, invokeStructuredAgent } from "./runner";
import {
  assembleDraftMarkdown,
  buildDrafterInput,
  contentDraftSchema,
  type ContentItemBrief,
} from "./content-draft";

const AGENT_ID = "content-writer" as const;
const RUNTIME_INSTRUCTION =
  "You are running on demand to draft a single approved content idea. Reason carefully using the doctrine above, then return only the structured draft via the required output format.";

export type DrafterExecution = {
  ok: boolean;
  status: "ok" | "skipped" | "error";
  message: string;
};

// Drafts one content item: reads its strategist brief, generates a structured
// draft, stores it as markdown, and advances the item to the "review" stage.
export async function executeContentWriter(itemId: string): Promise<DrafterExecution> {
  const agent = getAgent(AGENT_ID);
  if (!agent) {
    return { ok: false, status: "error", message: `Unknown agent: ${AGENT_ID}` };
  }

  const startedAt = new Date().toISOString();
  const supabase = createPortalAdminClient();

  try {
    const { data: item, error: itemError } = await supabase
      .from("gtm_content_items")
      .select("id,title,target_keyword,notes,stage")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      throw new Error(`Content item not found: ${itemError?.message ?? itemId}`);
    }

    const brief: ContentItemBrief = {
      title: String(item.title),
      targetKeyword: item.target_keyword ?? null,
      notes: item.notes ?? null,
    };

    const systemPrompt = `${composeDoctrine(agent.doctrine)}\n\n---\n\n${RUNTIME_INSTRUCTION}`;
    const result = await invokeStructuredAgent({
      schema: contentDraftSchema,
      systemPrompt,
      userInput: buildDrafterInput(brief),
      model: agent.model ?? undefined,
      maxTokens: 20000,
    });

    const draftMarkdown = assembleDraftMarkdown(result.data);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("gtm_content_items")
      .update({
        draft: draftMarkdown,
        stage: "review",
        stage_changed_at: now,
        updated_at: now,
      })
      .eq("id", itemId);

    if (updateError) {
      throw new Error(`Failed to save draft: ${updateError.message}`);
    }

    const summary = `Drafted "${brief.title}" → review`;
    await logAgentRun({
      agent_id: agent.id,
      status: "ok",
      model: result.model,
      summary,
      output: { itemId, draft: result.data },
      items_created: 0,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      error: null,
      started_at: startedAt,
      finished_at: now,
    });

    return { ok: true, status: "ok", message: summary };
  } catch (error) {
    const configIssue = error instanceof AgentConfigError;
    const message = error instanceof Error ? error.message : "Unknown drafting error";

    await logAgentRun({
      agent_id: AGENT_ID,
      status: configIssue ? "skipped" : "error",
      model: agent.model,
      summary: configIssue ? "Skipped: Anthropic not configured" : "Draft failed",
      output: { itemId },
      items_created: 0,
      input_tokens: null,
      output_tokens: null,
      error: message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return { ok: configIssue, status: configIssue ? "skipped" : "error", message };
  }
}
