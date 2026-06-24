create index if not exists gtm_brief_actions_brief_id_idx
  on gtm_brief_actions (brief_id);

create index if not exists gtm_brief_actions_owner_user_id_idx
  on gtm_brief_actions (owner_user_id);

create index if not exists gtm_manual_inputs_created_by_idx
  on gtm_manual_inputs (created_by);
