import {
  conversionRate,
  type TargetEvaluation,
  type TrialFunnelMetrics,
} from "../journey";

// Pure module: the GTM Lead's daily standup text. Deliberately deterministic —
// a roll-up should never hallucinate, so no LLM is involved.

export type StandupFleetRow = {
  agentName: string;
  status: string;
  summary: string | null;
  itemsCreated: number;
};

export type StandupInput = {
  date: string;
  mtdDaysRemaining: number;
  fleet: StandupFleetRow[];
  openSignals: number;
  attentionSubsystems: number;
  funnel: TrialFunnelMetrics | null;
  targets: TargetEvaluation[];
  baseUrl: string | null;
};

export function buildStandupText(input: StandupInput): string {
  const lines: string[] = [
    `GTM Lead — standup for ${input.date} (${input.mtdDaysRemaining} days to the MTD wedge)`,
  ];

  if (input.fleet.length) {
    const fleetLine = input.fleet
      .map((row) => {
        const items = row.itemsCreated > 0 ? ` — ${row.itemsCreated} new` : "";
        return `${row.agentName} ${row.status}${items}`;
      })
      .join(" · ");
    lines.push(`Fleet (24h): ${fleetLine}`);
  } else {
    lines.push("Fleet (24h): no agent runs recorded.");
  }

  const inboxBits = [`${input.openSignals} open signal${input.openSignals === 1 ? "" : "s"}`];
  if (input.attentionSubsystems > 0) {
    inboxBits.push(
      `${input.attentionSubsystems} subsystem${input.attentionSubsystems === 1 ? " needs" : "s need"} attention`,
    );
  }
  lines.push(`Inbox: ${inboxBits.join(" · ")}`);

  const funnel = input.funnel;
  if (
    funnel &&
    (funnel.trialsStarted7d !== null || funnel.trialsActive !== null || funnel.payingTotal !== null)
  ) {
    const rate = conversionRate(funnel.trialsStarted7d, funnel.trialsConverted7d);
    const bits: string[] = [];
    if (funnel.trialsStarted7d !== null) bits.push(`${funnel.trialsStarted7d} trials started (7d)`);
    if (funnel.trialsActive !== null) bits.push(`${funnel.trialsActive} in trial`);
    if (funnel.trialsConverted7d !== null) {
      bits.push(`${funnel.trialsConverted7d} converted (7d${rate !== null ? `, ${rate}%` : ""})`);
    }
    if (funnel.payingTotal !== null) bits.push(`${funnel.payingTotal} paying`);
    lines.push(`Funnel: ${bits.join(" · ")}`);
  } else {
    lines.push("Funnel: not connected yet — apply the trial-funnel view to the PAM project.");
  }

  if (input.targets.length) {
    const targetLine = input.targets
      .map((target) => {
        const current = target.current === null ? "—" : target.current;
        const pct = target.progressPct === null ? "" : ` (${target.progressPct}%)`;
        return `${target.label} ${current}/${target.target}${pct}`;
      })
      .join(" · ");
    lines.push(`Targets: ${targetLine}`);
  }

  if (input.baseUrl) {
    lines.push(`Review: ${input.baseUrl}/gtm`);
  }

  return lines.join("\n");
}
