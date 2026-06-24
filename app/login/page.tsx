import { LockKeyhole } from "lucide-react";

import { hasPortalSupabaseConfig } from "@/lib/supabase";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = hasPortalSupabaseConfig();

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <section className="w-full max-w-md border border-[#d8ded0] bg-[#fbfcf7] p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-[#162016] text-[#d9ff73]">
            <LockKeyhole size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">PAM Operating Portal</h1>
            <p className="text-sm text-[#64715d]">Internal access only</p>
          </div>
        </div>

        {configured ? (
          <LoginForm />
        ) : (
          <div className="space-y-3 text-sm leading-6 text-[#4d5848]">
            <p>
              Configure `PORTAL_SUPABASE_URL`, `PORTAL_SUPABASE_ANON_KEY`, and
              `PORTAL_SUPABASE_SERVICE_ROLE_KEY` before signing in.
            </p>
            <p>
              The shell is intentionally closed until the portal database and auth
              project exist.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
