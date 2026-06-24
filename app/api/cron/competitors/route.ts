import { runCompetitorStatusCron } from "@/lib/gtm/status-jobs";

export async function GET(request: Request) {
  return runCompetitorStatusCron(request);
}
