"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/rbac/guard";
import { executeContentStrategist } from "@/lib/gtm/agents/content-agent";

// In-app manual trigger for the Content Strategist. Authorized via RBAC (write
// permission) rather than the cron secret. The agent's own execution path
// records status and the run log; we just refresh the page afterwards.
export async function runContentAgentNow() {
  await requirePermission("gtm.content.write");
  await executeContentStrategist();
  revalidatePath("/ai-team");
}
