-- Lead-generation plays produced by the Lead Finder agent (Core Four framework).
-- These are demand-gen strategies (channel + audience + hook + magnet + first
-- action), not contact records. Real sourced leads land here later, once a data
-- source (HubSpot / lists) is connected.
create table if not exists gtm_lead_plays (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam',
  title text not null,
  channel text not null check (channel in ('warm_outreach', 'cold_outreach', 'content', 'paid_ads')),
  audience text,
  hook text,
  lead_magnet text,
  first_action text,
  impact int default 3 check (impact between 1 and 5),
  ease int default 3 check (ease between 1 and 5),
  priority_score int not null default 0,
  status text not null default 'proposed' check (status in ('proposed', 'active', 'parked', 'done')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gtm_lead_plays enable row level security;

grant select, insert, update, delete on gtm_lead_plays to service_role;
revoke all on table gtm_lead_plays from anon, authenticated;

create index if not exists gtm_lead_plays_priority_idx
  on gtm_lead_plays (status, priority_score desc);

create index if not exists gtm_lead_plays_channel_idx
  on gtm_lead_plays (channel);

-- Permission catalogue (runtime permissions are code-driven in lib/rbac, but
-- keep the DB catalogue in sync with 0000_rbac.sql).
insert into permissions (id, module, description) values
  ('gtm.leads.read', 'gtm', 'Read GTM lead engine'),
  ('gtm.leads.write', 'gtm', 'Manage GTM lead engine')
on conflict (id) do update set
  module = excluded.module,
  description = excluded.description;

insert into role_permissions (role_id, permission_id)
select 'owner', id from permissions where id in ('gtm.leads.read', 'gtm.leads.write')
on conflict do nothing;

insert into role_permissions (role_id, permission_id) values
  ('sales', 'gtm.leads.read'),
  ('sales', 'gtm.leads.write'),
  ('viewer', 'gtm.leads.read')
on conflict do nothing;
