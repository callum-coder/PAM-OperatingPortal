export type OutreachReadinessStatus = "pending" | "approved" | "blocked" | "not_applicable";

export type OutreachReadinessCheck = {
  key: string;
  title: string;
  status: OutreachReadinessStatus;
  blocking: boolean;
};

export type OutreachReadinessEvaluation = {
  ready: boolean;
  blockingPending: number;
  approvedBlocking: number;
  totalBlocking: number;
  attention: { severity: "medium"; message: string }[];
};

export function evaluateOutreachReadiness(
  checks: OutreachReadinessCheck[],
): OutreachReadinessEvaluation {
  const blockingChecks = checks.filter((check) => check.blocking);
  const unapprovedBlocking = blockingChecks.filter((check) => check.status !== "approved");

  return {
    ready: blockingChecks.length > 0 && unapprovedBlocking.length === 0,
    blockingPending: unapprovedBlocking.length,
    approvedBlocking: blockingChecks.length - unapprovedBlocking.length,
    totalBlocking: blockingChecks.length,
    attention: unapprovedBlocking.map((check) => ({
      severity: "medium",
      message: `Approve ${check.title.toLowerCase()} before enabling outbound outreach.`,
    })),
  };
}
