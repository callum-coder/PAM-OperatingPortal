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

