create table if not exists portal_products (
  key text primary key,
  name text not null,
  audience text,
  lifecycle_model text not null default 'trial',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

insert into portal_products (key, name, audience, lifecycle_model)
values ('pam', 'PAM', 'UK landlords', 'trial')
on conflict (key) do update set
  name = excluded.name,
  audience = excluded.audience,
  lifecycle_model = excluded.lifecycle_model,
  is_active = true;

create table if not exists gtm_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam' references portal_products(key),
  external_user_id text,
  email text,
  display_name text,
  lifecycle_stage text not null default 'visitor' check (
    lifecycle_stage in ('visitor', 'lead', 'trial', 'activated', 'paying', 'at_risk', 'churned')
  ),
  plan text,
  mrr numeric,
  health_score int check (health_score between 0 and 100),
  last_seen_at timestamptz,
  activated_at timestamptz,
  converted_at timestamptz,
  churned_at timestamptz,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists gtm_customer_profiles_product_external_idx
  on gtm_customer_profiles (product, external_user_id)
  where external_user_id is not null;

create unique index if not exists gtm_customer_profiles_product_email_idx
  on gtm_customer_profiles (product, lower(email))
  where email is not null;

create index if not exists gtm_customer_profiles_stage_idx
  on gtm_customer_profiles (product, lifecycle_stage, updated_at desc);

create table if not exists gtm_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam' references portal_products(key),
  customer_id uuid references gtm_customer_profiles(id) on delete cascade,
  external_user_id text,
  event_name text not null,
  stage text check (stage in ('visitor', 'lead', 'trial', 'activated', 'paying', 'at_risk', 'churned')),
  occurred_at timestamptz not null default now(),
  source text not null default 'product',
  properties jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists gtm_lifecycle_events_customer_idx
  on gtm_lifecycle_events (customer_id, occurred_at desc);

create index if not exists gtm_lifecycle_events_product_event_idx
  on gtm_lifecycle_events (product, event_name, occurred_at desc);

create table if not exists gtm_ai_work_items (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam' references portal_products(key),
  agent_id text not null,
  title text not null,
  summary text,
  recommendation text,
  evidence jsonb default '[]'::jsonb,
  confidence int check (confidence between 0 and 100),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  status text not null default 'needs_review' check (
    status in ('needs_review', 'approved', 'in_progress', 'done', 'rejected')
  ),
  owner_user_id uuid references portal_users(id),
  related_table text,
  related_id uuid,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists gtm_ai_work_items_worklist_idx
  on gtm_ai_work_items (status, priority, due_date, created_at desc);

create index if not exists gtm_ai_work_items_agent_idx
  on gtm_ai_work_items (agent_id, created_at desc);

create table if not exists portal_integrations (
  key text primary key,
  product text not null default 'pam' references portal_products(key),
  name text not null,
  category text not null,
  status text not null default 'planned' check (
    status in ('connected', 'degraded', 'missing', 'planned')
  ),
  env_keys text[] default '{}'::text[],
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into portal_integrations (key, name, category, status, env_keys, notes)
values
  ('hubspot', 'HubSpot', 'CRM', 'missing', array['HUBSPOT_ACCESS_TOKEN'], 'Pipeline, contacts, lead capture, and subscriptions.'),
  ('xero', 'Xero', 'Finance', 'missing', array['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET'], 'Read-only management accounts and P&L reporting.'),
  ('anthropic', 'Anthropic', 'AI', 'missing', array['ANTHROPIC_API_KEY'], 'Structured agent synthesis and drafting.'),
  ('slack', 'Slack', 'Team', 'missing', array['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID'], 'Daily standups and agent notifications.'),
  ('pam-readonly', 'PAM readonly database', 'Product data', 'missing', array['PAM_DATABASE_URL_READONLY'], 'Trial, activation, customer, and funnel aggregates.')
on conflict (key) do update set
  name = excluded.name,
  category = excluded.category,
  env_keys = excluded.env_keys,
  notes = excluded.notes,
  updated_at = now();

alter table portal_products enable row level security;
alter table gtm_customer_profiles enable row level security;
alter table gtm_lifecycle_events enable row level security;
alter table gtm_ai_work_items enable row level security;
alter table portal_integrations enable row level security;

grant select, insert, update, delete on portal_products to service_role;
grant select, insert, update, delete on gtm_customer_profiles to service_role;
grant select, insert, update, delete on gtm_lifecycle_events to service_role;
grant select, insert, update, delete on gtm_ai_work_items to service_role;
grant select, insert, update, delete on portal_integrations to service_role;

revoke all on table portal_products from anon, authenticated;
revoke all on table gtm_customer_profiles from anon, authenticated;
revoke all on table gtm_lifecycle_events from anon, authenticated;
revoke all on table gtm_ai_work_items from anon, authenticated;
revoke all on table portal_integrations from anon, authenticated;

insert into permissions (id, module, description) values
  ('gtm.customers.read', 'gtm', 'Read customer lifecycle profiles'),
  ('gtm.customers.write', 'gtm', 'Manage customer lifecycle profiles'),
  ('gtm.ai_work_items.read', 'gtm', 'Read AI work item review queue'),
  ('gtm.ai_work_items.write', 'gtm', 'Manage AI work item review queue')
on conflict (id) do update set
  module = excluded.module,
  description = excluded.description;

insert into role_permissions (role_id, permission_id)
select 'owner', id
from permissions
where id in (
  'gtm.customers.read',
  'gtm.customers.write',
  'gtm.ai_work_items.read',
  'gtm.ai_work_items.write'
)
on conflict do nothing;

insert into role_permissions (role_id, permission_id) values
  ('sales', 'gtm.customers.read'),
  ('sales', 'gtm.ai_work_items.read'),
  ('sales', 'gtm.ai_work_items.write'),
  ('ops', 'gtm.customers.read'),
  ('ops', 'gtm.ai_work_items.read'),
  ('viewer', 'gtm.customers.read'),
  ('viewer', 'gtm.ai_work_items.read')
on conflict do nothing;
