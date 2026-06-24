export type CronRunResult = {
  subsystem: string;
  ok: boolean;
  status: string;
  error?: string;
};

export function summarizeCronRun(results: CronRunResult[]) {
  const failed = results.filter((result) => !result.ok).length;

  return {
    ok: failed === 0,
    status: failed === 0 ? "ok" : "error",
    refreshed: results.length - failed,
    failed,
    results,
  };
}
