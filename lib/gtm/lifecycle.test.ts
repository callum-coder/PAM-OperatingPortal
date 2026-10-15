import { describe, expect, it } from "vitest";

import { activationRate, answerRate, lifecycleLine, mapLifecycleRow } from "./lifecycle";

describe("lifecycle metrics", () => {
  const m = mapLifecycleRow({ demo_journeys: "3", trial_journeys: 4, paying_journeys: 1, touches_sent_7d: 10, touches_whatsapp_7d: 6, touches_email_7d: 4, touches_answered_7d: 3, touches_failed_7d: 1, opt_outs_7d: 0, demo_to_trial_7d: 2, trials_total: 4, trials_with_property: 3 });
  it("maps and computes rates", () => {
    expect(m.demoJourneys).toBe(3);
    expect(answerRate(m)).toBe(30);
    expect(activationRate(m, "trialsWithProperty")).toBe(75);
    expect(activationRate(mapLifecycleRow({ trials_total: 0 }), "trialsWithProperty")).toBeNull();
  });
  it("writes the stand-up line", () => {
    expect(lifecycleLine(m)).toBe("Lifecycle: 10 touches sent (7d) · 6 WhatsApp / 4 email · 30% answered · 1 failed · 2 demo → trial · 75% of trials have a property");
    expect(lifecycleLine(null)).toBeNull();
    expect(lifecycleLine(mapLifecycleRow({}))).toBeNull();
  });
});
