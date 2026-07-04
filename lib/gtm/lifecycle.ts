export type LifecycleStage =
  | "visitor"
  | "lead"
  | "trial"
  | "activated"
  | "paying"
  | "at_risk"
  | "churned";

export type LifecycleStageDefinition = {
  key: LifecycleStage;
  label: string;
  intent: string;
  primaryMetric: string;
};

export const LIFECYCLE_STAGES: LifecycleStageDefinition[] = [
  {
    key: "visitor",
    label: "Visitor",
    intent: "Unknown demand that has not converted into a named contact.",
    primaryMetric: "website visits and lead magnet starts",
  },
  {
    key: "lead",
    label: "Lead",
    intent: "Known contact with a reason to hear from PAM.",
    primaryMetric: "captured email and source",
  },
  {
    key: "trial",
    label: "Trial",
    intent: "User is evaluating PAM during the 14-day window.",
    primaryMetric: "trial started",
  },
  {
    key: "activated",
    label: "Activated",
    intent: "User has reached first value before payment.",
    primaryMetric: "property, document, compliance, or report milestone",
  },
  {
    key: "paying",
    label: "Paying",
    intent: "Customer has converted to a paid plan.",
    primaryMetric: "active subscription",
  },
  {
    key: "at_risk",
    label: "At risk",
    intent: "Customer or trial needs intervention.",
    primaryMetric: "missed activation, low usage, failed payment, or churn signal",
  },
  {
    key: "churned",
    label: "Churned",
    intent: "Customer has cancelled or failed to convert.",
    primaryMetric: "cancelled subscription or expired trial",
  },
];

export type LifecycleCustomerInput = {
  lifecycle_stage: LifecycleStage;
  health_score: number | null;
};

export type LifecycleSummary = {
  totalCustomers: number;
  byStage: Record<LifecycleStage, number>;
  averageHealth: number | null;
  attentionCount: number;
};

export function summarizeLifecycle(customers: LifecycleCustomerInput[]): LifecycleSummary {
  const byStage = Object.fromEntries(
    LIFECYCLE_STAGES.map((stage) => [stage.key, 0]),
  ) as Record<LifecycleStage, number>;

  let healthTotal = 0;
  let healthCount = 0;
  let attentionCount = 0;

  for (const customer of customers) {
    byStage[customer.lifecycle_stage] += 1;

    if (customer.health_score !== null) {
      healthTotal += customer.health_score;
      healthCount += 1;
    }

    if (customer.lifecycle_stage === "at_risk" || (customer.health_score ?? 100) < 45) {
      attentionCount += 1;
    }
  }

  return {
    totalCustomers: customers.length,
    byStage,
    averageHealth: healthCount ? Math.round(healthTotal / healthCount) : null,
    attentionCount,
  };
}

export function lifecycleNextAction(stage: LifecycleStage): string {
  switch (stage) {
    case "visitor":
      return "Capture source, offer, and intent so the visit can become a lead.";
    case "lead":
      return "Invite them into the trial with an MTD-specific reason to start now.";
    case "trial":
      return "Drive the first activation milestone before day 7.";
    case "activated":
      return "Show the value recap and recommend the right paid tier.";
    case "paying":
      return "Protect retention with usage, compliance, and renewal signals.";
    case "at_risk":
      return "Review blockers and assign a human intervention.";
    case "churned":
      return "Record the reason and feed the learning into campaigns and onboarding.";
  }
}
