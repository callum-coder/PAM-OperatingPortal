-- migration-060 — per-conversation views of the WhatsApp demo line for the
-- Operating Portal (GTM → Demo threads).
--
-- migration-059 gave the Operating Portal aggregate counts only. That stays
-- the rule for landlords (customers). Demo visitors are prospects talking to
-- a sample portfolio, and the point of the demo line is to learn where the
-- conversation breaks, so for the demo line — and only the demo line — the
-- portal may read the thread itself:
--
--   portal_readonly.demo_threads          one row per sandbox: stage, counts,
--                                         last message, conversion
--   portal_readonly.demo_thread_messages  every message on the demo line,
--                                         keyed by sandbox
--
-- What never crosses: the visitor's number (only its last four digits and
-- the sandbox id), anything on line = 'main', any landlord's data. Rows are
-- matched by the last ten digits of the number, not user_id, so the daily-cap
-- and busy replies (logged with user_id NULL) appear in the thread too.
--
-- Run AFTER migration-059. Idempotent.

BEGIN;

CREATE OR REPLACE VIEW portal_readonly.demo_thread_messages AS
SELECT
  s.profile_id                                   AS sandbox_id,
  m.id                                           AS message_id,
  m.direction,
  m.kind,
  m.template_name,
  m.body,
  m.status,
  m.error,
  m.created_at,
  m.updated_at,
  m.job_id,
  -- Who the message is for / from, when the visitor was playing a side.
  COALESCE(m.payload->>'audience', CASE WHEN m.tenant_id IS NOT NULL THEN 'tenant' END) AS audience,
  -- A message PAM would have sent to the OTHER side, shown to the visitor
  -- with a "To <name> (side)" first line (lib/demo/messages.ts mirrorLabel).
  COALESCE(m.direction = 'outbound' AND m.body ~ '^To [^\n]+ \((landlord|tenant)\)', FALSE) AS is_mirror,
  CASE WHEN m.direction = 'outbound' AND m.body ~ '^To [^\n]+ \((landlord|tenant)\)'
       THEN substring(m.body from '^To [^\n]+ \((landlord|tenant)\)') END AS mirror_label,
  -- Reply buttons offered under an outbound message, or the button the
  -- visitor tapped on an inbound one.
  CASE WHEN m.direction = 'outbound' THEN m.payload->'buttons' END         AS buttons,
  m.payload->>'button_payload'                                            AS button_payload,
  m.payload->>'media_type'                                                AS media_type,
  CASE WHEN m.kind = 'document' THEN m.payload->>'kind' END               AS document_kind
FROM public.whatsapp_messages m
JOIN public.demo_sandboxes s
  ON s.phone_key = right(regexp_replace(m.phone, '\D', '', 'g'), 10)
WHERE m.line = 'demo';

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
  j.job_created_at
FROM public.demo_sandboxes s
LEFT JOIN msgs m     ON m.sandbox_id = s.profile_id
LEFT JOIN last_msg l ON l.sandbox_id = s.profile_id
LEFT JOIN job j      ON j.user_id    = s.profile_id;

REVOKE ALL ON portal_readonly.demo_threads         FROM public, anon, authenticated;
REVOKE ALL ON portal_readonly.demo_thread_messages FROM public, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pam_portal_readonly') THEN
    GRANT SELECT ON portal_readonly.demo_threads         TO pam_portal_readonly;
    GRANT SELECT ON portal_readonly.demo_thread_messages TO pam_portal_readonly;
  END IF;
END $$;

COMMIT;

SELECT sandbox_id, phone_last4, inbound_count, outbound_count, last_direction, job_status FROM portal_readonly.demo_threads ORDER BY started_at DESC;
