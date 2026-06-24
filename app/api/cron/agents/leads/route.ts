import { runLeadFinderCron } from "@/lib/gtm/agents/lead-finder";

export const maxDuration = 300;

export async function GET(request: Request) {
  return runLeadFinderCron(request);
}
