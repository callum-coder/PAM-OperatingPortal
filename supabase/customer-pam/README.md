# Customer PAM Read-Only Contract

These SQL templates belong in the customer-facing PAM Supabase project, not the
Operating Portal Supabase project.

The Operating Portal reads `portal_readonly.gtm_weekly_metrics` first. If that
view exists, weekly briefs use only this aggregate contract instead of guessing
raw table names.

Apply `001_portal_readonly_gtm_metrics.sql` in the customer PAM SQL Editor after
reviewing the placeholder table names and replacing them with the real customer
app tables.

`002_portal_readonly_trial_funnel.sql` adds `portal_readonly.gtm_trial_funnel`,
the aggregate 14-day trial → paid funnel (trials started/active/converted/
expired, paying total, average days to convert). The Trial journey page, the
weekly brief, and the daily standup all read it. Same rule: replace the
placeholder `public.subscriptions` references with the real trial/subscription
tables before applying.

`003_portal_readonly_real_tables_and_whatsapp_demo.sql` is the version that
actually matches PAM's schema (it is a copy of `migration-059` in the PAM repo,
which is the file to run). It rebuilds both views on the real tables — profiles
with `plan_status`/`trial_ends_at`, `subscriptions`, `properties` — and adds the
WhatsApp demo line as the stage before the trial: `demo_started_7d`,
`demo_active`, `demo_engaged_7d`, `demo_converted_7d`, `demo_converted_total`
and `signups_from_demo_7d`. Counts only, as before. It grants to
`pam_portal_readonly` when that role exists; the notes at the end of the file
cover creating it and the connection string for `PAM_DATABASE_URL_READONLY`.
