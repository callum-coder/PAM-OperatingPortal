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

/**
 * MTD ITSA quarterly update deadlines (standard quarters): 7 Aug, 7 Nov,
 * 7 Feb and 7 May. The first was 7 Aug 2026. The countdown always points
 * at the next one, so the tiles, the stand-up, the briefs and the agents'
 * prompts never count down to a date that has passed.
 */
const MTD_DEADLINE_MONTH_DAYS: Array<[number, number]> = [[1, 7], [4, 7], [7, 7], [10, 7]]; // [monthIndex, day]
const FIRST_MTD_DEADLINE_UTC = Date.UTC(2026, 7, 7);

export function nextMtdDeadline(now = new Date()): Date {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (todayUtc <= FIRST_MTD_DEADLINE_UTC) return new Date(FIRST_MTD_DEADLINE_UTC);
  for (let year = now.getUTCFullYear(); year <= now.getUTCFullYear() + 1; year += 1) {
    for (const [month, day] of MTD_DEADLINE_MONTH_DAYS) {
      const t = Date.UTC(year, month, day);
      if (t >= todayUtc) return new Date(t);
    }
  }
  return new Date(Date.UTC(now.getUTCFullYear() + 1, 1, 7));
}

export function getMtdCountdown(now = new Date()): MtdCountdown {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = nextMtdDeadline(now);
  const daysRemaining = Math.max(0, Math.ceil((target.getTime() - todayUtc) / (1000 * 60 * 60 * 24)));
  return {
    targetDate: target.toISOString().slice(0, 10),
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
    )} MTD quarterly deadline.`,
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
