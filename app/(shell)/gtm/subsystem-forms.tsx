"use client";

import { useActionState } from "react";
import { Eye, FlaskConical, PenLine } from "lucide-react";

import {
  createCompetitorWatch,
  createContentItem,
  createExperiment,
  type ActionState,
} from "./actions";

const initialState: ActionState = {};

export function CompetitorWatchForm() {
  const [state, action, pending] = useActionState(createCompetitorWatch, initialState);

  return (
    <form action={action} className="portal-panel space-y-4">
      <div>
        <p className="portal-kicker">Watchlist</p>
        <h2 className="portal-section-title">Add competitor watch</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Competitor</span>
          <input className="portal-input" name="competitor" required />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Watch type</span>
          <select className="portal-input" name="watch_type" defaultValue="pricing">
            <option value="pricing">Pricing</option>
            <option value="features">Features</option>
            <option value="content">Content</option>
            <option value="hiring">Hiring</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">URL</span>
        <input className="portal-input" name="url" required type="url" />
      </label>
      {state.error ? <p className="text-sm text-[#9a241b]">{state.error}</p> : null}
      <button className="portal-primary-button" disabled={pending} type="submit">
        <Eye size={18} />
        {pending ? "Adding" : "Add watch"}
      </button>
    </form>
  );
}

export function ContentItemForm() {
  const [state, action, pending] = useActionState(createContentItem, initialState);

  return (
    <form action={action} className="portal-panel space-y-4">
      <div>
        <p className="portal-kicker">Pipeline</p>
        <h2 className="portal-section-title">Create content item</h2>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Title</span>
        <input className="portal-input" name="title" required />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Target keyword</span>
          <input className="portal-input" name="target_keyword" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Stage</span>
          <select className="portal-input" name="stage" defaultValue="idea">
            <option value="idea">Idea</option>
            <option value="drafting">Drafting</option>
            <option value="review">Review</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <ScoreSelect label="Intent" name="keyword_intent" />
        <ScoreSelect label="Fit" name="product_fit" />
        <ScoreSelect label="MTD urgency" name="mtd_urgency" />
        <ScoreSelect label="Effort" name="effort" />
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Notes</span>
        <textarea className="portal-input min-h-20" name="notes" />
      </label>
      {state.error ? <p className="text-sm text-[#9a241b]">{state.error}</p> : null}
      <button className="portal-primary-button" disabled={pending} type="submit">
        <PenLine size={18} />
        {pending ? "Creating" : "Create content"}
      </button>
    </form>
  );
}

export function ExperimentForm() {
  const [state, action, pending] = useActionState(createExperiment, initialState);

  return (
    <form action={action} className="portal-panel space-y-4">
      <div>
        <p className="portal-kicker">Experiment</p>
        <h2 className="portal-section-title">Design experiment</h2>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Name</span>
        <input className="portal-input" name="name" required />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[#33402f]">Hypothesis</span>
        <textarea className="portal-input min-h-20" name="hypothesis" />
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Metric</span>
          <input className="portal-input" name="metric" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Baseline</span>
          <input className="portal-input" name="baseline" type="number" step="0.01" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#33402f]">Target</span>
          <input className="portal-input" name="target" type="number" step="0.01" />
        </label>
      </div>
      {state.error ? <p className="text-sm text-[#9a241b]">{state.error}</p> : null}
      <button className="portal-primary-button" disabled={pending} type="submit">
        <FlaskConical size={18} />
        {pending ? "Creating" : "Create experiment"}
      </button>
    </form>
  );
}

function ScoreSelect({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#33402f]">{label}</span>
      <select className="portal-input" name={name} defaultValue="3">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </label>
  );
}
