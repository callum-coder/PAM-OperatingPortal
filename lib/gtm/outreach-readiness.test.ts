import { describe, expect, it } from "vitest";

import { evaluateOutreachReadiness, type OutreachReadinessCheck } from "./outreach-readiness";

describe("evaluateOutreachReadiness", () => {
  it("blocks outreach while required checks are not approved", () => {
    const result = evaluateOutreachReadiness([
      check({ key: "lawful_basis", status: "pending", blocking: true }),
      check({ key: "suppression", status: "approved", blocking: true }),
      check({ key: "copy_review", status: "pending", blocking: false }),
    ]);

    expect(result).toEqual({
      ready: false,
      blockingPending: 1,
      approvedBlocking: 1,
      totalBlocking: 2,
      attention: [
        {
          severity: "medium",
          message: "Approve lawful basis before enabling outbound outreach.",
        },
      ],
    });
  });

  it("marks outreach ready when every blocking check is approved", () => {
    const result = evaluateOutreachReadiness([
      check({ key: "lawful_basis", status: "approved", blocking: true }),
      check({ key: "suppression", status: "approved", blocking: true }),
    ]);

    expect(result.ready).toBe(true);
    expect(result.attention).toEqual([]);
  });
});

function check(overrides: Partial<OutreachReadinessCheck>): OutreachReadinessCheck {
  return {
    key: "lawful_basis",
    title: "Lawful basis",
    status: "pending",
    blocking: true,
    ...overrides,
  };
}
