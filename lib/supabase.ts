import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function hasPortalSupabaseConfig(): boolean {
  return Boolean(
    process.env.PORTAL_SUPABASE_URL &&
      process.env.PORTAL_SUPABASE_ANON_KEY &&
      process.env.PORTAL_SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function createPortalServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    readRequiredEnv("PORTAL_SUPABASE_URL"),
    readRequiredEnv("PORTAL_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; route handlers and actions can.
          }
        },
      },
    },
  );
}

export function createPortalAdminClient() {
  return createClient(
    readRequiredEnv("PORTAL_SUPABASE_URL"),
    readRequiredEnv("PORTAL_SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
