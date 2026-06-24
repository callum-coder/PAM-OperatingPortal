import "server-only";

import { composeDoctrine } from "./doctrine";
import { getAgent } from "./registry";
import { invokeStructuredAgent } from "./runner";
import {
  buildBriefSynthesisInput,
  weeklyBriefSchema,
  type BriefSynthesisContext,
  type WeeklyBriefSynthesis,
} from "./weekly-brief-synthesis";

const AGENT_ID = "brief-analyst" as const;
const RUNTIME_INSTRUCTION =
  "You are the weekly brief analyst. Reason carefully using the doctrine above and only the metrics provided, then return only the structured brief via the required output format.";

export type BriefSynthesisResult = WeeklyBriefSynthesis & {
  model: string;
  usage: { inputTokens: number; outputTokens: number };
};

// Synthesises the weekly brief narrative + structured actions. Throws
// AgentConfigError (from the runner) when Anthropic is not configured, so the
// caller can fall back to the deterministic narrative.
export async function synthesizeWeeklyBrief(
  context: BriefSynthesisContext,
): Promise<BriefSynthesisResult> {
  const agent = getAgent(AGENT_ID);
  if (!agent) {
    throw new Error(`Unknown agent: ${AGENT_ID}`);
  }

  const systemPrompt = `${composeDoctrine(agent.doctrine)}\n\n---\n\n${RUNTIME_INSTRUCTION}`;
  const result = await invokeStructuredAgent({
    schema: weeklyBriefSchema,
    systemPrompt,
    userInput: buildBriefSynthesisInput(context),
    model: agent.model ?? undefined,
  });

  return { ...result.data, model: result.model, usage: result.usage };
}
