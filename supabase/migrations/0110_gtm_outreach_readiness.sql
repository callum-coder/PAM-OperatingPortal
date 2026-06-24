create table if not exists gtm_outreach_readiness_checks (
  key text primary key,
  title text not null,
  description text,
  blocking boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'blocked', 'not_applicable')),
  notes text,
  reviewed_by uuid references portal_users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gtm_outreach_readiness_checks enable row level security;

grant select, insert, update, delete on gtm_outreach_readiness_checks to service_role;
revoke all on table gtm_outreach_readiness_checks from anon, authenticated;

insert into gtm_outreach_readiness_checks (key, title, description, blocking, status)
values
  (
    'lawful_basis',
    'Lawful basis',
    'Confirm the lawful basis for each outbound audience before any live send.',
    true,
    'pending'
  ),
  (
    'suppression_policy',
    'Suppression policy',
    'Confirm unsubscribe, do-not-contact, bounced, and existing customer suppression rules.',
    true,
    'pending'
  ),
  (
    'audience_source',
    'Audience source',
    'Confirm the audience source is permitted and traceable.',
    true,
    'pending'
  ),
  (
    'copy_review',
    'Copy review',
    'Review claims, tone, and compliance risks before campaign launch.',
    false,
    'pending'
  )
on conflict (key) do nothing;

create index if not exists gtm_outreach_readiness_status_idx
  on gtm_outreach_readiness_checks (status, blocking);
