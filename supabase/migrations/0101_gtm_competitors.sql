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
