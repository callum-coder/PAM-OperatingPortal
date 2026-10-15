import { describe, expect, it } from "vitest";

import { buildStandupText, type StandupInput } from "./standup-report";

const base: StandupInput = {
  date: "2026-07-04",
  mtdDaysRemaining: 34,
  fleet: [
    { agentName: "Content Strategist", status: "ok", summary: null, itemsCreated: 6 },
    { agentName: "Competitor Scout", status: "ok", summary: null, itemsCreated: 0 },
  ],
  openSignals: 4,
  attentionSubsystems: 1,
  funnel: {
    trialsActive: 12,
    trialsStarted7d: 5,
    trialsConverted7d: 2,
    trialsExpired7d: 1,
    payingTotal: 31,
    avgDaysToConvert: 9,
    demoStarted7d: 10,
    demoEngaged7d: 4,
    demoConverted7d: 3,
  },
  lifecycle: { demoJourneys: 1, trialJourneys: 2, payingJourneys: 1, pausedJourneys: 0, expiredJourneys: 0, cancelledJourneys: 0, optedOutTotal: 0, touchesSent7d: 5, touchesWhatsapp7d: 3, touchesEmail7d: 2, touchesFailed7d: 0, touchesSkipped7d: 1, touchesAnswered7d: 2, optOuts7d: 0, demoToTrial7d: 1, trialsTotal: 2, trialsWithProperty: 1, trialsWithTenant: 0, trialsWithGocardless: 0, trialsWithBankFeed: 0, trialsWithHmrc: 0, trialsOnWhatsapp: 1 },
  targets: [
    {
      metric: "payingTotal",
      label: "Paying customers",
      target: 50,
      due_date: "2026-08-07",
      current: 31,
      progressPct: 62,
    },
  ],
  baseUrl: "https://portal.example",
};

describe("buildStandupText", () => {
  it("rolls up fleet, inbox, funnel, and targets", () => {
    const text = buildStandupText(base);
    expect(text).toContain("34 days to the MTD wedge");
    expect(text).toContain("Content Strategist ok — 6 new");
    expect(text).toContain("4 open signals · 1 subsystem needs attention");
    expect(text).toContain("2 converted (7d, 40%)");
    expect(text).toContain("WhatsApp demo: 10 WhatsApp demos started (7d) · 4 engaged · 3 signed up (30%)");
    expect(text).toContain("Lifecycle: 5 touches sent (7d) · 3 WhatsApp / 2 email · 40% answered · 1 demo → trial · 50% of trials have a property");
    expect(text).toContain("Paying customers 31/50 (62%)");
    expect(text).toContain("https://portal.example/gtm");
  });

  it("degrades honestly when nothing is connected", () => {
    const text = buildStandupText({
      ...base,
      fleet: [],
      funnel: null,
      targets: [],
      attentionSubsystems: 0,
      openSignals: 1,
      baseUrl: null,
    });
    expect(text).toContain("no agent runs recorded");
    expect(text).toContain("Funnel: not connected yet");
    expect(text).toContain("1 open signal");
    expect(text).not.toContain("Targets:");
    expect(text).not.toContain("Review:");
  });
});
