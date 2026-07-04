import "server-only";

import { createPortalAdminClient, hasPortalSupabaseConfig } from "@/lib/supabase";
import { anthropicConfig } from "./anthropic";
import { hasHubspotConfig } from "./hubspot";
import { classifyPamReadonlyConfig } from "./gtm/pam-readonly-config";
import { hasXeroConfig } from "./xero";

export type IntegrationStatus = "connected" | "degraded" | "missing" | "planned";

export type IntegrationHealthRow = {
  key: string;
  product: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  env_keys: string[] | null;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  notes: string | null;
};

const runtimeChecks: Record<string, () => IntegrationStatus> = {
  hubspot: () => (hasHubspotConfig() ? "connected" : "missing"),
  xero: () => (hasXeroConfig() ? "connected" : "missing"),
  anthropic: () => (anthropicConfig.apiKey ? "connected" : "missing"),
  slack: () =>
    process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID ? "connected" : "missing",
  "pam-readonly": () =>
    classifyPamReadonlyConfig(process.env.PAM_DATABASE_URL_READONLY) === "postgres"
      ? "connected"
      : "missing",
};

export async function getIntegrationHealth(): Promise<IntegrationHealthRow[]> {
  if (!hasPortalSupabaseConfig()) {
    return defaultIntegrations();
  }

  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("portal_integrations")
    .select("key,product,name,category,status,env_keys,last_checked_at,last_success_at,last_error,notes")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as IntegrationHealthRow[]).map((integration) => ({
    ...integration,
    status: runtimeChecks[integration.key]?.() ?? integration.status,
  }));
}

function defaultIntegrations(): IntegrationHealthRow[] {
  return [
    {
      key: "anthropic",
      product: "pam",
      name: "Anthropic",
      category: "AI",
      status: runtimeChecks.anthropic(),
      env_keys: ["ANTHROPIC_API_KEY"],
      last_checked_at: null,
      last_success_at: null,
      last_error: null,
      notes: "Structured agent synthesis and drafting.",
    },
    {
      key: "hubspot",
      product: "pam",
      name: "HubSpot",
      category: "CRM",
      status: runtimeChecks.hubspot(),
      env_keys: ["HUBSPOT_ACCESS_TOKEN"],
      last_checked_at: null,
      last_success_at: null,
      last_error: null,
      notes: "Pipeline, contacts, lead capture, and subscriptions.",
    },
    {
      key: "pam-readonly",
      product: "pam",
      name: "PAM readonly database",
      category: "Product data",
      status: runtimeChecks["pam-readonly"](),
      env_keys: ["PAM_DATABASE_URL_READONLY"],
      last_checked_at: null,
      last_success_at: null,
      last_error: null,
      notes: "Trial, activation, customer, and funnel aggregates.",
    },
    {
      key: "slack",
      product: "pam",
      name: "Slack",
      category: "Team",
      status: runtimeChecks.slack(),
      env_keys: ["SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID"],
      last_checked_at: null,
      last_success_at: null,
      last_error: null,
      notes: "Daily standups and agent notifications.",
    },
    {
      key: "xero",
      product: "pam",
      name: "Xero",
      category: "Finance",
      status: runtimeChecks.xero(),
      env_keys: ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET"],
      last_checked_at: null,
      last_success_at: null,
      last_error: null,
      notes: "Read-only management accounts and P&L reporting.",
    },
  ];
}
