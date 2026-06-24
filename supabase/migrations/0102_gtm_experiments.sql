create table if not exists gtm_experiments (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  name text not null,
  hypothesis text,
  metric text,
  baseline numeric,
  target numeric,
  variant_a jsonb,
  variant_b jsonb,
  status text default 'design' check (status in ('design', 'running', 'concluded')),
  result jsonb,
  conclusion text,
  significance_threshold numeric,
  time_cap timestamptz,
  started_at timestamptz,
  concluded_at timestamptz,
  created_at timestamptz default now()
);

alter table gtm_experiments enable row level security;

grant select, insert, update, delete on gtm_experiments to service_role;
