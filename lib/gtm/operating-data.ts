import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import {
  buildNextBestActions,
  sortSignalsByPriority,
  type GtmSignal,
  type NextBestAction,
} from "./operating-loop";

export type GtmSignalRow = {
  id: string;
  product: string;
  source: string;
  signal_type: string;
  title: string;
  detail: string | null;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "closed" | "snoozed";
  due_date: string | null;
  next_action: string | null;
  created_at: string;
};

export type GtmBriefActionRow = {
  id: string;
  action_type: string;
  title: string;
  detail: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
};

export type GtmCampaignRow = {
  id: string;
  name: string;
  channel: string | null;
  audience: string | null;
  status: string;
  spend: number | null;
  learning: string | null;
  created_at: string;
};

export type GtmManualInputRow = {
  id: string;
  input_type: string;
  title: string;
  detail: string | null;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  created_at: string;
};

export type GtmOutreachReadinessRow = {
  key: string;
  title: string;
  description: string | null;
  blocking: boolean;
  status: "pending" | "approved" | "blocked" | "not_applicable";
  notes: string | null;
  reviewed_at: string | null;
};

export type GtmOperatingSnapshot = {
  signals: GtmSignalRow[];
  actions: GtmBriefActionRow[];
  campaigns: GtmCampaignRow[];
  manualInputs: GtmManualInputRow[];
  outreachReadiness: GtmOutreachReadinessRow[];
  nextBestActions: NextBestAction[];
};

export async function getGtmOperatingSnapshot(): Promise<GtmOperatingSnapshot> {
  if (!hasPortalSupabaseConfig()) {
    return {
      signals: [],
      actions: [],
      campaigns: [],
      manualInputs: [],
      outreachReadiness: [],
      nextBestActions: [],
    };
  }

  const supabase = createPortalAdminClient();
  const [signalsResult, actionsResult, campaignsResult, manualResult, readinessResult, statusResult] =
    await Promise.all([
      supabase
        .from("gtm_signals")
        .select("id,product,source,signal_type,title,detail,severity,status,due_date,next_action,created_at")
        .in("status", ["open", "in_progress", "snoozed"])
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("gtm_brief_actions")
        .select("id,action_type,title,detail,due_date,status,created_at")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("gtm_campaigns")
        .select("id,name,channel,audience,status,spend,learning,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("gtm_manual_inputs")
        .select("id,input_type,title,detail,severity,status,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("gtm_outreach_readiness_checks")
        .select("key,title,description,blocking,status,notes,reviewed_at")
        .order("blocking", { ascending: false })
        .order("key", { ascending: true }),
      supabase
        .from("system_status")
        .select("subsystem,status,headline,needs_attention")
        .eq("module", "gtm"),
    ]);

  for (const result of [
    signalsResult,
    actionsResult,
    campaignsResult,
    manualResult,
    readinessResult,
    statusResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const signals = sortSignalsByPriority(
    ((signalsResult.data ?? []) as GtmSignalRow[]).map((signal) => ({
      ...signal,
      dueDate: signal.due_date,
      createdAt: signal.created_at,
    })) satisfies (GtmSignalRow & GtmSignal)[],
  );

  return {
    signals,
    actions: (actionsResult.data ?? []) as GtmBriefActionRow[],
    campaigns: (campaignsResult.data ?? []) as GtmCampaignRow[],
    manualInputs: (manualResult.data ?? []) as GtmManualInputRow[],
    outreachReadiness: (readinessResult.data ?? []) as GtmOutreachReadinessRow[],
    nextBestActions: buildNextBestActions((statusResult.data ?? []) as []),
  };
}
