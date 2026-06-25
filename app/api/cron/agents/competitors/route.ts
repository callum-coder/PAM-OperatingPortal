import { runCompetitorScoutCron } from "@/lib/gtm/agents/competitor-scout";

export const maxDuration = 300;

export async function GET(request: Request) {
  return runCompetitorScoutCron(request);
}
