import "server-only";

export const anthropicConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  synthesisModel: process.env.MODEL_SYNTHESIS ?? "claude-opus-4-8",
  parsingModel: process.env.MODEL_PARSING ?? "claude-haiku-4-5",
};
