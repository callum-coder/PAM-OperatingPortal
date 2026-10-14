-- migration-061 — the demo line asks the visitor's name on first contact.
--
-- The first thing PAM now says on the demo number is "who should I refer to
-- you as?". The answer is kept on the sandbox so PAM can use it, the welcome
-- video + guide go out once it is known, and the Operating Portal's Demo
-- threads page shows a first name next to the masked number.
--
--   demo_sandboxes.visitor_name    what they asked to be called (may be NULL
--                                  when the reply was not a name)
--   demo_sandboxes.welcome_stage   'ask_name' until the first reply, then 'done'
--
-- Existing sandboxes default to 'done' (they were welcomed the old way).
-- Run AFTER migration-060. Idempotent.

BEGIN;

ALTER TABLE public.demo_sandboxes
  ADD COLUMN IF NOT EXISTS visitor_name TEXT,
  ADD COLUMN IF NOT EXISTS welcome_stage TEXT NOT NULL DEFAULT 'done';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demo_sandboxes_welcome_stage_check') THEN
    ALTER TABLE public.demo_sandboxes
      ADD CONSTRAINT demo_sandboxes_welcome_stage_check CHECK (welcome_stage IN ('ask_name', 'done'));
  END IF;
END $$;

COMMENT ON COLUMN public.demo_sandboxes.visitor_name IS 'What the visitor asked to be called, from PAM''s first question on the demo line.';

-- Same view as migration-060 with visitor_first_name appended (CREATE OR
-- REPLACE VIEW may only add columns at the end).
CREATE OR REPLACE VIEW portal_readonly.demo_threads AS
WITH msgs AS (
  SELECT
    sandbox_id,
    count(*) FILTER (WHERE direction = 'inbound')::int                 AS inbound_count,
    count(*) FILTER (WHERE direction = 'outbound')::int                AS outbound_count,
    count(*) FILTER (WHERE direction = 'outbound' AND status = 'failed')::int AS failed_count,
    min(created_at) FILTER (WHERE direction = 'inbound')               AS first_inbound_at,
    max(created_at)                                                    AS last_message_at
  FROM portal_readonly.demo_thread_messages
  GROUP BY sandbox_id
),
last_msg AS (
  SELECT DISTINCT ON (sandbox_id)
    sandbox_id, direction AS last_direction, left(body, 200) AS last_body, status AS last_status, is_mirror AS last_is_mirror
  FROM portal_readonly.demo_thread_messages
  ORDER BY sandbox_id, created_at DESC
),
job AS (
  SELECT DISTINCT ON (j.user_id)
    j.user_id, j.status AS job_status, j.next_action_at AS job_next_action_at, j.created_at AS job_created_at
  FROM public.maintenance_jobs j
  JOIN public.demo_sandboxes s ON s.profile_id = j.user_id
  WHERE j.pam_managed = TRUE
  ORDER BY j.user_id, j.created_at DESC
)
SELECT
  s.profile_id                        AS sandbox_id,
  right(s.phone_key, 4)               AS phone_last4,
  s.created_at                        AS started_at,
  s.last_seen_at,
  s.expires_at,
  s.message_count,
  s.acting_as,
  s.converted_at,
  (s.converted_profile_id IS NOT NULL) AS converted,
  COALESCE(m.inbound_count, 0)        AS inbound_count,
  COALESCE(m.outbound_count, 0)       AS outbound_count,
  COALESCE(m.failed_count, 0)         AS failed_count,
  m.first_inbound_at,
  m.last_message_at,
  l.last_direction,
  l.last_body,
  l.last_status,
  COALESCE(l.last_is_mirror, FALSE)   AS last_is_mirror,
  j.job_status,
  j.job_next_action_at,
  j.job_created_at,
  split_part(btrim(s.visitor_name), ' ', 1) AS visitor_first_name
FROM public.demo_sandboxes s
LEFT JOIN msgs m     ON m.sandbox_id = s.profile_id
LEFT JOIN last_msg l ON l.sandbox_id = s.profile_id
LEFT JOIN job j      ON j.user_id    = s.profile_id;

COMMIT;

SELECT phone_last4, visitor_first_name, inbound_count FROM portal_readonly.demo_threads ORDER BY started_at DESC;
