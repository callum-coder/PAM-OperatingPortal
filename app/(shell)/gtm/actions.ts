"use server";

import { revalidatePath } from "next/cache";

import {
  normalizeCompetitorWatchInput,
  normalizeContentItemInput,
  normalizeExperimentInput,
} from "@/lib/gtm/entity-inputs";
import { buildSignalStatusUpdate, type SignalWorkflowStatus } from "@/lib/gtm/signal-workflow";
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

  await supabase.from("gtm_signals").insert({
    product: "pam",
    source: "manual",
    signal_type: inputType,
    title,
    detail: detail || null,
    severity,
    status: "open",
    next_action: "Review and decide whether this becomes a brief action, campaign, content item, or experiment.",
    related_table: "gtm_manual_inputs",
    related_id: data.id,
  });

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
