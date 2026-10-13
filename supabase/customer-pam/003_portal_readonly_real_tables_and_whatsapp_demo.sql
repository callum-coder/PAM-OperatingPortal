-- migration-059 — the Operating Portal's read-only view of PAM, on real tables,
-- plus demo-line → signup attribution.
--
-- The internal Operating Portal (repo PAM-OperatingPortal) reads the customer
-- database only through aggregate views in the portal_readonly schema, over a
-- read-only Postgres role. Its templates (customer-pam/001, 002) referenced
-- placeholder tables (public.users, public.subscriptions.trial_started_at…)
-- that PAM never had, so the Trial journey page showed "funnel not connected".
--
-- This migration:
--   1. profiles.signup_via — where an account came from ('whatsapp-demo',
--      'portal-demo', 'web', 'pass'…), set by /auth/callback.
--   2. demo_sandboxes.converted_profile_id / converted_at — the WhatsApp demo
--      visitor who went on to create their own account (matched by number
--      through a signed token in the sign-up link).
--   3. portal_readonly.gtm_weekly_metrics and gtm_trial_funnel on PAM's real
--      tables, with the WhatsApp demo as the stage before the 14-day trial.
--      Counts only — no per-customer row ever crosses the boundary.
--   4. Grants to the pam_portal_readonly role when it exists (see the note at
--      the end for creating it).
--
-- Run AFTER migration-058. Idempotent.

BEGIN;

-- ---------------------------------------------------------------------
-- 1 + 2. Attribution columns
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_via TEXT;
COMMENT ON COLUMN public.profiles.signup_via IS
  'Where the account came from: whatsapp-demo, portal-demo, pass, web (default). Set once at creation by /auth/callback.';

ALTER TABLE public.demo_sandboxes
  ADD COLUMN IF NOT EXISTS converted_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
COMMENT ON COLUMN public.demo_sandboxes.converted_profile_id IS
  'The real PAM account this demo visitor went on to create (their number matched the signed token in the sign-up link).';

CREATE INDEX IF NOT EXISTS demo_sandboxes_converted_idx ON public.demo_sandboxes (converted_at) WHERE converted_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Read-only aggregate views
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS portal_readonly;
REVOKE ALL ON SCHEMA portal_readonly FROM public;
REVOKE ALL ON SCHEMA portal_readonly FROM anon, authenticated;

-- Weekly brief inputs. "Users" are real landlord accounts (demo sandboxes
-- excluded); "paying signals" are accounts on an active plan.
CREATE OR REPLACE VIEW portal_readonly.gtm_weekly_metrics AS
SELECT
  (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables_available,
  (SELECT count(*)::int FROM public.profiles WHERE is_demo = FALSE AND auth_id IS NOT NULL)                           AS auth_users,
  (SELECT count(*)::int FROM public.properties p JOIN public.profiles pr ON pr.id = p.user_id WHERE pr.is_demo = FALSE) AS property_records,
  (SELECT count(*)::int FROM public.profiles WHERE is_demo = FALSE AND plan_status = 'active')                        AS paying_signals;

-- The journey: WhatsApp demo → 14-day trial → paid.
--   demo_*     the demo line (demo_sandboxes): one row per visitor
--   trials_*   real accounts on plan_status = 'trial' (14 days from signup)
--   converted  a paid subscription row created in the window
CREATE OR REPLACE VIEW portal_readonly.gtm_trial_funnel AS
SELECT
  -- WhatsApp demo
  (SELECT count(*)::int FROM public.demo_sandboxes WHERE created_at >= now() - interval '7 days')                              AS demo_started_7d,
  (SELECT count(*)::int FROM public.demo_sandboxes WHERE expires_at > now())                                                   AS demo_active,
  (SELECT count(*)::int FROM public.demo_sandboxes WHERE created_at >= now() - interval '7 days' AND message_count >= 5)       AS demo_engaged_7d,
  (SELECT count(*)::int FROM public.demo_sandboxes WHERE converted_at >= now() - interval '7 days')                            AS demo_converted_7d,
  (SELECT count(*)::int FROM public.demo_sandboxes WHERE converted_at IS NOT NULL)                                             AS demo_converted_total,
  -- 14-day trial
  (SELECT count(*)::int FROM public.profiles WHERE is_demo = FALSE AND plan_status = 'trial' AND (trial_ends_at IS NULL OR trial_ends_at > now())) AS trials_active,
  (SELECT count(*)::int FROM public.profiles WHERE is_demo = FALSE AND created_at >= now() - interval '7 days')                AS trials_started_7d,
  (SELECT count(*)::int FROM public.subscriptions s JOIN public.profiles pr ON pr.id = s.user_id
     WHERE pr.is_demo = FALSE AND s.status = 'active' AND s.created_at >= now() - interval '7 days')                           AS trials_converted_7d,
  (SELECT count(*)::int FROM public.profiles WHERE is_demo = FALSE AND plan_status = 'trial'
     AND trial_ends_at BETWEEN now() - interval '7 days' AND now())                                                             AS trials_expired_7d,
  (SELECT count(*)::int FROM public.profiles WHERE is_demo = FALSE AND plan_status = 'active')                                 AS paying_total,
  (SELECT round(avg(extract(epoch FROM (s.created_at - pr.created_at)) / 86400)::numeric, 1)
     FROM public.subscriptions s JOIN public.profiles pr ON pr.id = s.user_id
     WHERE pr.is_demo = FALSE AND s.status = 'active')                                                                          AS avg_days_to_convert,
  -- where this week's signups came from
  (SELECT count(*)::int FROM public.profiles WHERE is_demo = FALSE AND created_at >= now() - interval '7 days' AND signup_via IN ('whatsapp-demo', 'portal-demo')) AS signups_from_demo_7d;

REVOKE ALL ON portal_readonly.gtm_weekly_metrics FROM public, anon, authenticated;
REVOKE ALL ON portal_readonly.gtm_trial_funnel   FROM public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Grants to the Operating Portal's read-only role, when it exists
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pam_portal_readonly') THEN
    GRANT USAGE ON SCHEMA portal_readonly TO pam_portal_readonly;
    GRANT SELECT ON portal_readonly.gtm_weekly_metrics TO pam_portal_readonly;
    GRANT SELECT ON portal_readonly.gtm_trial_funnel   TO pam_portal_readonly;
    -- The role sees the aggregate views and nothing in public.
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM pam_portal_readonly;
  END IF;
END $$;

COMMIT;

-- If the role does not exist yet, create it ONCE (choose a strong password),
-- then re-run this file so the grants apply:
--   CREATE ROLE pam_portal_readonly LOGIN PASSWORD '<strong password>' NOINHERIT;
--   GRANT CONNECT ON DATABASE postgres TO pam_portal_readonly;
-- and set PAM_DATABASE_URL_READONLY on the Operating Portal's Vercel project to
--   postgresql://pam_portal_readonly:<password>@<pooler host>:5432/postgres?sslmode=require
-- (use the Supabase connection pooler host, session mode).

SELECT table_name FROM information_schema.views WHERE table_schema = 'portal_readonly' ORDER BY 1;
SELECT * FROM portal_readonly.gtm_trial_funnel;
