import { describe, expect, it } from "vitest";

import {
  annotateGaps,
  classifyThread,
  groupThreads,
  humaniseButton,
  mapDemoMessageRow,
  mapDemoThreadRow,
  stripMirrorLabel,
  type DemoThread,
} from "./demo-threads";

const now = new Date("2026-10-14T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;

function thread(over: Partial<DemoThread> = {}): DemoThread {
  return {
    sandboxId: "s1", phoneLast4: "1234", startedAt: ago(2 * HOUR), lastSeenAt: ago(HOUR), expiresAt: new Date(now.getTime() + 13 * 24 * HOUR).toISOString(),
    messageCount: 3, actingAs: "landlord", converted: false, convertedAt: null, inboundCount: 3, outboundCount: 4, failedCount: 0,
    firstInboundAt: ago(2 * HOUR), lastMessageAt: ago(HOUR), lastDirection: "outbound", lastBody: "Shall I find a contractor?", lastStatus: "read",
    lastIsMirror: false, jobStatus: "awaiting_approval", jobNextActionAt: null, ...over,
  };
}

describe("classifyThread", () => {
  it("flags a visitor message PAM never answered as broken", () => {
    const v = classifyThread(thread({ lastDirection: "inbound", lastMessageAt: ago(20 * MIN), lastBody: "yes go ahead" }), now);
    expect(v.state).toBe("broken");
    expect(v.needsAttention).toBe(true);
    expect(v.detail).toContain("never answered");
  });
  it("gives PAM a few minutes' grace to reply", () => {
    expect(classifyThread(thread({ lastDirection: "inbound", lastMessageAt: ago(MIN) }), now).state).toBe("waiting_on_pam");
  });
  it("flags a failed outbound send", () => {
    const v = classifyThread(thread({ lastStatus: "failed", failedCount: 1 }), now);
    expect(v.state).toBe("broken");
    expect(v.label).toBe("Send failed");
  });
  it("flags an overdue scripted beat as broken, a pending one as active", () => {
    expect(classifyThread(thread({ jobStatus: "sourcing", jobNextActionAt: ago(15 * MIN) }), now).state).toBe("broken");
    expect(classifyThread(thread({ jobStatus: "sourcing", jobNextActionAt: new Date(now.getTime() + 60_000).toISOString() }), now).state).toBe("active");
  });
  it("calls out a visitor who went quiet for a day", () => {
    const v = classifyThread(thread({ lastMessageAt: ago(30 * HOUR) }), now);
    expect(v.state).toBe("quiet");
    expect(v.detail).toContain("Nothing follows this up");
  });
  it("prefers converted over everything, and never-started when nothing came in", () => {
    expect(classifyThread(thread({ converted: true, lastDirection: "inbound", lastMessageAt: ago(5 * HOUR) }), now).state).toBe("converted");
    expect(classifyThread(thread({ inboundCount: 0, lastDirection: null, lastMessageAt: null }), now).state).toBe("never_started");
  });
  it("marks an expired sandbox", () => {
    expect(classifyThread(thread({ expiresAt: ago(HOUR), lastMessageAt: ago(15 * 24 * HOUR) }), now).state).toBe("expired");
  });
});

describe("groupThreads", () => {
  it("puts broken first and drops empty groups", () => {
    const groups = groupThreads([thread(), thread({ sandboxId: "s2", lastDirection: "inbound", lastMessageAt: ago(HOUR) })], now);
    expect(groups[0].title).toContain("Broken");
    expect(groups.map((g) => g.items.length)).toEqual([1, 1]);
  });
});

describe("mapping", () => {
  it("maps a thread row with string counts and Date columns", () => {
    const t = mapDemoThreadRow({ sandbox_id: "s", phone_last4: "9990", started_at: new Date("2026-10-13T16:24:12Z"), message_count: "4", acting_as: "tenant", converted: false, inbound_count: "4", outbound_count: 6, failed_count: 0, last_direction: "outbound", last_is_mirror: true, job_status: "scheduled" });
    expect(t.startedAt).toBe("2026-10-13T16:24:12.000Z");
    expect(t.messageCount).toBe(4);
    expect(t.actingAs).toBe("tenant");
    expect(t.lastIsMirror).toBe(true);
    expect(t.lastDirection).toBe("outbound");
  });
  it("maps buttons from ids or objects and strips mirror labels", () => {
    const m = mapDemoMessageRow({ message_id: "m1", direction: "outbound", kind: "text", body: "To Priya (landlord)\nHi Priya, the boiler…", is_mirror: true, mirror_label: "To Priya (landlord)", buttons: ["demo_try_tenant", { id: "yes", title: "Yes please" }], created_at: "2026-10-14T11:00:00Z" });
    expect(m.buttons).toEqual([{ id: "demo_try_tenant", title: "Try tenant" }, { id: "yes", title: "Yes please" }]);
    expect(stripMirrorLabel(m.body, m.isMirror)).toBe("Hi Priya, the boiler…");
    expect(humaniseButton("demo:switch_landlord")).toBe("Switch landlord");
  });
});

describe("annotateGaps", () => {
  it("inserts a marker only for pauses over ten minutes", () => {
    const base = mapDemoMessageRow({ message_id: "a", direction: "inbound", kind: "text", body: "hi", created_at: ago(3 * HOUR) });
    const items = annotateGaps([
      base,
      { ...base, id: "b", createdAt: ago(3 * HOUR - 2 * MIN) },
      { ...base, id: "c", createdAt: ago(HOUR) },
    ]);
    expect(items.map((i) => i.type)).toEqual(["message", "message", "gap", "message"]);
    expect(items[2]).toMatchObject({ type: "gap", label: "2 hours later" });
  });
});
