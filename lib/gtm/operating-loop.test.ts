import { describe, expect, it } from "vitest";

import {
  buildNextBestActions,
  scoreContentPriority,
  sortSignalsByPriority,
  type GtmSignal,
} from "./operating-loop";

describe("scoreContentPriority", () => {
  it("prioritizes urgent, high-fit, low-effort content", () => {
    expect(
      scoreContentPriority({
        keywordIntent: 5,
        productFit: 5,
        mtdUrgency: 5,
        effort: 1,
      }),
    ).toBeGreaterThan(
      scoreContentPriority({
        keywordIntent: 2,
        productFit: 3,
        mtdUrgency: 1,
        effort: 5,
      }),
    );
  });
});

describe("sortSignalsByPriority", () => {
  it("sorts open high severity signals first, then due date", () => {
    const signals: GtmSignal[] = [
      signal({ id: "low", severity: "low", dueDate: "2026-06-20" }),
      signal({ id: "high-later", severity: "high", dueDate: "2026-06-25" }),
      signal({ id: "high-sooner", severity: "high", dueDate: "2026-06-21" }),
      signal({ id: "closed", severity: "critical", status: "closed" }),
    ];

    expect(sortSignalsByPriority(signals).map((item) => item.id)).toEqual([
      "high-sooner",
      "high-later",
      "low",
      "closed",
    ]);
  });
});

describe("buildNextBestActions", () => {
  it("turns warnings and needs_attention items into review actions", () => {
    const actions = buildNextBestActions([
      {
        subsystem: "briefs",
        status: "warning",
        headline: "PAM read-only URL needs changing",
        needs_attention: [{ severity: "medium", message: "Use Postgres URL" }],
      },
      {
        subsystem: "content",
        status: "idle",
        headline: "No content items",
        needs_attention: [],
      },
    ]);

    expect(actions).toEqual([
      {
        subsystem: "briefs",
        priority: "medium",
        action: "Use Postgres URL",
      },
      {
        subsystem: "briefs",
        priority: "medium",
        action: "Review warning: PAM read-only URL needs changing",
      },
    ]);
  });
});

function signal(overrides: Partial<GtmSignal>): GtmSignal {
  return {
    id: "signal",
    severity: "medium",
    status: "open",
    dueDate: null,
    createdAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}
