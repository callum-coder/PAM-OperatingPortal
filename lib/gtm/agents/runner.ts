import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type * as z from "zod/v4";

import { anthropicConfig } from "@/lib/anthropic";

// Thrown when the agent cannot run because Anthropic is not configured. Callers
// treat this as a graceful "idle/skipped", not a failure (mirrors the
// PamReadonlyConfigError pattern in the briefs job).
export class AgentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentConfigError";
  }
}

export type StructuredAgentResult<T> = {
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
};

// The shared spine for "single structured call" agents: compose a system prompt
// (doctrine), send the sensed context, and get back a schema-validated object.
// Tool-using agents will layer a tool loop on top of this same contract later.
export async function invokeStructuredAgent<S extends z.ZodType>(input: {
  systemPrompt: string;
  userInput: string;
  schema: S;
  model?: string;
  maxTokens?: number;
}): Promise<StructuredAgentResult<z.infer<S>>> {
  if (!anthropicConfig.apiKey) {
    throw new AgentConfigError("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: anthropicConfig.apiKey });
  const model = input.model ?? anthropicConfig.synthesisModel;

  const message = await client.messages.parse({
    model,
    max_tokens: input.maxTokens ?? 16000,
    thinking: { type: "adaptive" },
    system: input.systemPrompt,
    output_config: { format: zodOutputFormat(input.schema) },
    messages: [{ role: "user", content: input.userInput }],
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Agent request was declined by safety classifiers.");
  }

  const data = message.parsed_output;
  if (data == null) {
    throw new Error("Agent returned no parseable structured output.");
  }

  return {
    data: data as z.infer<S>,
    model,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}
