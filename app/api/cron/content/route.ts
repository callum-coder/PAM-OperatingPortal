import { runContentStatusCron } from "@/lib/gtm/status-jobs";

export async function GET(request: Request) {
  return runContentStatusCron(request);
}
