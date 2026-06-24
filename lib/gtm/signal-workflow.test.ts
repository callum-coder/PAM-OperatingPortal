import { describe, expect, it } from "vitest";

import { buildSignalStatusUpdate, type SignalWorkflowStatus } from "./signal-workflow";

describe("buildSignalStatusUpdate", () => {
  it("sets closed_at only when a signal is closed", () => {
    const closed = buildSignalStatusUpdate("closed", "2026-06-24T09:30:00.000Z");
    const active = buildSignalStatusUpdate("in_progress", "2026-06-24T09:30:00.000Z");

    expect(closed).toEqual({
      status: "closed",
      closed_at: "2026-06-24T09:30:00.000Z",
      updated_at: "2026-06-24T09:30:00.000Z",
    });
    expect(active).toEqual({
      status: "in_progress",
      closed_at: null,
      updated_at: "2026-06-24T09:30:00.000Z",
    });
  });

  it("rejects statuses that are not part of the operator workflow", () => {
    expect(() => buildSignalStatusUpdate("deleted" as SignalWorkflowStatus)).toThrow(
      "Unsupported signal status: deleted",
    );
  });
});
