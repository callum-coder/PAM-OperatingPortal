import { runGtmStandupCron } from "@/lib/gtm/agents/standup";

export const maxDuration = 300;

export async function GET(request: Request) {
  return runGtmStandupCron(request);
}
