\set ON_ERROR_STOP on

SET ROLE service_role;
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'room-participant-boundary','Participant boundary','fr',NULL,NULL,
 clock_timestamp() + interval '9 minutes 59 seconds',30,8,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_publish_server(
 '00000000-0000-4000-8000-000000000001','room-participant-boundary'
);
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000004','room-participant-boundary','reserve',0,
 '72000000-0000-4000-8000-000000000001'
);

SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'room-host-boundary','Host boundary','es',NULL,NULL,
 clock_timestamp() + interval '14 minutes 59 seconds',30,8,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_publish_server(
 '00000000-0000-4000-8000-000000000001','room-host-boundary'
);
RESET ROLE;

-- Stale acceptance must be treated the same as no current agreement.
UPDATE cafe_private.participant_agreements
SET rules_version='cafe-pilot-adults-v0', updated_at=clock_timestamp()
WHERE profile_id='00000000-0000-4000-8000-000000000007';
SET ROLE service_role;
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000007','room-joinable','reserve',0,
 '72000000-0000-4000-8000-000000000002'
);

DO $boundary_tests$
DECLARE j jsonb;
BEGIN
  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000004','room-participant-boundary','participant'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'participant T-10 boundary failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000002','room-host-boundary','host'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'host T-15 boundary failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000007','room-joinable','participant'
  );
  IF j->>'code' <> 'adult_rules_required' THEN
    RAISE EXCEPTION 'stale rules version was accepted: %', j;
  END IF;
END
$boundary_tests$;
RESET ROLE;

-- Fixture whose nominal end was two minutes ago: reconnect grace remains open.
SET session_replication_role = replica;
INSERT INTO public.cafe_sessions (
  id, slug, title, primary_language, starts_at, duration_minutes,
  max_participants, status, host_profile_id, created_by_profile_id,
  published_at, created_at, updated_at
) VALUES (
  '73000000-0000-4000-8000-000000000001',
  'room-reconnect-grace','Reconnect grace','fr',
  clock_timestamp() - interval '32 minutes',30,8,'published',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  clock_timestamp()-interval '1 day',clock_timestamp(),clock_timestamp()
);
INSERT INTO public.cafe_reservations (
  session_id, profile_id, status, version, reserved_at, cancelled_at,
  last_request_id, last_action, last_expected_version, created_at, updated_at
) VALUES (
  '73000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000004',
  'confirmed',1,clock_timestamp()-interval '1 hour',NULL,
  '73000000-0000-4000-8000-000000000002','reserve',0,
  clock_timestamp(),clock_timestamp()
);
SET session_replication_role = origin;

SET ROLE service_role;
DO $grace_test$
DECLARE j jsonb;
BEGIN
  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000004','room-reconnect-grace','participant'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'five-minute reconnect grace failed: %', j;
  END IF;
  IF (j->>'tokenExp')::bigint > extract(epoch FROM (clock_timestamp()+interval '5 minutes'))::bigint THEN
    RAISE EXCEPTION 'grace token exceeds the close window: %', j;
  END IF;
END
$grace_test$;
RESET ROLE;
