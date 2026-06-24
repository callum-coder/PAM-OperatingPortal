import { runAllGtmCron } from "@/lib/gtm/cron-all-runner";

export async function GET(request: Request) {
  return runAllGtmCron(request);
}
