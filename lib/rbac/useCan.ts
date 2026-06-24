"use client";

import { hasPermission } from "./permissions";

export function useCan(roles: string[], permission: string): boolean {
  return hasPermission(roles, permission);
}
