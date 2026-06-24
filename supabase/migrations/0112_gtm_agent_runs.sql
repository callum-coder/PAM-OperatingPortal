-- Run log for the GTM AI agents. The agent roster and hierarchy live in code
-- (lib/gtm/agents/registry.ts); this table is the durable record of each run so
-- the future AI-Team section can show per-agent reporting and history.
create table if not exists gtm_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  status text not null default 'ok' check (status in ('ok', 'warning', 'error', 'skipped')),
  model text,
  summary text,
  output jsonb default '{}'::jsonb,
  items_created int not null default 0,
  input_tokens int,
  output_tokens int,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

alter table gtm_agent_runs enable row level security;

grant select, insert, update, delete on gtm_agent_runs to service_role;
revoke all on table gtm_agent_runs from anon, authenticated;

create index if not exists gtm_agent_runs_agent_idx
  on gtm_agent_runs (agent_id, created_at desc);

create index if not exists gtm_agent_runs_status_idx
  on gtm_agent_runs (status, created_at desc);
