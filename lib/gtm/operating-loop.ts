export type SignalSeverity = "critical" | "high" | "medium" | "low";
export type SignalStatus = "open" | "in_progress" | "closed" | "snoozed";

export type GtmSignal = {
  id: string;
  severity: SignalSeverity;
  status: SignalStatus;
  dueDate: string | null;
  createdAt: string;
};

export type ContentPriorityInput = {
  keywordIntent: number;
  productFit: number;
  mtdUrgency: number;
  effort: number;
};

export type StatusSummaryInput = {
  subsystem: string;
  status: "ok" | "warning" | "error" | "idle";
  headline: string | null;
  needs_attention: unknown[];
};

export type NextBestAction = {
  subsystem: string;
  priority: SignalSeverity;
  action: string;
};

const severityRank: Record<SignalSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const statusRank: Record<SignalStatus, number> = {
  open: 3,
  in_progress: 2,
  snoozed: 1,
  closed: 0,
};

export function scoreContentPriority(input: ContentPriorityInput): number {
  const keywordIntent = clampScore(input.keywordIntent);
  const productFit = clampScore(input.productFit);
  const mtdUrgency = clampScore(input.mtdUrgency);
  const effort = clampScore(input.effort);

  return keywordIntent * 3 + productFit * 3 + mtdUrgency * 4 - effort * 2;
}

export function sortSignalsByPriority<T extends GtmSignal>(signals: T[]): T[] {
  return [...signals].sort((a, b) => {
    const statusDelta = statusRank[b.status] - statusRank[a.status];
    if (statusDelta !== 0) return statusDelta;

    const severityDelta = severityRank[b.severity] - severityRank[a.severity];
    if (severityDelta !== 0) return severityDelta;

    const dueDelta = dateRank(a.dueDate) - dateRank(b.dueDate);
    if (dueDelta !== 0) return dueDelta;

    return dateRank(a.createdAt) - dateRank(b.createdAt);
  });
}

export function buildNextBestActions(statuses: StatusSummaryInput[]): NextBestAction[] {
  return statuses.flatMap((status) => {
    const attentionActions = status.needs_attention
      .map(toAttentionAction)
      .filter((action): action is Pick<NextBestAction, "priority" | "action"> =>
        Boolean(action),
      )
      .map((action) => ({
        subsystem: status.subsystem,
        ...action,
      }));

    if (status.status === "warning" || status.status === "error") {
      attentionActions.push({
        subsystem: status.subsystem,
        priority: status.status === "error" ? "high" : "medium",
        action: `Review ${status.status}: ${status.headline ?? status.subsystem}`,
      });
    }

    return attentionActions;
  });
}

function toAttentionAction(
  item: unknown,
): Pick<NextBestAction, "priority" | "action"> | null {
  if (!item || typeof item !== "object") return null;

  const record = item as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : null;
  if (!message) return null;

  const severity =
    typeof record.severity === "string" && record.severity in severityRank
      ? (record.severity as SignalSeverity)
      : "medium";

  return {
    priority: severity,
    action: message,
  };
}

function clampScore(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

function dateRank(value: string | null): number {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}
