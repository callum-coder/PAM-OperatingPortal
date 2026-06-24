"use client";

import { useActionState } from "react";
import { Lightbulb, Plus } from "lucide-react";

import type { GtmOutreachReadinessRow } from "@/lib/gtm/operating-data";
import {
  createCampaign,
  createManualInput,
  updateOutreachReadiness,
  type ActionState,
} from "./actions";

const initialState: ActionState = {};

export function ManualInputForm() {
  const [state, action, pending] = useActionState(createManualInput, initialState);

  return (
    <form action={action} className="portal-panel space-y-4">
      <div>
        <p className="portal-kicker">Manual signal</p>
        <h2 className="portal-section-title">Capture GTM input</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Type</span>
          <select className="portal-input" name="input_type" defaultValue="objection">
            <option value="customer_call_note">Customer call note</option>
            <option value="objection">Objection</option>
            <option value="competitor_mention">Competitor mention</option>
            <option value="feature_request">Feature request</option>
            <option value="churn_reason">Churn reason</option>
            <option value="campaign_idea">Campaign idea</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Severity</span>
          <select className="portal-input" name="severity" defaultValue="medium">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Title</span>
        <input className="portal-input" name="title" required />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Detail</span>
        <textarea className="portal-input min-h-24" name="detail" />
      </label>
      {state.error ? <p className="text-sm text-[#9a241b]">{state.error}</p> : null}
      <button className="portal-primary-button" disabled={pending} type="submit">
        <Lightbulb size={18} />
        {pending ? "Capturing" : "Capture input"}
      </button>
    </form>
  );
}

export function CampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, initialState);

  return (
    <form action={action} className="portal-panel space-y-4">
      <div>
        <p className="portal-kicker">Campaign record</p>
        <h2 className="portal-section-title">Create campaign</h2>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Name</span>
        <input className="portal-input" name="name" required />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Audience</span>
          <input className="portal-input" name="audience" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Channel</span>
          <input className="portal-input" name="channel" />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Message</span>
        <textarea className="portal-input min-h-20" name="message" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Landing page</span>
        <input className="portal-input" name="landing_page_url" />
      </label>
      {state.error ? <p className="text-sm text-[#9a241b]">{state.error}</p> : null}
      <button className="portal-primary-button" disabled={pending} type="submit">
        <Plus size={18} />
        {pending ? "Creating" : "Create campaign"}
      </button>
    </form>
  );
}

export function OutreachReadinessChecklist({
  checks,
}: {
  checks: GtmOutreachReadinessRow[];
}) {
  return (
    <div className="portal-panel space-y-4">
      <div>
        <p className="portal-kicker">Outreach gate</p>
        <h2 className="portal-section-title">Readiness checklist</h2>
      </div>
      {checks.length ? (
        <div className="space-y-4">
          {checks.map((check) => (
            <ReadinessCheckForm check={check} key={check.key} />
          ))}
        </div>
      ) : (
        <p className="portal-muted">No outreach readiness checks configured.</p>
      )}
    </div>
  );
}

function ReadinessCheckForm({ check }: { check: GtmOutreachReadinessRow }) {
  const [state, action, pending] = useActionState(updateOutreachReadiness, initialState);

  return (
    <form action={action} className="border-t border-[#dfe5d8] pt-4 first:border-t-0 first:pt-0">
      <input name="key" type="hidden" value={check.key} />
      <div className="grid gap-3 md:grid-cols-[1fr_190px]">
        <div>
          <p className="font-medium">{check.title}</p>
          {check.description ? <p className="portal-muted mt-1">{check.description}</p> : null}
          <p className="portal-muted mt-1 text-xs uppercase">
            {check.blocking ? "Blocking" : "Advisory"} / {check.status}
          </p>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Status</span>
          <select className="portal-input" name="status" defaultValue={check.status}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="blocked">Blocked</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Notes</span>
        <textarea className="portal-input min-h-16" name="notes" defaultValue={check.notes ?? ""} />
      </label>
      {state.error ? <p className="mt-2 text-sm text-[#9a241b]">{state.error}</p> : null}
      <button className="portal-secondary-button mt-3" disabled={pending} type="submit">
        {pending ? "Saving" : "Save readiness"}
      </button>
    </form>
  );
}
