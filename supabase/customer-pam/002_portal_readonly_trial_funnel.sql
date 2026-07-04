-- Apply this in the customer-facing PAM Supabase project.
-- Replace the placeholder table/column references with the real PAM schema
-- before use — the placeholders assume a public.subscriptions table with
-- status + trial timestamps. Adjust to however PAM records trials.

create schema if not exists portal_readonly;

revoke all on schema portal_readonly from public;
revoke all on schema portal_readonly from anon, authenticated;

-- The 14-day trial → paid funnel, aggregated. The Operating Portal reads this
-- view weekly (Brief Analyst) and on demand (Trial journey page). Counts only —
-- no per-customer rows ever cross the boundary.
create or replace view portal_readonly.gtm_trial_funnel
as
select
  -- currently inside their 14-day trial
  (
    select count(*)::int
    from public.subscriptions
    where status = 'trialing'
  ) as trials_active,
  -- trials that started in the last 7 days
  (
    select count(*)::int
    from public.subscriptions
    where trial_started_at >= now() - interval '7 days'
  ) as trials_started_7d,
  -- trials that converted to paid in the last 7 days
  (
    select count(*)::int
    from public.subscriptions
    where status in ('active', 'paid')
      and converted_at >= now() - interval '7 days'
  ) as trials_converted_7d,
  -- trials that ended in the last 7 days without converting
  (
    select count(*)::int
    from public.subscriptions
    where status in ('expired', 'canceled')
      and trial_ended_at >= now() - interval '7 days'
  ) as trials_expired_7d,
  -- total paying customers right now
  (
    select count(*)::int
    from public.subscriptions
    where status in ('active', 'paid')
  ) as paying_total,
  -- how long converters take to decide (days)
  (
    select round(avg(extract(epoch from (converted_at - trial_started_at)) / 86400)::numeric, 1)
    from public.subscriptions
    where converted_at is not null
      and trial_started_at is not null
  ) as avg_days_to_convert;

revoke all on portal_readonly.gtm_trial_funnel from public;
revoke all on portal_readonly.gtm_trial_funnel from anon, authenticated;
grant usage on schema portal_readonly to pam_portal_readonly;
grant select on portal_readonly.gtm_trial_funnel to pam_portal_readonly;
