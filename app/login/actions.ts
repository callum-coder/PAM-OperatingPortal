"use server";

import { redirect } from "next/navigation";

import { createPortalServerClient, hasPortalSupabaseConfig } from "@/lib/supabase";

export type LoginState = {
  error?: string;
};

export async function signInWithPassword(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!hasPortalSupabaseConfig()) {
    return { error: "Portal Supabase is not configured." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createPortalServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
