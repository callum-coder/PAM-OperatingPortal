export type MtdCountdown = {
  targetDate: string;
  daysRemaining: number;
};

export type BriefMetrics = {
  source: "pam_readonly";
  tablesAvailable: number;
  authUsers: number | null;
  propertyRecords: number | null;
  payingSignals: number | null;
};

export type WeeklyBriefInput = {
  product: string;
  periodStart: string;
  periodEnd: string;
  mtdCountdown: MtdCountdown;
  metrics: BriefMetrics;
};

const MTD_WEDGE_DATE = "2026-08-07";

export function getMtdCountdown(now = new Date()): MtdCountdown {
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const targetUtc = Date.UTC(2026, 7, 7);
  const daysRemaining = Math.max(
    0,
    Math.ceil((targetUtc - todayUtc) / (1000 * 60 * 60 * 24)),
  );

  return {
    targetDate: MTD_WEDGE_DATE,
    daysRemaining,
  };
}

export function getWeeklyPeriod(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

export function buildBriefNarrative(input: WeeklyBriefInput): string {
  const authUsers = formatMetric(input.metrics.authUsers, "auth users");
  const propertyRecords = formatMetric(input.metrics.propertyRecords, "property records");
  const payingSignals = formatMetric(input.metrics.payingSignals, "paying signals");

  return [
    `${input.product.toUpperCase()} weekly brief for ${input.periodStart} to ${input.periodEnd}.`,
    `${input.mtdCountdown.daysRemaining} days remain until the ${formatDate(
      input.mtdCountdown.targetDate,
    )} MTD wedge date.`,
    `The aggregate PAM view reports ${authUsers}, ${propertyRecords}, and ${payingSignals}.`,
    "This is a deterministic system-generated brief until Anthropic synthesis is configured.",
  ].join(" ");
}

function formatMetric(value: number | null, label: string): string {
  return value === null ? `no ${label} metric` : `${value} ${label}`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
