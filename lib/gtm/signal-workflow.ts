export type SignalWorkflowStatus = "open" | "in_progress" | "snoozed" | "closed";

const allowedStatuses = new Set<SignalWorkflowStatus>([
  "open",
  "in_progress",
  "snoozed",
  "closed",
]);

export function buildSignalStatusUpdate(
  status: SignalWorkflowStatus,
  now = new Date().toISOString(),
) {
  if (!allowedStatuses.has(status)) {
    throw new Error(`Unsupported signal status: ${status}`);
  }

  return {
    status,
    closed_at: status === "closed" ? now : null,
    updated_at: now,
  };
}
