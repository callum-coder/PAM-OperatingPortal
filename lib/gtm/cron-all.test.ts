import { describe, expect, it } from "vitest";

import { summarizeCronRun, type CronRunResult } from "./cron-all";

describe("summarizeCronRun", () => {
  it("reports ok only when every subsystem refresh succeeds", () => {
    const results: CronRunResult[] = [
      { subsystem: "briefs", ok: true, status: "ok" },
      { subsystem: "content", ok: true, status: "idle" },
    ];

    expect(summarizeCronRun(results)).toEqual({
      ok: true,
      status: "ok",
      refreshed: 2,
      failed: 0,
      results,
    });
  });

  it("reports error when any subsystem refresh fails", () => {
    const results: CronRunResult[] = [
      { subsystem: "briefs", ok: true, status: "ok" },
      { subsystem: "outreach", ok: false, status: "error", error: "boom" },
    ];

    expect(summarizeCronRun(results)).toEqual({
      ok: false,
      status: "error",
      refreshed: 1,
      failed: 1,
      results,
    });
  });
});
