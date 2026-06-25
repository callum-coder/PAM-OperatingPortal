import { runContentAgentCron } from "@/lib/gtm/agents/content-agent";

// A single Opus call with adaptive thinking can run for tens of seconds; give
// the function room beyond the default serverless ceiling.
export const maxDuration = 300;

export async function GET(request: Request) {
  return runContentAgentCron(request);
}
