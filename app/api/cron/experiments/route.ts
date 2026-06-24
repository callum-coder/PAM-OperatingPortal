import { runExperimentsStatusCron } from "@/lib/gtm/status-jobs";

export async function GET(request: Request) {
  return runExperimentsStatusCron(request);
}
