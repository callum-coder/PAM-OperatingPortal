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
