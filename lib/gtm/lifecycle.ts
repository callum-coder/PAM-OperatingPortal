// The lifecycle engine's weekly numbers, from PAM's
// portal_readonly.lifecycle_stages (PAM migration-064). Pure mapping;
// pam-readonly.ts fetches.

export type LifecycleMetrics = {
  demoJourneys: number | null;
  trialJourneys: number | null;
  payingJourneys: number | null;
  pausedJourneys: number | null;
  expiredJourneys: number | null;
  cancelledJourneys: number | null;
  optedOutTotal: number | null;
  touchesSent7d: number | null;
  touchesWhatsapp7d: number | null;
  touchesEmail7d: number | null;
  touchesFailed7d: number | null;
  touchesSkipped7d: number | null;
  touchesAnswered7d: number | null;
  optOuts7d: number | null;
  demoToTrial7d: number | null;
  trialsTotal: number | null;
  trialsWithProperty: number | null;
  trialsWithTenant: number | null;
  trialsWithGocardless: number | null;
  trialsWithBankFeed: number | null;
  trialsWithHmrc: number | null;
  trialsOnWhatsapp: number | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mapLifecycleRow(row: Record<string, unknown>): LifecycleMetrics {
  return {
    demoJourneys: num(row.demo_journeys), trialJourneys: num(row.trial_journeys), payingJourneys: num(row.paying_journeys),
    pausedJourneys: num(row.paused_journeys), expiredJourneys: num(row.expired_journeys), cancelledJourneys: num(row.cancelled_journeys),
    optedOutTotal: num(row.opted_out_total), touchesSent7d: num(row.touches_sent_7d), touchesWhatsapp7d: num(row.touches_whatsapp_7d),
    touchesEmail7d: num(row.touches_email_7d), touchesFailed7d: num(row.touches_failed_7d), touchesSkipped7d: num(row.touches_skipped_7d),
    touchesAnswered7d: num(row.touches_answered_7d), optOuts7d: num(row.opt_outs_7d), demoToTrial7d: num(row.demo_to_trial_7d),
    trialsTotal: num(row.trials_total), trialsWithProperty: num(row.trials_with_property), trialsWithTenant: num(row.trials_with_tenant),
    trialsWithGocardless: num(row.trials_with_gocardless), trialsWithBankFeed: num(row.trials_with_bank_feed), trialsWithHmrc: num(row.trials_with_hmrc),
    trialsOnWhatsapp: num(row.trials_on_whatsapp),
  };
}

/** Percentage of current trials past a milestone, or null when there are none. */
export function activationRate(m: LifecycleMetrics, key: keyof LifecycleMetrics): number | null {
  const total = m.trialsTotal;
  const v = m[key];
  if (total === null || total <= 0 || v === null) return null;
  return Math.round((v / total) * 1000) / 10;
}

/** Reply rate on the week's touches. */
export function answerRate(m: LifecycleMetrics): number | null {
  if (m.touchesSent7d === null || m.touchesAnswered7d === null || m.touchesSent7d <= 0) return null;
  return Math.round((m.touchesAnswered7d / m.touchesSent7d) * 1000) / 10;
}

/** The stand-up's one line. */
export function lifecycleLine(m: LifecycleMetrics | null): string | null {
  if (!m || m.touchesSent7d === null) return null;
  const bits = [`${m.touchesSent7d} touches sent (7d)`];
  if (m.touchesWhatsapp7d !== null && m.touchesEmail7d !== null) bits.push(`${m.touchesWhatsapp7d} WhatsApp / ${m.touchesEmail7d} email`);
  const ar = answerRate(m);
  if (ar !== null) bits.push(`${ar}% answered`);
  if (m.touchesFailed7d) bits.push(`${m.touchesFailed7d} failed`);
  if (m.optOuts7d) bits.push(`${m.optOuts7d} opted out`);
  if (m.demoToTrial7d) bits.push(`${m.demoToTrial7d} demo → trial`);
  const pr = activationRate(m, "trialsWithProperty");
  if (pr !== null) bits.push(`${pr}% of trials have a property`);
  return `Lifecycle: ${bits.join(" · ")}`;
}
