export type SystemStatusValue = "ok" | "warning" | "error" | "idle";

export type StatusInput = {
  module: string;
  subsystem: string;
  product?: string | null;
  status: SystemStatusValue;
  headline?: string | null;
  metrics?: Record<string, unknown>;
  needs_attention?: unknown[];
  last_run_at?: string;
};

export function buildStatusUpsert(input: StatusInput) {
  const now = new Date().toISOString();

  return {
    row: {
      module: input.module,
      subsystem: input.subsystem,
      product: input.product ?? null,
      status: input.status,
      headline: input.headline ?? null,
      metrics: input.metrics ?? {},
      needs_attention: input.needs_attention ?? [],
      last_run_at: input.last_run_at ?? now,
      updated_at: now,
    },
    onConflict: "module,subsystem,product_key",
  };
}
