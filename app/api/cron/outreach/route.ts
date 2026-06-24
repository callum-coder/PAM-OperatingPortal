import { runOutreachStatusCron } from "@/lib/gtm/status-jobs";

export async function GET(request: Request) {
  return runOutreachStatusCron(request);
}
