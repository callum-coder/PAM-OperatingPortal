import { describe, expect, it } from "vitest";

import { lifecycleNextAction, summarizeLifecycle } from "./lifecycle";

describe("summarizeLifecycle", () => {
  it("counts customers by stage and flags attention", () => {
    const summary = summarizeLifecycle([
      { lifecycle_stage: "trial", health_score: 80 },
      { lifecycle_stage: "at_risk", health_score: 65 },
      { lifecycle_stage: "paying", health_score: 30 },
    ]);

    expect(summary.totalCustomers).toBe(3);
    expect(summary.byStage.trial).toBe(1);
    expect(summary.byStage.at_risk).toBe(1);
    expect(summary.byStage.paying).toBe(1);
    expect(summary.averageHealth).toBe(58);
    expect(summary.attentionCount).toBe(2);
  });
});

describe("lifecycleNextAction", () => {
  it("returns an operator action for every lifecycle stage", () => {
    expect(lifecycleNextAction("visitor")).toContain("Capture");
    expect(lifecycleNextAction("lead")).toContain("trial");
    expect(lifecycleNextAction("trial")).toContain("activation");
    expect(lifecycleNextAction("activated")).toContain("paid");
    expect(lifecycleNextAction("paying")).toContain("retention");
    expect(lifecycleNextAction("at_risk")).toContain("intervention");
    expect(lifecycleNextAction("churned")).toContain("learning");
  });
});
