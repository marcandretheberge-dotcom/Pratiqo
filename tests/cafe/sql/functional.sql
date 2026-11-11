\set ON_ERROR_STOP on
SET ROLE service_role;

-- Create and publish the primary session.
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'fr-es-test','Français ↔ Español','fr','es','A2',
 clock_timestamp() + interval '2 days',60,2,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_publish_server(
 '00000000-0000-4000-8000-000000000001','fr-es-test'
);

DO $
DECLARE j jsonb;
BEGIN
  j := public.cafe_admin_reassign_host_server(
    '00000000-0000-4000-8000-000000000001',
    'fr-es-test',
    '00000000-0000-4000-8000-000000000004'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'host reassignment failed: %', j;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cafe_sessions
    WHERE slug='fr-es-test'
      AND host_profile_id='00000000-0000-4000-8000-000000000004'
      AND status='published'
  ) THEN
    RAISE EXCEPTION 'host reassignment did not persist';
  END IF;

  j := public.cafe_admin_reassign_host_server(
    '00000000-0000-4000-8000-000000000001',
    'fr-es-test',
    '00000000-0000-4000-8000-000000000002'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'host restoration failed: %', j;
  END IF;
END $;

-- First reservation, exact replay, cancellation, stale retry.
DO $$
DECLARE
  j jsonb;
BEGIN
  j := public.cafe_set_reservation_server(
    '00000000-0000-4000-8000-000000000003','fr-es-test','reserve',0,
    '10000000-0000-4000-8000-000000000001'
  );
  IF j->>'ok' <> 'true' OR j->>'version' <> '1' OR j->>'status' <> 'confirmed' THEN
    RAISE EXCEPTION 'first reserve failed: %', j;
  END IF;

  j := public.cafe_set_reservation_server(
    '00000000-0000-4000-8000-000000000003','fr-es-test','reserve',0,
    '10000000-0000-4000-8000-000000000001'
  );
  IF j->>'ok' <> 'true' OR j->>'replay' <> 'true' OR j->>'version' <> '1' THEN
    RAISE EXCEPTION 'replay failed: %', j;
  END IF;

  j := public.cafe_set_reservation_server(
    '00000000-0000-4000-8000-000000000003','fr-es-test','cancel',1,
    '10000000-0000-4000-8000-000000000002'
  );
  IF j->>'ok' <> 'true' OR j->>'version' <> '2' OR j->>'status' <> 'cancelled' THEN
    RAISE EXCEPTION 'cancel failed: %', j;
  END IF;

  j := public.cafe_set_reservation_server(
    '00000000-0000-4000-8000-000000000003','fr-es-test','reserve',0,
    '10000000-0000-4000-8000-000000000001'
  );
  IF j->>'ok' <> 'false' OR j->>'code' <> 'version_conflict' THEN
    RAISE EXCEPTION 'stale retry resurrected state: %', j;
  END IF;
END $$;

-- Three-upcoming-session quota.
SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','quota-1','Quota 1','it',NULL,NULL,clock_timestamp()+interval '3 days',45,12,'00000000-0000-4000-8000-000000000002');
SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','quota-2','Quota 2','it',NULL,NULL,clock_timestamp()+interval '4 days',45,12,'00000000-0000-4000-8000-000000000002');
SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','quota-3','Quota 3','it',NULL,NULL,clock_timestamp()+interval '5 days',45,12,'00000000-0000-4000-8000-000000000002');
SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','quota-4','Quota 4','it',NULL,NULL,clock_timestamp()+interval '6 days',45,12,'00000000-0000-4000-8000-000000000002');
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','quota-1');
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','quota-2');
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','quota-3');
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','quota-4');

DO $$
DECLARE j jsonb;
BEGIN
  j := public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000005','quota-1','reserve',0,'20000000-0000-4000-8000-000000000001');
  IF j->>'ok' <> 'true' THEN RAISE EXCEPTION 'quota reserve 1 failed %',j; END IF;
  j := public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000005','quota-2','reserve',0,'20000000-0000-4000-8000-000000000002');
  IF j->>'ok' <> 'true' THEN RAISE EXCEPTION 'quota reserve 2 failed %',j; END IF;
  j := public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000005','quota-3','reserve',0,'20000000-0000-4000-8000-000000000003');
  IF j->>'ok' <> 'true' THEN RAISE EXCEPTION 'quota reserve 3 failed %',j; END IF;
  j := public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000005','quota-4','reserve',0,'20000000-0000-4000-8000-000000000004');
  IF j->>'ok' <> 'false' OR j->>'code' <> 'reservation_limit' THEN
    RAISE EXCEPTION 'quota was not enforced %',j;
  END IF;
END $$;

-- Session for account deletion integration.
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'deletion-test','Deletion test','de',NULL,NULL,
 clock_timestamp()+interval '7 days',45,4,
 '00000000-0000-4000-8000-000000000006'
);
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','deletion-test');
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000006','deletion-test','reserve',0,
 '30000000-0000-4000-8000-000000000001'
);
RESET ROLE;

UPDATE public.profiles
SET deletion_requested_at = clock_timestamp(), is_active = false
WHERE id='00000000-0000-4000-8000-000000000006';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cafe_reservations WHERE profile_id='00000000-0000-4000-8000-000000000006') THEN
    RAISE EXCEPTION 'Cafe reservations survived account deletion request';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cafe_sessions
    WHERE slug='deletion-test' AND (status <> 'cancelled' OR host_profile_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Hosted Cafe was not cancelled/anonymized on deletion request';
  END IF;
END $$;
