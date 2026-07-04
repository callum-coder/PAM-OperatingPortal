"use server";

import { revalidatePath } from "next/cache";

import {
  normalizeCompetitorWatchInput,
  normalizeContentItemInput,
  normalizeExperimentInput,
} from "@/lib/gtm/entity-inputs";
import { buildSignalStatusUpdate, type SignalWorkflowStatus } from "@/lib/gtm/signal-workflow";
import { executeContentWriter } from "@/lib/gtm/agents/content-writer";
import { executeLeadFinder } from "@/lib/gtm/agents/lead-finder";
import { executeCompetitorScout } from "@/lib/gtm/agents/competitor-scout";
import { executeOutreachOperator } from "@/lib/gtm/agents/outreach-operator";
import { requirePermission } from "@/lib/rbac/guard";
import { createPortalAdminClient } from "@/lib/supabase";

export type ActionState = {
  error?: string;
  ok?: boolean;
};

const readinessStatuses = new Set(["pending", "approved", "blocked", "not_applicable"]);

export async function createManualInput(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("gtm.content.write");
  const inputType = String(formData.get("input_type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const severity = String(formData.get("severity") ?? "medium");

  if (!inputType || !title) {
    return { error: "Choose a type and enter a title." };
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("gtm_manual_inputs")
    .insert({
      product: "pam",
      input_type: inputType,
      title,
      detail: detail || null,
      severity,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // gtm_signals has a unique (source, signal_type, product) key for the
  // system_status upsert; suffix manual signals with the input id so repeated
  // inputs of the same type never collide.
  const { error: signalError } = await supabase.from("gtm_signals").insert({
    product: "pam",
    source: "manual",
    signal_type: `${inputType}_${data.id}`,
    title,
    detail: detail || null,
    severity,
    status: "open",
    next_action: "Review and decide whether this becomes a brief action, campaign, content item, or experiment.",
    related_table: "gtm_manual_inputs",
    related_id: data.id,
  });

  if (signalError) {
    return { error: `Input saved, but its signal failed: ${signalError.message}` };
  }

  revalidatePath("/gtm");
  return { ok: true };
}

export async function updateSignalStatus(formData: FormData) {
  await requirePermission("gtm.outreach.write");

  const signalId = String(formData.get("signal_id") ?? "");
  const status = String(formData.get("status") ?? "") as SignalWorkflowStatus;

  if (!signalId) {
    return;
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase
    .from("gtm_signals")
    .update(buildSignalStatusUpdate(status))
    .eq("id", signalId);

  if (error) {
    throw new Error(`Failed to update signal: ${error.message}`);
  }

  revalidatePath("/gtm");
}

export async function updateOutreachReadiness(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("gtm.outreach.write");
  const key = String(formData.get("key") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!key || !readinessStatuses.has(status)) {
    return { error: "Choose a valid readiness status." };
  }

  const now = new Date().toISOString();
  const supabase = createPortalAdminClient();
  const { error } = await supabase
    .from("gtm_outreach_readiness_checks")
    .update({
      status,
      notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("key", key);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gtm");
  return { ok: true };
}

export async function createCampaign(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("gtm.experiments.write");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Enter a campaign name." };
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("gtm_campaigns").insert({
    product: "pam",
    name,
    audience: String(formData.get("audience") ?? "").trim() || null,
    message: String(formData.get("message") ?? "").trim() || null,
    channel: String(formData.get("channel") ?? "").trim() || null,
    landing_page_url: String(formData.get("landing_page_url") ?? "").trim() || null,
    status: "planned",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gtm");
  return { ok: true };
}

export async function createCompetitorWatch(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("gtm.competitors.write");
  const normalized = normalizeCompetitorWatchInput(Object.fromEntries(formData));

  if ("error" in normalized) {
    return { error: normalized.error };
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("gtm_competitor_watch").insert(normalized.value);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gtm");
  revalidatePath("/gtm/competitors");
  return { ok: true };
}

export async function createContentItem(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("gtm.content.write");
  const normalized = normalizeContentItemInput(Object.fromEntries(formData));

  if ("error" in normalized) {
    return { error: normalized.error };
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("gtm_content_items").insert(normalized.value);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gtm");
  revalidatePath("/gtm/content");
  return { ok: true };
}

// Hands an approved idea to the Content Writer agent, which drafts it and moves
// it to the review stage.
export async function draftContentItem(formData: FormData) {
  await requirePermission("gtm.content.write");

  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) {
    return;
  }

  await executeContentWriter(itemId);
  revalidatePath("/gtm/content");
  revalidatePath(`/gtm/content/${itemId}`);
  revalidatePath("/ai-team");
}

const CONTENT_STAGES = new Set(["idea", "drafting", "review", "scheduled", "published", "parked"]);

// Saves a human-edited draft without changing the stage.
export async function saveContentDraft(formData: FormData) {
  await requirePermission("gtm.content.write");

  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) {
    return;
  }

  const draft = String(formData.get("draft") ?? "");
  const supabase = createPortalAdminClient();
  const { error } = await supabase
    .from("gtm_content_items")
    .update({ draft, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to save draft: ${error.message}`);
  }

  revalidatePath(`/gtm/content/${itemId}`);
}

// Advances (or returns) a content item through the pipeline stages.
export async function setContentStage(formData: FormData) {
  await requirePermission("gtm.content.write");

  const itemId = String(formData.get("item_id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!itemId || !CONTENT_STAGES.has(stage)) {
    return;
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    stage,
    stage_changed_at: now,
    updated_at: now,
  };

  const scheduledFor = String(formData.get("scheduled_for") ?? "").trim();
  const publishedUrl = String(formData.get("published_url") ?? "").trim();
  if (stage === "scheduled" && scheduledFor) {
    update.scheduled_for = scheduledFor;
  }
  if (stage === "published" && publishedUrl) {
    update.published_url = publishedUrl;
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("gtm_content_items").update(update).eq("id", itemId);

  if (error) {
    throw new Error(`Failed to update content stage: ${error.message}`);
  }

  revalidatePath("/gtm/content");
  revalidatePath(`/gtm/content/${itemId}`);
}

// Runs the Lead Finder agent to refresh the Core Four lead-gen plays.
export async function generateLeadPlays() {
  await requirePermission("gtm.leads.write");
  await executeLeadFinder();
  revalidatePath("/gtm/leads");
  revalidatePath("/gtm");
  revalidatePath("/ai-team");
}

const TARGET_METRICS = new Map(
  [
    ["payingTotal", "Paying customers"],
    ["trialsStarted7d", "Trials started (7d)"],
    ["trialsConverted7d", "Trials converted (7d)"],
    ["trialsActive", "Trials active"],
    ["crmContacts", "CRM contacts"],
    ["crmLeads", "CRM leads"],
  ] as const,
);

// Sets or updates a revenue/funnel target shown on the Trial journey page and
// read by the Brief Analyst and GTM Lead standup.
export async function upsertTarget(formData: FormData) {
  await requirePermission("gtm.briefs.write");

  const metric = String(formData.get("metric") ?? "");
  const target = Number(formData.get("target"));
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const label = TARGET_METRICS.get(metric as Parameters<typeof TARGET_METRICS.get>[0]);

  if (!label || !Number.isFinite(target) || target <= 0) {
    return;
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("gtm_targets").upsert(
    {
      product: "pam",
      metric,
      label,
      target,
      due_date: dueDate || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "metric" },
  );

  if (error) {
    throw new Error(`Failed to save target: ${error.message}`);
  }

  revalidatePath("/gtm/journey");
}

export async function deleteTarget(formData: FormData) {
  await requirePermission("gtm.briefs.write");

  const metric = String(formData.get("metric") ?? "");
  if (!metric) return;

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("gtm_targets").delete().eq("metric", metric);
  if (error) {
    throw new Error(`Failed to delete target: ${error.message}`);
  }

  revalidatePath("/gtm/journey");
}

// Hands a lead play to the Outreach Operator, which drafts copy (draft-only —
// nothing sends) into gtm_outreach_drafts.
export async function draftOutreachForPlay(formData: FormData) {
  await requirePermission("gtm.outreach.write");

  const playId = String(formData.get("play_id") ?? "");
  if (!playId) return;

  await executeOutreachOperator(playId);
  revalidatePath("/gtm/outreach");
  revalidatePath("/gtm/leads");
  revalidatePath("/ai-team");
}

const OUTREACH_DRAFT_STATUSES = new Set(["draft", "approved", "archived"]);

export async function setOutreachDraftStatus(formData: FormData) {
  await requirePermission("gtm.outreach.write");

  const draftId = String(formData.get("draft_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!draftId || !OUTREACH_DRAFT_STATUSES.has(status)) return;

  const supabase = createPortalAdminClient();
  const { error } = await supabase
    .from("gtm_outreach_drafts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", draftId);

  if (error) {
    throw new Error(`Failed to update outreach draft: ${error.message}`);
  }

  revalidatePath("/gtm/outreach");
}

// Runs the Competitor Scout: fetch each watched page, diff, and record changes.
export async function scanCompetitors() {
  await requirePermission("gtm.competitors.write");
  await executeCompetitorScout();
  revalidatePath("/gtm/competitors");
  revalidatePath("/gtm");
  revalidatePath("/ai-team");
}

export async function createExperiment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("gtm.experiments.write");
  const normalized = normalizeExperimentInput(Object.fromEntries(formData));

  if ("error" in normalized) {
    return { error: normalized.error };
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("gtm_experiments").insert(normalized.value);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gtm");
  revalidatePath("/gtm/experiments");
  return { ok: true };
}
