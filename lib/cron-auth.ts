export type CronAuthResult = { ok: true } | { ok: false; response: Response };

export function verifyCronRequest(
  request: Request,
  secret = process.env.CRON_SECRET,
): CronAuthResult {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
