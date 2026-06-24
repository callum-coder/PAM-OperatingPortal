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
