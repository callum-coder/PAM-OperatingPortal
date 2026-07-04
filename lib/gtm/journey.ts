// Pure module: the 14-day trial → paid journey model, metric flattening,
// week-over-week deltas, and target evaluation. No server-only imports, so it
// is unit-testable and shared by the journey page, brief job, and standup.

export type TrialFunnelMetrics = {
  trialsActive: number | null;
  trialsStarted7d: number | null;
  trialsConverted7d: number | null;
  trialsExpired7d: number | null;
  payingTotal: number | null;
  avgDaysToConvert: number | null;
};

export type JourneyStage = {
  phase: string;
  days: string;
  goal: string;
  measure: string;
};

// The mapped 14-day journey. Stages without live measures name what to
// instrument next in the PAM product — the map is the plan, not a pretence.
export const TRIAL_JOURNEY: JourneyStage[] = [
  {
    phase: "Start",
    days: "Day 0",
    goal: "Landlord starts the 14-day trial — no card, no risk",
    measure: "trials_started_7d (live)",
  },
  {
    phase: "Set up",
    days: "Days 0–2",
    goal: "First property added; compliance dates and documents in",
    measure: "activation events — instrument in PAM",
  },
  {
    phase: "First value",
    days: "Days 3–7",
    goal: "The aha moment: first MTD-ready report or receipt scan",
    measure: "activation events — instrument in PAM",
  },
  {
    phase: "Decide",
    days: "Days 8–13",
    goal: "Tier fit is clear; value recap and MTD deadline land",
    measure: "engagement events — instrument in PAM",
  },
  {
    phase: "Convert",
    days: "Day 14",
    goal: "Paid subscription on the right tier",
    measure: "trials_converted_7d (live)",
  },
];

export function conversionRate(
  started: number | null,
  converted: number | null,
): number | null {
  if (started === null || converted === null || started <= 0) return null;
  return Math.round((converted / started) * 1000) / 10;
}

// The curated metric keys tracked across briefs. Flattened from the raw_metrics
// shape stored on gtm_briefs: top-level PAM counts + crm{} + funnel{}.
export const DELTA_METRICS: { key: string; label: string }[] = [
  { key: "trialsStarted7d", label: "Trials started (7d)" },
  { key: "trialsConverted7d", label: "Trials converted (7d)" },
  { key: "trialsActive", label: "Trials active" },
  { key: "trialsExpired7d", label: "Trials expired (7d)" },
  { key: "payingTotal", label: "Paying customers" },
  { key: "authUsers", label: "PAM auth users" },
  { key: "propertyRecords", label: "Property records" },
  { key: "crmContacts", label: "CRM contacts" },
  { key: "crmLeads", label: "CRM leads" },
  { key: "crmDeals", label: "CRM deals" },
  { key: "crmSubscriptions", label: "CRM subscriptions" },
];

export const TARGETABLE_METRICS: { key: string; label: string }[] = [
  { key: "payingTotal", label: "Paying customers" },
  { key: "trialsStarted7d", label: "Trials started (7d)" },
  { key: "trialsConverted7d", label: "Trials converted (7d)" },
  { key: "trialsActive", label: "Trials active" },
  { key: "crmContacts", label: "CRM contacts" },
  { key: "crmLeads", label: "CRM leads" },
];

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function flattenBriefMetrics(
  raw: Record<string, unknown> | null | undefined,
): Record<string, number | null> {
  const crm = (raw?.crm ?? {}) as Record<string, unknown>;
  const funnel = (raw?.funnel ?? {}) as Record<string, unknown>;

  return {
    authUsers: numberOrNull(raw?.authUsers),
    propertyRecords: numberOrNull(raw?.propertyRecords),
    payingSignals: numberOrNull(raw?.payingSignals),
    crmContacts: numberOrNull(crm.contacts),
    crmLeads: numberOrNull(crm.leads),
    crmDeals: numberOrNull(crm.deals),
    crmSubscriptions: numberOrNull(crm.subscriptions),
    trialsActive: numberOrNull(funnel.trialsActive),
    trialsStarted7d: numberOrNull(funnel.trialsStarted7d),
    trialsConverted7d: numberOrNull(funnel.trialsConverted7d),
    trialsExpired7d: numberOrNull(funnel.trialsExpired7d),
    payingTotal: numberOrNull(funnel.payingTotal),
  };
}

export type MetricDelta = {
  key: string;
  label: string;
  previous: number | null;
  current: number | null;
  delta: number | null;
};

export function computeMetricDeltas(
  previousRaw: Record<string, unknown> | null | undefined,
  currentFlat: Record<string, number | null>,
): MetricDelta[] {
  const previousFlat = flattenBriefMetrics(previousRaw);

  return DELTA_METRICS.map(({ key, label }) => {
    const previous = previousFlat[key] ?? null;
    const current = currentFlat[key] ?? null;
    return {
      key,
      label,
      previous,
      current,
      delta: previous !== null && current !== null ? current - previous : null,
    };
  });
}

export type TargetInput = {
  metric: string;
  label: string;
  target: number;
  due_date: string | null;
};

export type TargetEvaluation = TargetInput & {
  current: number | null;
  progressPct: number | null;
};

export function evaluateTargets(
  targets: TargetInput[],
  currentFlat: Record<string, number | null>,
): TargetEvaluation[] {
  return targets.map((target) => {
    const current = currentFlat[target.metric] ?? null;
    const progressPct =
      current !== null && target.target > 0
        ? Math.round((current / target.target) * 100)
        : null;
    return { ...target, current, progressPct };
  });
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}
