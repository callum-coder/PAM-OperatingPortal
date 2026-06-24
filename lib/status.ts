import "server-only";

import { buildStatusUpsert, type StatusInput } from "./status-payload";
import { createPortalAdminClient } from "./supabase";

export { buildStatusUpsert, type StatusInput };

export async function upsertStatus(input: StatusInput) {
  const supabase = createPortalAdminClient();
  const { row, onConflict } = buildStatusUpsert(input);
  const { error } = await supabase.from("system_status").upsert(row, { onConflict });

  if (error) {
    throw new Error(`Failed to upsert system status: ${error.message}`);
  }
}
