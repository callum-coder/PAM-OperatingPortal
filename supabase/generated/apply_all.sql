create table if not exists portal_users (
  id uuid primary key,
  email text unique not null,
  display_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists roles (
  id text primary key,
  name text not null,
  description text
);

create table if not exists user_roles (
  user_id uuid references portal_users(id) on delete cascade,
  role_id text references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table if not exists permissions (
  id text primary key,
  module text not null,
  description text
);

create table if not exists role_permissions (
  role_id text references roles(id) on delete cascade,
  permission_id text references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

alter table portal_users enable row level security;
alter table roles enable row level security;
alter table user_roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;

grant select, insert, update, delete on portal_users to service_role;
grant select, insert, update, delete on roles to service_role;
grant select, insert, update, delete on user_roles to service_role;
grant select, insert, update, delete on permissions to service_role;
grant select, insert, update, delete on role_permissions to service_role;

insert into roles (id, name, description) values
  ('owner', 'Owner', 'Everything in the operating portal'),
  ('sales', 'Sales', 'GTM outreach and briefs'),
  ('ops', 'Operations', 'GTM briefs and content'),
  ('engineering', 'Engineering', 'Reserved for engineering module'),
  ('finance', 'Finance', 'Reserved for finance module'),
  ('support', 'Support', 'Reserved for support module'),
  ('viewer', 'Viewer', 'Read-only portal access')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into permissions (id, module, description) values
  ('gtm.briefs.read', 'gtm', 'Read GTM weekly briefs'),
  ('gtm.briefs.write', 'gtm', 'Generate and edit GTM weekly briefs'),
  ('gtm.outreach.read', 'gtm', 'Read GTM outreach loops'),
  ('gtm.outreach.write', 'gtm', 'Manage GTM outreach loops'),
  ('gtm.competitors.read', 'gtm', 'Read competitor monitoring'),
  ('gtm.competitors.write', 'gtm', 'Manage competitor monitoring'),
  ('gtm.content.read', 'gtm', 'Read content pipeline'),
  ('gtm.content.write', 'gtm', 'Manage content pipeline'),
  ('gtm.experiments.read', 'gtm', 'Read GTM experiments'),
  ('gtm.experiments.write', 'gtm', 'Manage GTM experiments')
on conflict (id) do update set
  module = excluded.module,
  description = excluded.description;

insert into role_permissions (role_id, permission_id)
select 'owner', id from permissions
on conflict do nothing;

insert into role_permissions (role_id, permission_id) values
  ('sales', 'gtm.outreach.read'),
  ('sales', 'gtm.outreach.write'),
  ('sales', 'gtm.briefs.read'),
  ('ops', 'gtm.briefs.read'),
  ('ops', 'gtm.content.read'),
  ('ops', 'gtm.content.write'),
  ('viewer', 'gtm.briefs.read'),
  ('viewer', 'gtm.outreach.read'),
  ('viewer', 'gtm.competitors.read'),
  ('viewer', 'gtm.content.read'),
  ('viewer', 'gtm.experiments.read')
on conflict do nothing;
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
create table if not exists gtm_competitor_watch (
  id uuid primary key default gen_random_uuid(),
  competitor text not null,
  product text not null,
  url text not null,
  watch_type text not null,
  last_snapshot text,
  last_hash text,
  last_checked_at timestamptz
);

create table if not exists gtm_competitor_changes (
  id uuid primary key default gen_random_uuid(),
  competitor text not null,
  watch_type text not null,
  diff_summary text,
  significance text check (significance in ('high', 'medium', 'low')),
  detected_at timestamptz default now()
);

alter table gtm_competitor_watch enable row level security;
alter table gtm_competitor_changes enable row level security;

grant select, insert, update, delete on gtm_competitor_watch to service_role;
grant select, insert, update, delete on gtm_competitor_changes to service_role;
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
create table if not exists gtm_content_items (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  title text not null,
  target_keyword text,
  stage text default 'idea' check (stage in ('idea', 'drafting', 'review', 'scheduled', 'published')),
  draft text,
  notes text,
  scheduled_for date,
  published_url text,
  stage_changed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gtm_content_items enable row level security;

grant select, insert, update, delete on gtm_content_items to service_role;
create table if not exists gtm_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product text not null,
  trigger_type text not null,
  steps jsonb not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists gtm_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references gtm_sequences(id),
  contact_ref text not null,
  current_step int default 0,
  status text default 'active' check (status in ('active', 'replied', 'completed', 'unsubscribed')),
  next_action_at timestamptz,
  last_sent_at timestamptz,
  enrolled_at timestamptz default now()
);

create table if not exists gtm_suppression (
  contact_ref text primary key,
  product text,
  reason text,
  added_at timestamptz default now()
);

create index if not exists gtm_enrollments_due
  on gtm_sequence_enrollments (status, next_action_at);

alter table gtm_sequences enable row level security;
alter table gtm_sequence_enrollments enable row level security;
alter table gtm_suppression enable row level security;

grant select, insert, update, delete on gtm_sequences to service_role;
grant select, insert, update, delete on gtm_sequence_enrollments to service_role;
grant select, insert, update, delete on gtm_suppression to service_role;
create index if not exists user_roles_role_id_idx
  on user_roles (role_id);

create index if not exists role_permissions_permission_id_idx
  on role_permissions (permission_id);

create index if not exists gtm_sequence_enrollments_sequence_id_idx
  on gtm_sequence_enrollments (sequence_id);
revoke all on table portal_users from anon, authenticated;
revoke all on table roles from anon, authenticated;
revoke all on table user_roles from anon, authenticated;
revoke all on table permissions from anon, authenticated;
revoke all on table role_permissions from anon, authenticated;
revoke all on table system_status from anon, authenticated;
revoke all on table gtm_briefs from anon, authenticated;
revoke all on table gtm_competitor_watch from anon, authenticated;
revoke all on table gtm_competitor_changes from anon, authenticated;
revoke all on table gtm_experiments from anon, authenticated;
revoke all on table gtm_content_items from anon, authenticated;
revoke all on table gtm_sequences from anon, authenticated;
revoke all on table gtm_sequence_enrollments from anon, authenticated;
revoke all on table gtm_suppression from anon, authenticated;
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
create unique index if not exists gtm_signals_source_type_product_idx
  on gtm_signals (source, signal_type, product);
create index if not exists gtm_brief_actions_brief_id_idx
  on gtm_brief_actions (brief_id);

create index if not exists gtm_brief_actions_owner_user_id_idx
  on gtm_brief_actions (owner_user_id);

create index if not exists gtm_manual_inputs_created_by_idx
  on gtm_manual_inputs (created_by);
-- Run this after the migration files, or paste it at the end of the same SQL editor run.
-- This maps Callum's Supabase Auth user to the portal owner role.

insert into portal_users (id, email, display_name)
values (
  'bfe923ff-a92b-49e8-b6b5-351dfb016481',
  'callum@let-safe.com',
  'Callum Burgess'
)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  is_active = true;

insert into user_roles (user_id, role_id)
values ('bfe923ff-a92b-49e8-b6b5-351dfb016481', 'owner')
on conflict do nothing;
