import "server-only";

import { DEFAULT_PRODUCT_KEY } from "@/lib/products";
import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import {
  summarizeLifecycle,
  type LifecycleStage,
  type LifecycleSummary,
} from "./lifecycle";

export type CustomerProfileRow = {
  id: string;
  product: string;
  external_user_id: string | null;
  email: string | null;
  display_name: string | null;
  lifecycle_stage: LifecycleStage;
  plan: string | null;
  mrr: number | null;
  health_score: number | null;
  last_seen_at: string | null;
  activated_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LifecycleEventRow = {
  id: string;
  product: string;
  customer_id: string | null;
  external_user_id: string | null;
  event_name: string;
  stage: LifecycleStage | null;
  occurred_at: string;
  source: string;
  properties: Record<string, unknown> | null;
};

export type CustomerLifecycleSnapshot = {
  customers: CustomerProfileRow[];
  events: LifecycleEventRow[];
  summary: LifecycleSummary;
};

export async function getCustomerLifecycleSnapshot(
  product = DEFAULT_PRODUCT_KEY,
): Promise<CustomerLifecycleSnapshot> {
  if (!hasPortalSupabaseConfig()) {
    return {
      customers: [],
      events: [],
      summary: summarizeLifecycle([]),
    };
  }

  const supabase = createPortalAdminClient();
  const [customersResult, eventsResult] = await Promise.all([
    supabase
      .from("gtm_customer_profiles")
      .select(
        "id,product,external_user_id,email,display_name,lifecycle_stage,plan,mrr,health_score,last_seen_at,activated_at,converted_at,created_at,updated_at",
      )
      .eq("product", product)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("gtm_lifecycle_events")
      .select("id,product,customer_id,external_user_id,event_name,stage,occurred_at,source,properties")
      .eq("product", product)
      .order("occurred_at", { ascending: false })
      .limit(25),
  ]);

  if (customersResult.error || eventsResult.error) {
    return {
      customers: [],
      events: [],
      summary: summarizeLifecycle([]),
    };
  }

  const customers = (customersResult.data ?? []) as CustomerProfileRow[];

  return {
    customers,
    events: (eventsResult.data ?? []) as LifecycleEventRow[],
    summary: summarizeLifecycle(customers),
  };
}
