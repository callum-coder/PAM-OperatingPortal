export type ModuleId = "gtm" | "finance" | "engineering" | "support" | "team";
export type PermissionAction = "read" | "write" | "assign";
export type PermissionId =
  | `${ModuleId}.${string}.${PermissionAction}`
  | "gtm.briefs.read"
  | "gtm.briefs.write"
  | "gtm.outreach.read"
  | "gtm.outreach.write"
  | "gtm.competitors.read"
  | "gtm.competitors.write"
  | "gtm.content.read"
  | "gtm.content.write"
  | "gtm.experiments.read"
  | "gtm.experiments.write"
  | "gtm.leads.read"
  | "gtm.leads.write"
  | "finance.overview.read"
  | "finance.overview.write";

export type Permission = {
  id: PermissionId;
  module: ModuleId;
  description: string;
};

export const ALL_PERMISSIONS: Permission[] = [
  { id: "gtm.briefs.read", module: "gtm", description: "Read GTM weekly briefs" },
  { id: "gtm.briefs.write", module: "gtm", description: "Generate and edit GTM weekly briefs" },
  { id: "gtm.outreach.read", module: "gtm", description: "Read GTM outreach loops" },
  { id: "gtm.outreach.write", module: "gtm", description: "Manage GTM outreach loops" },
  { id: "gtm.competitors.read", module: "gtm", description: "Read competitor monitoring" },
  { id: "gtm.competitors.write", module: "gtm", description: "Manage competitor monitoring" },
  { id: "gtm.content.read", module: "gtm", description: "Read content pipeline" },
  { id: "gtm.content.write", module: "gtm", description: "Manage content pipeline" },
  { id: "gtm.experiments.read", module: "gtm", description: "Read GTM experiments" },
  { id: "gtm.experiments.write", module: "gtm", description: "Manage GTM experiments" },
  { id: "gtm.leads.read", module: "gtm", description: "Read GTM lead engine" },
  { id: "gtm.leads.write", module: "gtm", description: "Manage GTM lead engine" },
  { id: "finance.overview.read", module: "finance", description: "Read the finance overview" },
  { id: "finance.overview.write", module: "finance", description: "Manage finance settings" },
];

const allPermissionIds = ALL_PERMISSIONS.map((permission) => permission.id);
const allReadPermissionIds = ALL_PERMISSIONS.filter((permission) =>
  permission.id.endsWith(".read"),
).map((permission) => permission.id);

export const ROLE_PERMISSIONS: Record<string, PermissionId[]> = {
  owner: allPermissionIds,
  sales: ["gtm.outreach.read", "gtm.outreach.write", "gtm.briefs.read", "gtm.leads.read", "gtm.leads.write"],
  ops: ["gtm.briefs.read", "gtm.content.read", "gtm.content.write"],
  engineering: [],
  finance: ["finance.overview.read", "finance.overview.write"],
  support: [],
  viewer: allReadPermissionIds,
};

export function getPermissionsForRoles(roles: string[]): PermissionId[] {
  return Array.from(new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? [])));
}

export function hasPermission(roles: string[], permission: string): boolean {
  return getPermissionsForRoles(roles).includes(permission as PermissionId);
}

export function getReadableModules(roles: string[]): ModuleId[] {
  const permissions = getPermissionsForRoles(roles);
  return Array.from(
    new Set(
      ALL_PERMISSIONS.filter((permission) => permissions.includes(permission.id)).map(
        (permission) => permission.module,
      ),
    ),
  );
}
