import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  getPermissionsForRoles,
  hasPermission,
} from "./permissions";

describe("RBAC permission catalogue", () => {
  it("gives owner every registered permission", () => {
    const ownerPermissions = getPermissionsForRoles(["owner"]);

    expect(ownerPermissions.sort()).toEqual(ALL_PERMISSIONS.map((p) => p.id).sort());
  });

  it("keeps sales focused on outreach and briefs", () => {
    const salesPermissions = getPermissionsForRoles(["sales"]);

    expect(salesPermissions).toContain("gtm.outreach.read");
    expect(salesPermissions).toContain("gtm.outreach.write");
    expect(salesPermissions).toContain("gtm.briefs.read");
    expect(salesPermissions).not.toContain("gtm.experiments.write");
  });

  it("denies unknown roles and permissions by default", () => {
    expect(getPermissionsForRoles(["unknown-role"])).toEqual([]);
    expect(hasPermission(["viewer"], "finance.ledger.write")).toBe(false);
  });

  it("allows viewer read permissions only", () => {
    expect(hasPermission(["viewer"], "gtm.briefs.read")).toBe(true);
    expect(hasPermission(["viewer"], "gtm.briefs.write")).toBe(false);
  });
});
