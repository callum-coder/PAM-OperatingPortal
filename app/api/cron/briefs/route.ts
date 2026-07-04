import { runWeeklyBriefsCron } from "@/lib/gtm/weekly-briefs";

// Brief synthesis is an LLM call; give it room beyond the default ceiling.
export const maxDuration = 300;

export async function GET(request: Request) {
  return runWeeklyBriefsCron(request);
}
