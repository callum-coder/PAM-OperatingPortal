create table if not exists gtm_briefs (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  period_start date,
  period_end date,
  raw_metrics jsonb,
  narrative text,
  created_at timestamptz default now()
);

alter table gtm_briefs enable row level security;

grant select, insert, update, delete on gtm_briefs to service_role;
