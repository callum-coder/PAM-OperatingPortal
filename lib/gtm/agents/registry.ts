import type { AgentDefinition, AgentId } from "./types";

// The GTM AI-Team roster. The GTM Lead is the coordinator; every other agent
// reports to it. Only agents with a real doctrine and build are "active"; the
// rest are "planned" so the AI-Team section can show the intended org chart.
export const agents: AgentDefinition[] = [
  {
    id: "gtm-lead",
    name: "GTM Lead",
    role: "Coordinator",
    reportsTo: null,
    description:
      "Orchestrates the GTM agent fleet, rolls up their runs, and surfaces the daily worklist.",
    module: "gtm",
    model: null,
    doctrine: [],
    schedule: null,
    outputs: ["system_status"],
    tools: "none",
    status: "planned",
  },
  {
    id: "content-strategist",
    name: "Content Strategist",
    role: "Content ideation",
    reportsTo: "gtm-lead",
    description:
      "Generates landlord-relevant content ideas daily, grounded in the Offers & Relevance doctrine and the live content pipeline.",
    module: "gtm",
    model: null,
    doctrine: ["content-offers.md"],
    schedule: "0 6 * * *",
    outputs: ["gtm_content_items", "gtm_agent_runs"],
    tools: "none",
    status: "active",
  },
  {
    id: "content-writer",
    name: "Content Writer",
    role: "Drafting",
    reportsTo: "content-strategist",
    description:
      "Drafts an approved idea into a full first draft on demand, grounded in the Drafting doctrine and the strategist's brief, then advances it to review.",
    module: "gtm",
    model: null,
    doctrine: ["content-drafting.md"],
    schedule: null,
    outputs: ["gtm_content_items", "gtm_agent_runs"],
    tools: "none",
    status: "active",
  },
  {
    id: "brief-analyst",
    name: "Brief Analyst",
    role: "Weekly synthesis",
    reportsTo: "gtm-lead",
    description:
      "Synthesises the weekly GTM brief from PAM read-only metrics and emits structured recommended actions. Falls back to a deterministic brief when Anthropic is unavailable.",
    module: "gtm",
    model: null,
    doctrine: ["brief-weekly.md"],
    schedule: null,
    outputs: ["gtm_briefs", "gtm_brief_actions", "gtm_agent_runs"],
    tools: "none",
    status: "active",
  },
  {
    id: "lead-finder",
    name: "Lead Finder",
    role: "Demand generation",
    reportsTo: "gtm-lead",
    description:
      "Designs the lead engine: Core Four lead-gen plays with the MTD deadline as the hook. Graduates to sourcing real contacts once a lead data source is connected.",
    module: "gtm",
    model: null,
    doctrine: ["leads-core-four.md"],
    schedule: "0 6 * * 1",
    outputs: ["gtm_lead_plays", "gtm_agent_runs"],
    tools: "none",
    status: "active",
  },
  {
    id: "competitor-scout",
    name: "Competitor Scout",
    role: "Market monitoring",
    reportsTo: "gtm-lead",
    description:
      "Watches competitor and regulation changes, classifies significance, and proposes content responses.",
    module: "gtm",
    model: null,
    doctrine: [],
    schedule: null,
    outputs: ["gtm_competitor_changes", "gtm_signals"],
    tools: "read-only",
    status: "planned",
  },
  {
    id: "outreach-operator",
    name: "Outreach Operator",
    role: "Outbound",
    reportsTo: "gtm-lead",
    description:
      "Drafts personalised outreach behind the readiness gate. Draft-only to start; auto-send is a gated graduation.",
    module: "gtm",
    model: null,
    doctrine: [],
    schedule: null,
    outputs: ["gtm_sequence_enrollments", "gtm_signals"],
    tools: "read-only",
    status: "planned",
  },
];

export function getAgent(id: AgentId): AgentDefinition | undefined {
  return agents.find((agent) => agent.id === id);
}

export function listAgents(): AgentDefinition[] {
  return agents;
}
