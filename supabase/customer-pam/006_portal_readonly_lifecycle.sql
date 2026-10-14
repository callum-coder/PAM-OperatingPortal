-- migration-064 — the Operating Portal's read-only view of the lifecycle
-- engine (counts only). GTM → Trial journey shows "What PAM did this week"
-- and the stand-up gets a "Lifecycle:" line. Run AFTER migration-063.

BEGIN;

CREATE OR REPLACE VIEW portal_readonly.lifecycle_stages AS
WITH j AS (SELECT * FROM public.account_journeys),
     e AS (SELECT * FROM public.account_journey_events WHERE created_at >= now() - interval '7 days'),
     trials AS (SELECT activation FROM j WHERE stage = 'trial')
SELECT
  (SELECT count(*)::int FROM j WHERE stage = 'demo')                                      AS demo_journeys,
  (SELECT count(*)::int FROM j WHERE stage = 'trial')                                     AS trial_journeys,
  (SELECT count(*)::int FROM j WHERE stage = 'paying' AND substage IS NULL)               AS paying_journeys,
  (SELECT count(*)::int FROM j WHERE stage = 'paying' AND substage = 'paused')            AS paused_journeys,
  (SELECT count(*)::int FROM j WHERE stage = 'lapsed' AND substage = 'expired')           AS expired_journeys,
  (SELECT count(*)::int FROM j WHERE stage = 'lapsed' AND substage = 'cancelled')         AS cancelled_journeys,
  (SELECT count(*)::int FROM j WHERE opted_out_at IS NOT NULL)                            AS opted_out_total,
  (SELECT count(*)::int FROM e WHERE kind = 'touch_sent')                                 AS touches_sent_7d,
  (SELECT count(*)::int FROM e WHERE kind = 'touch_sent' AND channel = 'whatsapp')        AS touches_whatsapp_7d,
  (SELECT count(*)::int FROM e WHERE kind = 'touch_sent' AND channel = 'email')           AS touches_email_7d,
  (SELECT count(*)::int FROM e WHERE kind = 'touch_failed')                               AS touches_failed_7d,
  (SELECT count(*)::int FROM e WHERE kind = 'touch_skipped')                              AS touches_skipped_7d,
  -- answered = the person messaged PAM within 48h of a touch
  (SELECT count(DISTINCT e.journey_id)::int FROM e JOIN j ON j.id = e.journey_id
     WHERE e.kind = 'touch_sent' AND j.last_inbound_at > e.created_at AND j.last_inbound_at < e.created_at + interval '48 hours') AS touches_answered_7d,
  (SELECT count(*)::int FROM e WHERE kind = 'opt_out')                                    AS opt_outs_7d,
  (SELECT count(*)::int FROM e WHERE kind = 'linked')                                     AS demo_to_trial_7d,
  -- activation among current trials
  (SELECT count(*)::int FROM trials)                                                      AS trials_total,
  (SELECT count(*)::int FROM trials WHERE activation ? 'first_property_at')               AS trials_with_property,
  (SELECT count(*)::int FROM trials WHERE activation ? 'first_tenant_at')                 AS trials_with_tenant,
  (SELECT count(*)::int FROM trials WHERE activation ? 'gocardless_at')                   AS trials_with_gocardless,
  (SELECT count(*)::int FROM trials WHERE activation ? 'bank_feed_at')                    AS trials_with_bank_feed,
  (SELECT count(*)::int FROM trials WHERE activation ? 'hmrc_at')                         AS trials_with_hmrc,
  (SELECT count(*)::int FROM trials WHERE activation ? 'first_whatsapp_at')               AS trials_on_whatsapp;

REVOKE ALL ON portal_readonly.lifecycle_stages FROM public, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pam_portal_readonly') THEN
    GRANT SELECT ON portal_readonly.lifecycle_stages TO pam_portal_readonly;
  END IF;
END $$;

COMMIT;

SELECT * FROM portal_readonly.lifecycle_stages;
