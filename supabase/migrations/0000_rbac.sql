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
