# PAM Operating Portal

PAM Operating Portal is the internal operating layer for PAM. It is a separate
Next.js app and Supabase project from the customer-facing PAM product.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill the portal Supabase values
before signing in. Without those values, the shell stays closed at `/login`.

`PAM_DATABASE_URL_READONLY` must be a read-only Postgres connection string for
the customer-facing PAM database. A Supabase project API URL is not enough for
the backend metrics job.

For production, prefer the aggregate view contract in
`supabase/customer-pam/001_portal_readonly_gtm_metrics.sql`. The weekly brief
job reads `portal_readonly.gtm_weekly_metrics` first and only falls back to raw
table discovery while that view is absent.

## Architecture

- Shell-level RBAC lives in `lib/rbac`.
- Modules register in `modules/registry.ts`.
- Shared job health lives in `system_status`, written through `lib/status.ts`.
- GTM is the first module; Finance has an initial Xero overview; Engineering,
  Support, and Team are not built yet.
- Customer lifecycle foundations live in `gtm_customer_profiles` and
  `gtm_lifecycle_events`, surfaced at `/gtm/customers`.
- AI recommendations that need human approval live in `gtm_ai_work_items`,
  surfaced at `/ai-team/work-items`.
- Integration health is tracked through `portal_integrations`, surfaced at
  `/integrations`.
- `portal_products` keeps PAM as the first product while preserving a path to
  multi-product operating loops.

## Verification

```bash
npm test
npm run lint
npm run build
```
