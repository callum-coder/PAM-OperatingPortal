import { runWeeklyBriefsCron } from "@/lib/gtm/weekly-briefs";

export async function GET(request: Request) {
  return runWeeklyBriefsCron(request);
}
