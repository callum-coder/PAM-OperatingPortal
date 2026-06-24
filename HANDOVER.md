# PAM Operating Portal

This repo is the internal operating portal for PAM. It is separate from the
customer-facing PAM application and must stay that way.

Current scaffold:

- Next.js App Router on Vercel
- Supabase Auth and portal-owned Postgres schema
- Server-only portal Supabase service client
- Read-only PAM database boundary placeholder
- Shell-level RBAC catalogue, guard, and role-aware module registry
- Shared `system_status` spine with tested upsert payload builder
- GTM module routes and cron placeholders

Important boundary:

- The portal writes only to its own Supabase project.
- PAM data access must use `PAM_DATABASE_URL_READONLY`.
- Customer PAM aggregate SQL templates live in `supabase/customer-pam/` and
  must be applied to the customer-facing PAM Supabase project, not the Operating
  Portal project.
- Background jobs must end with `upsertStatus()`.
- Roadmap modules should register through `modules/registry.ts`; do not hard-code
  shell nav per module.

Next phase:

1. Create the portal Supabase project.
2. Apply migrations in `supabase/migrations`.
3. Add Callum to `portal_users` and assign `owner` in `user_roles`.
4. Implement the login action/provider choice.
5. Build GTM Weekly Briefs against PAM read-only data.
