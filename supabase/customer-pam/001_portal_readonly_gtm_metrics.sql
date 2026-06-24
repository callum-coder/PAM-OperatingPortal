-- Apply this in the customer-facing PAM Supabase project.
-- Replace the placeholder table references with the real PAM schema before use.

create schema if not exists portal_readonly;

revoke all on schema portal_readonly from public;
revoke all on schema portal_readonly from anon, authenticated;

create or replace view portal_readonly.gtm_weekly_metrics
as
select
  (
    select count(*)::int
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  ) as tables_available,
  (
    select count(*)::int
    from public.users
  ) as auth_users,
  (
    select count(*)::int
    from public.properties
  ) as property_records,
  (
    select count(*)::int
    from public.subscriptions
    where status in ('active', 'trialing', 'paid')
  ) as paying_signals;

-- Keep this aggregate view in a private schema and grant only this view to the
-- Operating Portal readonly role.
revoke all on portal_readonly.gtm_weekly_metrics from public;
revoke all on portal_readonly.gtm_weekly_metrics from anon, authenticated;
grant usage on schema portal_readonly to pam_portal_readonly;
grant select on portal_readonly.gtm_weekly_metrics to pam_portal_readonly;

-- Optional hardening once the aggregate contract is confirmed live:
-- revoke select on all tables in schema public from pam_portal_readonly;
-- alter default privileges in schema public revoke select on tables from pam_portal_readonly;
