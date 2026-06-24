import { verifyCronRequest } from "@/lib/cron-auth";
import { hasPortalSupabaseConfig } from "@/lib/supabase";
import { upsertStatus } from "@/lib/status";

export async function runPlaceholderCron(request: Request, subsystem: string) {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPortalSupabaseConfig()) {
    return Response.json(
      {
        ok: false,
        subsystem,
        error: "Portal Supabase environment is not configured",
      },
      { status: 503 },
    );
  }

  await upsertStatus({
    module: "gtm",
    subsystem,
    product: null,
    status: "idle",
    headline: `${subsystem} cron route is wired but not implemented`,
  });

  return Response.json({ ok: true, subsystem, status: "idle" });
}
