import {
  BarChart3,
  BriefcaseBusiness,
  Coins,
  FlaskConical,
  LayoutDashboard,
  Magnet,
  Megaphone,
  Newspaper,
  Radar,
  Route,
  type LucideIcon,
} from "lucide-react";

import type { PermissionId } from "@/lib/rbac/permissions";

// The sidebar is organised around the customer lifecycle, not the org chart:
// Command (hardcoded in the shell) → Acquire → Convert → Retain → Revenue.
// Each entry is a lifecycle section, not a team. Routes are unchanged — this is
// purely how the existing pages are grouped and labelled. "Retain" is omitted
// until the retention module (dunning + churn) exists; it slots between Convert
// and Revenue when its pages land.
export type ModuleRegistryEntry = {
  id: "acquire" | "convert" | "retain" | "revenue";
  label: string;
  href: string;
  requiredPermission: PermissionId;
  icon: LucideIcon;
  nav: {
    label: string;
    href: string;
    requiredPermission: PermissionId;
    icon: LucideIcon;
  }[];
};

export const modules: ModuleRegistryEntry[] = [
  {
    id: "acquire",
    label: "Acquire",
    href: "/gtm",
    requiredPermission: "gtm.briefs.read",
    icon: Megaphone,
    nav: [
      {
        label: "Pipeline",
        href: "/gtm",
        requiredPermission: "gtm.briefs.read",
        icon: LayoutDashboard,
      },
      {
        label: "Leads",
        href: "/gtm/leads",
        requiredPermission: "gtm.leads.read",
        icon: Magnet,
      },
      {
        label: "Outreach",
        href: "/gtm/outreach",
        requiredPermission: "gtm.outreach.read",
        icon: Radar,
      },
      {
        label: "Competitors",
        href: "/gtm/competitors",
        requiredPermission: "gtm.competitors.read",
        icon: BarChart3,
      },
      {
        label: "Content",
        href: "/gtm/content",
        requiredPermission: "gtm.content.read",
        icon: Newspaper,
      },
      {
        label: "Experiments",
        href: "/gtm/experiments",
        requiredPermission: "gtm.experiments.read",
        icon: FlaskConical,
      },
    ],
  },
  {
    id: "convert",
    label: "Convert",
    href: "/gtm/journey",
    requiredPermission: "gtm.briefs.read",
    icon: Route,
    nav: [
      {
        label: "Trial journey",
        href: "/gtm/journey",
        requiredPermission: "gtm.briefs.read",
        icon: Route,
      },
      {
        label: "Briefs",
        href: "/gtm/briefs",
        requiredPermission: "gtm.briefs.read",
        icon: BriefcaseBusiness,
      },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    href: "/finance",
    requiredPermission: "finance.overview.read",
    icon: Coins,
    nav: [
      {
        label: "Overview",
        href: "/finance",
        requiredPermission: "finance.overview.read",
        icon: LayoutDashboard,
      },
    ],
  },
];
