# Customer PAM Read-Only Contract

These SQL templates belong in the customer-facing PAM Supabase project, not the
Operating Portal Supabase project.

The Operating Portal reads `portal_readonly.gtm_weekly_metrics` first. If that
view exists, weekly briefs use only this aggregate contract instead of guessing
raw table names.

Apply `001_portal_readonly_gtm_metrics.sql` in the customer PAM SQL Editor after
reviewing the placeholder table names and replacing them with the real customer
app tables.

