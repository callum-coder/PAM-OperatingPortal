create index if not exists user_roles_role_id_idx
  on user_roles (role_id);

create index if not exists role_permissions_permission_id_idx
  on role_permissions (permission_id);

create index if not exists gtm_sequence_enrollments_sequence_id_idx
  on gtm_sequence_enrollments (sequence_id);
