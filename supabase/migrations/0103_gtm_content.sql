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
