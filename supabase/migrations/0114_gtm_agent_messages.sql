-- Messages agents post to the team (Slack), mirrored here so each agent's
-- communications are viewable in the AI-Team section.
create table if not exists gtm_agent_messages (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  channel text,
  text text not null,
  slack_ts text,
  status text not null default 'sent' check (status in ('sent', 'skipped', 'failed')),
  error text,
  context jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table gtm_agent_messages enable row level security;

grant select, insert, update, delete on gtm_agent_messages to service_role;
revoke all on table gtm_agent_messages from anon, authenticated;

create index if not exists gtm_agent_messages_agent_idx
  on gtm_agent_messages (agent_id, created_at desc);
