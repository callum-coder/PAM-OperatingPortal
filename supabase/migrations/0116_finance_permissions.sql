-- Finance module (Module 2) permission catalogue. Runtime permissions are
-- code-driven (lib/rbac); this keeps the DB catalogue in sync.
insert into permissions (id, module, description) values
  ('finance.overview.read', 'finance', 'Read the finance overview'),
  ('finance.overview.write', 'finance', 'Manage finance settings')
on conflict (id) do update set
  module = excluded.module,
  description = excluded.description;

insert into role_permissions (role_id, permission_id)
select 'owner', id from permissions where id in ('finance.overview.read', 'finance.overview.write')
on conflict do nothing;

insert into role_permissions (role_id, permission_id) values
  ('finance', 'finance.overview.read'),
  ('finance', 'finance.overview.write'),
  ('viewer', 'finance.overview.read')
on conflict do nothing;
