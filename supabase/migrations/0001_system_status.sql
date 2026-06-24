create table if not exists system_status (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  subsystem text not null,
  product text,
  product_key text generated always as (coalesce(product, '')) stored,
  last_run_at timestamptz,
  status text not null default 'idle' check (status in ('ok', 'warning', 'error', 'idle')),
  headline text,
  metrics jsonb default '{}'::jsonb,
  needs_attention jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create unique index if not exists system_status_key
  on system_status (module, subsystem, product_key);

alter table system_status enable row level security;

grant select, insert, update, delete on system_status to service_role;
