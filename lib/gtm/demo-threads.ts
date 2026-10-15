// The WhatsApp demo line, one conversation at a time. Pure: row mapping,
// "where did this thread stop" classification and the gap markers the
// phone-style view draws. Data comes from PAM's portal_readonly.demo_threads
// and demo_thread_messages views (PAM migration-060) via pam-readonly.ts.

export type DemoThread = {
  sandboxId: string;
  phoneLast4: string;
  startedAt: string;
  lastSeenAt: string | null;
  expiresAt: string | null;
  messageCount: number;
  actingAs: "landlord" | "tenant";
  converted: boolean;
  convertedAt: string | null;
  inboundCount: number;
  outboundCount: number;
  failedCount: number;
  firstInboundAt: string | null;
  lastMessageAt: string | null;
  lastDirection: "inbound" | "outbound" | null;
  lastBody: string | null;
  lastStatus: string | null;
  lastIsMirror: boolean;
  jobStatus: string | null;
  jobNextActionAt: string | null;
  /** What they asked PAM to call them (PAM migration-061); null on older views. */
  visitorFirstName: string | null;
};

export type DemoMessage = {
  id: string;
  direction: "inbound" | "outbound";
  kind: string;
  templateName: string | null;
  body: string | null;
  status: string | null;
  error: string | null;
  createdAt: string;
  jobId: string | null;
  /** Which side the visitor was playing when this was sent or received. */
  audience: "landlord" | "tenant" | "contractor" | null;
  /** PAM's message to the OTHER side, shown to the visitor with a "To X (side)" first line. */
  isMirror: boolean;
  mirrorLabel: string | null;
  buttons: { id: string; title: string }[] | null;
  buttonPayload: string | null;
  mediaType: string | null;
  documentKind: string | null;
};

function str(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * Sign-up links PAM sends on the demo line carry a signed token (?wa=…)
 * that encodes the visitor's full number. The Ops view masks numbers to the
 * last four digits, so hide the token too.
 */
export function maskSignupTokens(body: string | null): string | null {
  if (!body) return body;
  return body.replace(/([?&]wa=)[A-Za-z0-9_\-.%]+/g, "$1…");
}

export function mapDemoThreadRow(row: Record<string, unknown>): DemoThread {
  const dir = str(row.last_direction);
  return {
    sandboxId: String(row.sandbox_id),
    phoneLast4: str(row.phone_last4) ?? "????",
    startedAt: iso(row.started_at) ?? new Date(0).toISOString(),
    lastSeenAt: iso(row.last_seen_at),
    expiresAt: iso(row.expires_at),
    messageCount: num(row.message_count),
    actingAs: row.acting_as === "tenant" ? "tenant" : "landlord",
    converted: row.converted === true,
    convertedAt: iso(row.converted_at),
    inboundCount: num(row.inbound_count),
    outboundCount: num(row.outbound_count),
    failedCount: num(row.failed_count),
    firstInboundAt: iso(row.first_inbound_at),
    lastMessageAt: iso(row.last_message_at),
    lastDirection: dir === "inbound" || dir === "outbound" ? dir : null,
    lastBody: maskSignupTokens(str(row.last_body)),
    lastStatus: str(row.last_status),
    lastIsMirror: row.last_is_mirror === true,
    jobStatus: str(row.job_status),
    jobNextActionAt: iso(row.job_next_action_at),
    visitorFirstName: str(row.visitor_first_name)?.trim() || null,
  };
}

/** "Callum ··· 4821" or "··· 4821". */
export function threadTitle(t: Pick<DemoThread, "visitorFirstName" | "phoneLast4">): string {
  return t.visitorFirstName ? `${t.visitorFirstName} ··· ${t.phoneLast4}` : `··· ${t.phoneLast4}`;
}

export function mapDemoMessageRow(row: Record<string, unknown>): DemoMessage {
  const audience = str(row.audience);
  let buttons: DemoMessage["buttons"] = null;
  const raw = row.buttons;
  if (Array.isArray(raw)) {
    buttons = raw
      .map((b) =>
        typeof b === "string"
          ? { id: b, title: humaniseButton(b) }
          : b && typeof b === "object" && "id" in b
            ? { id: String((b as { id: unknown }).id), title: String((b as { title?: unknown }).title ?? humaniseButton(String((b as { id: unknown }).id))) }
            : null,
      )
      .filter((b): b is { id: string; title: string } => b !== null);
  }
  return {
    id: String(row.message_id ?? row.id),
    direction: row.direction === "inbound" ? "inbound" : "outbound",
    kind: str(row.kind) ?? "text",
    templateName: str(row.template_name),
    body: maskSignupTokens(str(row.body)),
    status: str(row.status),
    error: str(row.error),
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    jobId: str(row.job_id),
    audience: audience === "landlord" || audience === "tenant" || audience === "contractor" ? audience : null,
    isMirror: row.is_mirror === true,
    mirrorLabel: str(row.mirror_label),
    buttons,
    buttonPayload: str(row.button_payload),
    mediaType: str(row.media_type),
    documentKind: str(row.document_kind),
  };
}

/** Button ids are logged, titles are not: "demo_try_tenant" → "Try tenant". */
export function humaniseButton(id: string): string {
  const t = id.replace(/^demo[_:]/, "").replace(/[_:-]+/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : id;
}

/** The text of a mirror message without its "To X (side)" first line. */
export function stripMirrorLabel(body: string | null, isMirror: boolean): string {
  if (!body) return "";
  if (!isMirror) return body;
  const nl = body.indexOf("\n");
  return nl === -1 ? body : body.slice(nl + 1).replace(/^\n+/, "");
}

export const DEMO_STAGE_LABELS: Record<string, string> = {
  open: "Repair reported, waiting for the landlord's go-ahead",
  awaiting_approval: "Waiting for the landlord to approve",
  sourcing: "PAM ringing contractors",
  scheduled: "Contractor booked",
  awaiting_confirmation: "Asked the tenant whether it's fixed",
  resolved: "Repair resolved, invoice filed",
};

export function demoStageLabel(jobStatus: string | null): string {
  if (!jobStatus) return "No repair started yet";
  return DEMO_STAGE_LABELS[jobStatus] ?? jobStatus;
}

export type ThreadState =
  | "never_started"
  | "broken"
  | "waiting_on_pam"
  | "active"
  | "waiting_on_visitor"
  | "quiet"
  | "converted"
  | "expired";

export type ThreadVerdict = {
  state: ThreadState;
  /** Short pill text. */
  label: string;
  /** One line on where and why the thread stopped, or what it is waiting for. */
  detail: string;
  /** True when something on PAM's side needs fixing or a message nobody sends. */
  needsAttention: boolean;
};

const MIN = 60_000;
const HOUR = 60 * MIN;

export const PAM_REPLY_GRACE_MS = 3 * MIN;
export const BEAT_OVERDUE_MS = 10 * MIN;
export const VISITOR_QUIET_MS = 24 * HOUR;

export function humanAge(ms: number): string {
  if (ms < MIN) return "just now";
  if (ms < HOUR) return `${Math.round(ms / MIN)}m ago`;
  if (ms < 48 * HOUR) return `${Math.round(ms / HOUR)}h ago`;
  return `${Math.round(ms / (24 * HOUR))}d ago`;
}

/** Decides where a thread stands right now. Order matters: the first rule
 *  that applies wins. */
export function classifyThread(t: DemoThread, now: Date = new Date()): ThreadVerdict {
  const nowMs = now.getTime();
  const lastMs = t.lastMessageAt ? Date.parse(t.lastMessageAt) : null;
  const age = lastMs === null ? null : nowMs - lastMs;

  if (t.converted) {
    return { state: "converted", label: "Signed up", detail: `Created a PAM account${t.convertedAt ? ` ${humanAge(nowMs - Date.parse(t.convertedAt))}` : ""}.`, needsAttention: false };
  }
  if (t.inboundCount === 0) {
    return { state: "never_started", label: "Never messaged", detail: "Sandbox exists but the visitor has not sent anything.", needsAttention: false };
  }
  if (t.lastDirection === "outbound" && t.lastStatus === "failed") {
    return { state: "broken", label: "Send failed", detail: `PAM's last message failed to send${t.lastBody ? `: "${truncate(t.lastBody, 80)}"` : ""}.`, needsAttention: true };
  }
  if (t.lastDirection === "inbound" && age !== null && age > PAM_REPLY_GRACE_MS) {
    return { state: "broken", label: "No reply from PAM", detail: `Visitor wrote ${humanAge(age)} and PAM never answered${t.lastBody ? `: "${truncate(t.lastBody, 80)}"` : ""}.`, needsAttention: true };
  }
  if (t.lastDirection === "inbound") {
    return { state: "waiting_on_pam", label: "PAM replying", detail: "Visitor just wrote; PAM's reply is in flight.", needsAttention: false };
  }
  if (t.jobNextActionAt) {
    const dueIn = Date.parse(t.jobNextActionAt) - nowMs;
    if (dueIn > 0) {
      return { state: "active", label: "Scripted beat due", detail: `${demoStageLabel(t.jobStatus)} · next beat in ${Math.max(1, Math.round(dueIn / 1000))}s.`, needsAttention: false };
    }
    if (-dueIn > BEAT_OVERDUE_MS) {
      return { state: "broken", label: "Beat overdue", detail: `${demoStageLabel(t.jobStatus)} · a scripted beat was due ${humanAge(-dueIn)} and has not run (orchestrator cron?).`, needsAttention: true };
    }
  }
  if (t.expiresAt && Date.parse(t.expiresAt) < nowMs) {
    return { state: "expired", label: "Expired", detail: `Sandbox expired ${humanAge(nowMs - Date.parse(t.expiresAt))} without a sign-up.`, needsAttention: false };
  }
  if (age !== null && age > VISITOR_QUIET_MS) {
    return { state: "quiet", label: "Visitor went quiet", detail: `Nothing from the visitor for ${humanAge(age)}. Last thing PAM said: "${truncate(t.lastBody ?? "", 80)}". Nothing follows this up.`, needsAttention: true };
  }
  return { state: "waiting_on_visitor", label: "Waiting on visitor", detail: `PAM spoke last (${age === null ? "" : humanAge(age)}); ${demoStageLabel(t.jobStatus).toLowerCase()}.`, needsAttention: false };
}

export function truncate(s: string, n: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
}

export const THREAD_GROUPS: { state: ThreadState[]; title: string }[] = [
  { state: ["broken"], title: "Broken — PAM's side" },
  { state: ["quiet"], title: "Went quiet — nobody follows up" },
  { state: ["waiting_on_pam", "active", "waiting_on_visitor"], title: "Live" },
  { state: ["converted"], title: "Signed up" },
  { state: ["expired", "never_started"], title: "Expired or never started" },
];

export function groupThreads(threads: DemoThread[], now: Date = new Date()) {
  const verdicts = threads.map((t) => ({ thread: t, verdict: classifyThread(t, now) }));
  return THREAD_GROUPS.map((g) => ({
    title: g.title,
    items: verdicts
      .filter((v) => g.state.includes(v.verdict.state))
      .sort((a, b) => (Date.parse(b.thread.lastMessageAt ?? b.thread.startedAt) || 0) - (Date.parse(a.thread.lastMessageAt ?? a.thread.startedAt) || 0)),
  })).filter((g) => g.items.length > 0);
}

/** A long pause between two messages is what a break looks like on a phone. */
export const GAP_MARKER_MS = 10 * MIN;

export type ThreadItem =
  | { type: "gap"; ms: number; label: string }
  | { type: "message"; message: DemoMessage };

export function humanGap(ms: number): string {
  if (ms < HOUR) return `${Math.round(ms / MIN)} min later`;
  if (ms < 48 * HOUR) return `${Math.round(ms / HOUR)} hours later`;
  return `${Math.round(ms / (24 * HOUR))} days later`;
}

export function annotateGaps(messages: DemoMessage[]): ThreadItem[] {
  const out: ThreadItem[] = [];
  let prev: number | null = null;
  for (const m of messages) {
    const t = Date.parse(m.createdAt);
    if (prev !== null && t - prev > GAP_MARKER_MS) out.push({ type: "gap", ms: t - prev, label: humanGap(t - prev) });
    out.push({ type: "message", message: m });
    prev = t;
  }
  return out;
}
