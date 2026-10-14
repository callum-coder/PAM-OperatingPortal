// The visitor's phone, as a server-rendered component. No data access here
// so it can be rendered with fixture messages (see phone.test.tsx).
import { FileText, Image as ImageIcon, Mic } from "lucide-react";

import { stripMirrorLabel, type DemoMessage, type DemoThread, type ThreadItem, type ThreadVerdict } from "@/lib/gtm/demo-threads";

const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" });

/** Adds a day label to the first message of each day. Pure. */
export function withDayLabels(items: ThreadItem[]): { item: ThreadItem; dayLabel: string | null }[] {
  const out: { item: ThreadItem; dayLabel: string | null }[] = [];
  let lastDay = "";
  for (const item of items) {
    if (item.type !== "message") {
      out.push({ item, dayLabel: null });
      continue;
    }
    const d = day.format(new Date(item.message.createdAt));
    out.push({ item, dayLabel: d === lastDay ? null : d });
    lastDay = d;
  }
  return out;
}

export function Phone({ thread, items, verdict }: { thread: DemoThread; items: ThreadItem[]; verdict: ThreadVerdict }) {
  const rows = withDayLabels(items);
  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="overflow-hidden rounded-[2.2rem] border-[10px] border-[#111] bg-[#111] shadow-xl">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 pb-3 pt-4 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d9ff73] text-sm font-bold text-[#162016]">P</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">PAM demo</p>
            <p className="truncate text-[11px] text-white/80">+44 7868 264023 · {thread.actingAs === "tenant" ? "you are the tenant" : "you are the landlord"}</p>
          </div>
        </div>
        <div className="max-h-[70vh] min-h-[28rem] space-y-1.5 overflow-y-auto bg-[#e5ddd5] px-3 py-3" style={{ backgroundImage: "radial-gradient(#d9d2c8 0.6px, transparent 0.6px)", backgroundSize: "14px 14px" }}>
          {items.length === 0 ? (
            <p className="mx-auto mt-16 w-fit rounded-md bg-[#fff5c4] px-3 py-1 text-center text-[11px] text-[#5c4b00] shadow-sm">
              No messages yet. The visitor has not written to this number.
            </p>
          ) : null}
          {rows.map(({ item, dayLabel }, i) => {
            if (item.type === "gap") {
              return (
                <p key={`gap-${i}`} className="mx-auto my-3 w-fit rounded-full bg-[#ffe9b3] px-3 py-0.5 text-[11px] font-medium text-[#7a4b00] shadow-sm">
                  ⏱ {item.label}
                </p>
              );
            }
            const m = item.message;
            return (
              <div key={m.id}>
                {dayLabel ? <p className="mx-auto my-2 w-fit rounded-md bg-[#dbe7ef] px-2 py-0.5 text-[11px] text-[#3c4a52] shadow-sm">{dayLabel}</p> : null}
                <Bubble m={m} />
              </div>
            );
          })}
          {verdict.needsAttention ? (
            <p className="mx-auto mt-4 w-fit max-w-[90%] rounded-md bg-[#fde8e8] px-3 py-1.5 text-center text-[11px] font-medium text-[#8a1f1f] shadow-sm">
              ⚠ {verdict.label}: {verdict.detail}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 bg-[#f0f0f0] px-3 py-2">
          <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-xs text-[#9aa09a]">Message</div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#075e54] text-white"><Mic size={14} /></span>
        </div>
      </div>
    </div>
  );
}

export function Bubble({ m }: { m: DemoMessage }) {
  const mine = m.direction === "inbound"; // the visitor's own messages sit on the right of their phone
  const text = stripMirrorLabel(m.body, m.isMirror);
  const failed = m.status === "failed";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`relative rounded-lg px-2.5 py-1.5 text-[13px] leading-snug shadow-sm ${
            mine ? "bg-[#dcf8c6] text-[#111]" : m.isMirror ? "border-l-4 border-[#6c63d4] bg-white text-[#111]" : "bg-white text-[#111]"
          } ${failed ? "ring-2 ring-[#e05252]" : ""}`}
        >
          {m.isMirror && m.mirrorLabel ? (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#6c63d4]">{m.mirrorLabel} · what the other side gets</p>
          ) : null}
          {m.templateName ? <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#71806a]">template · {m.templateName}</p> : null}
          {m.kind === "document" ? (
            <div className="flex items-center gap-2 rounded-md bg-[#f3f3f3] px-2 py-1.5">
              <FileText size={16} className="text-[#6c63d4]" />
              <span className="text-xs">{m.documentKind ? `${m.documentKind} (PDF)` : "Document (PDF)"}</span>
            </div>
          ) : null}
          {m.mediaType && m.mediaType !== "text" ? (
            <p className="mb-1 flex items-center gap-1 text-xs text-[#555]"><ImageIcon size={14} /> {m.mediaType} attached</p>
          ) : null}
          {text ? <p className="whitespace-pre-wrap break-words">{text}</p> : m.buttonPayload ? <p className="italic">tapped: {m.buttonPayload}</p> : null}
          <p className={`mt-1 text-right text-[10px] ${failed ? "text-[#b42318]" : "text-[#777]"}`}>
            {time.format(new Date(m.createdAt))}
            {!mine && m.status ? ` · ${m.status}` : ""}
            {mine && m.audience === "tenant" ? " · as tenant" : ""}
          </p>
          {failed && m.error ? <p className="mt-1 text-[10px] text-[#b42318]">{m.error}</p> : null}
        </div>
        {!mine && m.buttons && m.buttons.length > 0 ? (
          <div className="flex w-full flex-col gap-1">
            {m.buttons.map((b) => (
              <span key={b.id} className="rounded-lg bg-white px-2 py-1 text-center text-[12px] font-medium text-[#1e88e5] shadow-sm">
                {b.title}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

