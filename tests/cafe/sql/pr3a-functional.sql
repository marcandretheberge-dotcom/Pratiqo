\set ON_ERROR_STOP on

-- Adults-only pilot agreements. User 5 intentionally has none.
INSERT INTO cafe_private.participant_agreements (
  profile_id, adult_attested_at, rules_version, rules_accepted_at
) VALUES
 ('00000000-0000-4000-8000-000000000002', clock_timestamp(), 'cafe-pilot-adults-v1', clock_timestamp()),
 ('00000000-0000-4000-8000-000000000003', clock_timestamp(), 'cafe-pilot-adults-v1', clock_timestamp()),
 ('00000000-0000-4000-8000-000000000004', clock_timestamp(), 'cafe-pilot-adults-v1', clock_timestamp()),
 ('00000000-0000-4000-8000-000000000006', clock_timestamp(), 'cafe-pilot-adults-v1', clock_timestamp()),
 ('00000000-0000-4000-8000-000000000007', clock_timestamp(), 'cafe-pilot-adults-v1', clock_timestamp());

SET ROLE service_role;

-- Participant window is open (T-5), host assigned to user 2.
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'room-joinable','Joinable Café','fr','es','A2',
 clock_timestamp() + interval '5 minutes',30,8,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','room-joinable');
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000003','room-joinable','reserve',0,
 '61000000-0000-4000-8000-000000000001'
);
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000004','room-joinable','reserve',0,
 '61000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000005','room-joinable','reserve',0,
 '61000000-0000-4000-8000-000000000003'
);

-- Host is allowed at T-12; participant is still too early.
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'room-host-early','Host early Café','it',NULL,NULL,
 clock_timestamp() + interval '12 minutes',30,8,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','room-host-early');
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000003','room-host-early','reserve',0,
 '61000000-0000-4000-8000-000000000004'
);

-- Both roles are too early.
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'room-too-early','Too early Café','de',NULL,NULL,
 clock_timestamp() + interval '30 minutes',30,8,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','room-too-early');
SELECT public.cafe_set_reservation_server(
 '00000000-0000-4000-8000-000000000003','room-too-early','reserve',0,
 '61000000-0000-4000-8000-000000000005'
);

-- Draft and cancelled states.
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'room-draft','Draft Café','ja',NULL,NULL,
 clock_timestamp() + interval '5 minutes',30,8,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_create_draft_server(
 '00000000-0000-4000-8000-000000000001',
 'room-cancelled','Cancelled Café','pt',NULL,NULL,
 clock_timestamp() + interval '5 minutes',30,8,
 '00000000-0000-4000-8000-000000000002'
);
SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','room-cancelled');
SELECT public.cafe_admin_cancel_server('00000000-0000-4000-8000-000000000001','room-cancelled');

DO $truth_table$
DECLARE
  j jsonb;
  session_id uuid;
BEGIN
  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000003','room-joinable','participant'
  );
  IF j->>'ok' <> 'true'
     OR j->>'code' <> 'join_authorized'
     OR j->>'displayName' <> 'Alice'
     OR j->>'role' <> 'participant'
     OR (j->>'maxParticipants')::integer <> 8 THEN
    RAISE EXCEPTION 'joinable participant failed: %', j;
  END IF;
  session_id := (j->>'sessionId')::uuid;

  -- A teacher account can participate as a learner when reserved.
  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000004','room-joinable','participant'
  );
  IF j->>'ok' <> 'true' OR j->>'displayName' <> 'Thomas' THEN
    RAISE EXCEPTION 'role-neutral participant failed: %', j;
  END IF;

  -- Teacher status alone never grants host authority.
  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000004','room-joinable','host'
  );
  IF j->>'code' <> 'access_denied' THEN
    RAISE EXCEPTION 'unassigned teacher received host authority: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000002','room-host-early','host'
  );
  IF j->>'ok' <> 'true' OR j->>'role' <> 'host' THEN
    RAISE EXCEPTION 'host T-15 window failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000003','room-host-early','participant'
  );
  IF j->>'code' <> 'too_early' OR j->>'opensAt' IS NULL THEN
    RAISE EXCEPTION 'participant T-10 window failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000003','room-too-early','participant'
  );
  IF j->>'code' <> 'too_early' THEN
    RAISE EXCEPTION 'too-early participant failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000006','room-joinable','participant'
  );
  IF j->>'code' <> 'not_reserved' THEN
    RAISE EXCEPTION 'unreserved participant failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000005','room-joinable','participant'
  );
  IF j->>'code' <> 'adult_rules_required' THEN
    RAISE EXCEPTION 'adult agreement gate failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000003','room-draft','participant'
  );
  IF j->>'code' <> 'session_not_found' THEN
    RAISE EXCEPTION 'draft concealment failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000003','room-cancelled','participant'
  );
  IF j->>'code' <> 'session_cancelled' THEN
    RAISE EXCEPTION 'cancelled state failed: %', j;
  END IF;

  j := public.cafe_bind_room_server(
    session_id,'daily','cafe-abcdefghijklmnopqrstuvwx'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'first room binding failed: %', j;
  END IF;
  j := public.cafe_bind_room_server(
    session_id,'daily','cafe-abcdefghijklmnopqrstuvwx'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'idempotent room binding failed: %', j;
  END IF;
  j := public.cafe_bind_room_server(
    session_id,'daily','cafe-zyxwvutsrqponmlkjihgfedc'
  );
  IF j->>'code' <> 'binding_conflict' THEN
    RAISE EXCEPTION 'binding conflict was not rejected: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000003','room-joinable','participant'
  );
  IF j->>'provider' <> 'daily'
     OR j->>'providerRoomId' <> 'cafe-abcdefghijklmnopqrstuvwx' THEN
    RAISE EXCEPTION 'binding not returned to server authorization: %', j;
  END IF;

  j := public.cafe_record_removal_server(
    '00000000-0000-4000-8000-000000000002',
    'room-joinable',
    '00000000-0000-4000-8000-000000000003',
    'conduct'
  );
  IF j->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'host removal failed: %', j;
  END IF;

  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000003','room-joinable','participant'
  );
  IF j->>'code' <> 'access_denied' THEN
    RAISE EXCEPTION 'removed participant could rejoin: %', j;
  END IF;

  j := public.cafe_record_removal_server(
    '00000000-0000-4000-8000-000000000004',
    'room-joinable',
    '00000000-0000-4000-8000-000000000003',
    'conduct'
  );
  IF j->>'code' <> 'access_denied' THEN
    RAISE EXCEPTION 'unassigned teacher could remove participant: %', j;
  END IF;
END
$truth_table$;

RESET ROLE;

-- Create an ended fixture without weakening production triggers.
SET session_replication_role = replica;
INSERT INTO public.cafe_sessions (
  id, slug, title, primary_language, starts_at, duration_minutes,
  max_participants, status, host_profile_id, created_by_profile_id,
  published_at, created_at, updated_at
) VALUES (
  '70000000-0000-4000-8000-000000000001',
  'room-ended','Ended Café','fr',clock_timestamp() - interval '40 minutes',
  30,8,'published',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  clock_timestamp() - interval '1 day',clock_timestamp(),clock_timestamp()
);
INSERT INTO public.cafe_reservations (
  session_id, profile_id, status, version, reserved_at, cancelled_at,
  last_request_id, last_action, last_expected_version, created_at, updated_at
) VALUES (
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000004',
  'confirmed',1,clock_timestamp()-interval '1 hour',NULL,
  '71000000-0000-4000-8000-000000000001','reserve',0,
  clock_timestamp(),clock_timestamp()
);
SET session_replication_role = origin;

SET ROLE service_role;
DO $ended_test$
DECLARE j jsonb;
BEGIN
  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000004','room-ended','participant'
  );
  IF j->>'code' <> 'ended' THEN
    RAISE EXCEPTION 'ended state failed: %', j;
  END IF;
END
$ended_test$;
RESET ROLE;

-- Account eligibility is checked before reservation/role details.
UPDATE public.profiles
SET is_active = false
WHERE id='00000000-0000-4000-8000-000000000006';
SET ROLE service_role;
DO $inactive_test$
DECLARE j jsonb;
BEGIN
  j := public.cafe_authorize_join_server(
    '00000000-0000-4000-8000-000000000006','room-joinable','participant'
  );
  IF j->>'code' <> 'account_unavailable' THEN
    RAISE EXCEPTION 'inactive account gate failed: %', j;
  END IF;
END
$inactive_test$;
RESET ROLE;
