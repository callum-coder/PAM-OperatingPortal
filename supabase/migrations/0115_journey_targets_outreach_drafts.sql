-- Phase A/B/C support: content lifecycle, revenue targets, outreach drafts.

-- Content items can be parked (rejected/deferred ideas) so the priority queue
-- stays reviewable instead of flooding.
alter table gtm_content_items drop constraint if exists gtm_content_items_stage_check;
alter table gtm_content_items
  add constraint gtm_content_items_stage_check
  check (stage in ('idea', 'drafting', 'review', 'scheduled', 'published', 'parked'));

-- Revenue / funnel targets the portal tracks progress against (edited in the
-- Trial journey page; read by the Brief Analyst and the GTM Lead standup).
create table if not exists gtm_targets (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam',
  metric text not null unique,
  label text not null,
  target numeric not null,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gtm_targets enable row level security;
grant select, insert, update, delete on gtm_targets to service_role;
revoke all on table gtm_targets from anon, authenticated;

-- Draft-only outreach copy produced by the Outreach Operator for lead plays.
-- Nothing here sends; drafts are approved and sent manually by a human.
create table if not exists gtm_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'pam',
  play_id uuid references gtm_lead_plays(id) on delete set null,
  play_title text,
  channel text not null,
  variant text,
  subject text,
  body text not null,
  personalisation jsonb default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gtm_outreach_drafts enable row level security;
grant select, insert, update, delete on gtm_outreach_drafts to service_role;
revoke all on table gtm_outreach_drafts from anon, authenticated;

create index if not exists gtm_outreach_drafts_status_idx
  on gtm_outreach_drafts (status, created_at desc);

create index if not exists gtm_outreach_drafts_play_idx
  on gtm_outreach_drafts (play_id);
