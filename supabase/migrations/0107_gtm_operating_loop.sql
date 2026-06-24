create table if not exists gtm_signals (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam',
  source text not null,
  signal_type text not null,
  title text not null,
  detail text,
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed', 'snoozed')),
  owner_user_id uuid references portal_users(id),
  due_date date,
  next_action text,
  related_table text,
  related_id uuid,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);

create table if not exists gtm_brief_actions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references gtm_briefs(id) on delete cascade,
  product text not null default 'pam',
  action_type text not null default 'recommended' check (action_type in ('observation', 'recommended', 'warning', 'follow_up')),
  title text not null,
  detail text,
  owner_user_id uuid references portal_users(id),
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'dropped')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists gtm_campaigns (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam',
  name text not null,
  audience text,
  message text,
  channel text,
  landing_page_url text,
  spend numeric default 0,
  start_date date,
  end_date date,
  status text not null default 'planned' check (status in ('planned', 'running', 'paused', 'completed', 'dropped')),
  result jsonb default '{}'::jsonb,
  learning text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists gtm_manual_inputs (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam',
  input_type text not null check (input_type in ('customer_call_note', 'objection', 'competitor_mention', 'feature_request', 'churn_reason', 'campaign_idea')),
  title text not null,
  detail text,
  source_contact text,
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'triaged', 'converted', 'closed')),
  created_by uuid references portal_users(id),
  created_at timestamptz default now()
);

alter table gtm_content_items
  add column if not exists keyword_intent int default 3 check (keyword_intent between 1 and 5),
  add column if not exists product_fit int default 3 check (product_fit between 1 and 5),
  add column if not exists mtd_urgency int default 3 check (mtd_urgency between 1 and 5),
  add column if not exists effort int default 3 check (effort between 1 and 5),
  add column if not exists priority_score int default 0,
  add column if not exists conversion_path text;

alter table gtm_experiments
  add column if not exists target_segment text,
  add column if not exists final_decision text check (final_decision in ('ship', 'stop', 'repeat', 'expand')),
  add column if not exists decision_reason text,
  add column if not exists decided_at timestamptz;

alter table gtm_signals enable row level security;
alter table gtm_brief_actions enable row level security;
alter table gtm_campaigns enable row level security;
alter table gtm_manual_inputs enable row level security;

grant select, insert, update, delete on gtm_signals to service_role;
grant select, insert, update, delete on gtm_brief_actions to service_role;
grant select, insert, update, delete on gtm_campaigns to service_role;
grant select, insert, update, delete on gtm_manual_inputs to service_role;

revoke all on table gtm_signals from anon, authenticated;
revoke all on table gtm_brief_actions from anon, authenticated;
revoke all on table gtm_campaigns from anon, authenticated;
revoke all on table gtm_manual_inputs from anon, authenticated;

create index if not exists gtm_signals_worklist_idx
  on gtm_signals (status, severity, due_date, created_at);

create unique index if not exists gtm_signals_source_type_product_idx
  on gtm_signals (source, signal_type, product);

create index if not exists gtm_signals_owner_idx
  on gtm_signals (owner_user_id);

create index if not exists gtm_brief_actions_status_idx
  on gtm_brief_actions (status, due_date);

create index if not exists gtm_campaigns_status_idx
  on gtm_campaigns (status, start_date);

create index if not exists gtm_manual_inputs_status_idx
  on gtm_manual_inputs (status, created_at);
