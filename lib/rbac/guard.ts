import "server-only";

import { redirect } from "next/navigation";

import {
  createPortalAdminClient,
  createPortalServerClient,
  hasPortalSupabaseConfig,
} from "@/lib/supabase";
import { hasPermission } from "./permissions";

export type PortalUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

export async function getCurrentPortalUser(): Promise<PortalUser | null> {
  if (!hasPortalSupabaseConfig()) {
    return null;
  }

  const authClient = await createPortalServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const adminClient = createPortalAdminClient();
  const { data: portalUser } = await adminClient
    .from("portal_users")
    .select("id,email,display_name,is_active,user_roles(role_id)")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!portalUser) {
    return null;
  }

  const roles =
    portalUser.user_roles?.map((role: { role_id: string }) => role.role_id) ?? [];

  return {
    id: portalUser.id,
    email: portalUser.email,
    displayName: portalUser.display_name,
    roles,
  };
}

export async function requireUser(): Promise<PortalUser> {
  const user = await getCurrentPortalUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePermission(permission: string): Promise<PortalUser> {
  const user = await requireUser();

  if (!hasPermission(user.roles, permission)) {
    redirect("/dashboard");
  }

  return user;
}
