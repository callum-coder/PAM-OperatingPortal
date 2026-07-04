import { runAllGtmCron } from "@/lib/gtm/cron-all-runner";

export const maxDuration = 300;

export async function GET(request: Request) {
  return runAllGtmCron(request);
}
