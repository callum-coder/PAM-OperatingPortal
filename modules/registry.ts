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

export type ModuleRegistryEntry = {
  id: "gtm" | "finance" | "engineering" | "support" | "team";
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
    id: "gtm",
    label: "GTM",
    href: "/gtm",
    requiredPermission: "gtm.briefs.read",
    icon: Megaphone,
    nav: [
      {
        label: "Overview",
        href: "/gtm",
        requiredPermission: "gtm.briefs.read",
        icon: LayoutDashboard,
      },
      {
        label: "Briefs",
        href: "/gtm/briefs",
        requiredPermission: "gtm.briefs.read",
        icon: BriefcaseBusiness,
      },
      {
        label: "Trial journey",
        href: "/gtm/journey",
        requiredPermission: "gtm.briefs.read",
        icon: Route,
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
    id: "finance",
    label: "Finance",
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
