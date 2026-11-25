\set ON_ERROR_STOP on
-- Run after setup.sql and the five Café migrations. Synthetic accounts only.
-- This same fixture is executed by communityDatabase.test.ts in PGlite, and can
-- also run unchanged under native PostgreSQL 15 with psql -v ON_ERROR_STOP=1.
BEGIN;

DO $permissions$
DECLARE fn regprocedure; tbl regclass; denied boolean;
BEGIN
 FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname LIKE 'cafe_community_%' LOOP
  IF has_function_privilege('anon',fn,'EXECUTE') OR has_function_privilege('authenticated',fn,'EXECUTE')
    OR NOT has_function_privilege('service_role',fn,'EXECUTE') THEN
   RAISE EXCEPTION 'Community RPC permission failure: %',fn;
  END IF;
 END LOOP;
 FOR tbl IN SELECT oid::regclass FROM pg_class WHERE relnamespace='cafe_private'::regnamespace AND relkind='r' AND relname LIKE 'community_%' LOOP
  IF has_table_privilege('anon',tbl,'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated',tbl,'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('service_role',tbl,'SELECT,INSERT,UPDATE,DELETE') THEN
   RAISE EXCEPTION 'Community private table permission failure: %',tbl;
  END IF;
 END LOOP;
 SET LOCAL ROLE authenticated;
 denied:=false;
 BEGIN PERFORM public.cafe_community_snapshot_server('00000000-0000-4000-8000-000000000001');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Authenticated user invoked a trusted-actor RPC'; END IF;
 denied:=false;
 BEGIN PERFORM public.cafe_community_cleanup_pending_server(NULL);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Authenticated user invoked global call cleanup'; END IF;
 RESET ROLE;
END $permissions$;

DO $community$
DECLARE
 owner_id uuid:='00000000-0000-4000-8000-000000000002';
 learner_id uuid:='00000000-0000-4000-8000-000000000003';
 outsider_id uuid:='00000000-0000-4000-8000-000000000004';
 admin_id uuid:='00000000-0000-4000-8000-000000000001';
 member_id uuid; room_id uuid; call_id uuid; message_id uuid; report_id uuid;
 result jsonb; snapshot jsonb; cleanup jsonb;
BEGIN
 SET LOCAL ROLE service_role;
 result:=public.cafe_community_snapshot_server(owner_id);
 IF result->'me' IS DISTINCT FROM 'null'::jsonb OR result->>'ok'<>'true' THEN RAISE EXCEPTION 'Onboarding snapshot failed: %',result; END IF;
 FOREACH member_id IN ARRAY ARRAY[owner_id,learner_id,outsider_id] LOOP
  result:=public.cafe_community_command_server(member_id,'profile.save',jsonb_build_object(
   'displayName','Synthetic member','nativeLanguages',jsonb_build_array('fr'),
   'learningLanguages',jsonb_build_array('cmn','pt-br','sw'),'adultAgreement',true,'rulesAgreement',true));
  IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Profile save failed: %',result; END IF;
 END LOOP;
 result:=public.cafe_community_command_server(owner_id,'room.create',jsonb_build_object(
  'requestId','10000000-0000-4000-8000-000000000001','title','Synthetic chat','languages',jsonb_build_array('fr','cmn'),'mode','now','capacity',2));
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Room creation failed: %',result; END IF;
 room_id:=(result->>'roomId')::uuid;
 result:=public.cafe_community_command_server(learner_id,'room.join',jsonb_build_object('roomId',room_id));
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Room join failed: %',result; END IF;
 result:=public.cafe_community_command_server(outsider_id,'room.join',jsonb_build_object('roomId',room_id));
 IF result->>'code'<>'capacity_full' THEN RAISE EXCEPTION 'Owner did not count toward room capacity: %',result; END IF;
 result:=public.cafe_community_snapshot_server(outsider_id,room_id);
 IF result->>'code'<>'room_access_denied' THEN RAISE EXCEPTION 'Outsider read private conversation: %',result; END IF;
 result:=public.cafe_community_command_server(learner_id,'message.send',jsonb_build_object(
  'roomId',room_id,'requestId','10000000-0000-4000-8000-000000000002','body','Selected authentic report evidence'));
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Message send failed: %',result; END IF;
 snapshot:=public.cafe_community_snapshot_server(owner_id,room_id);
 IF jsonb_array_length(snapshot->'room'->'messages')<>1 THEN RAISE EXCEPTION 'Live conversation missing message: %',snapshot; END IF;
 message_id:=(snapshot->'room'->'messages'->0->>'id')::uuid;
 result:=public.cafe_community_command_server(owner_id,'call.invite',jsonb_build_object(
  'roomId',room_id,'targetId',learner_id,'requestId','10000000-0000-4000-8000-000000000003'));
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Call invitation failed: %',result; END IF;
 call_id:=(result->>'callId')::uuid;
 result:=public.cafe_community_command_server(owner_id,'call.respond',jsonb_build_object('callId',call_id,'accept',true));
 IF result->>'code'<>'call_access_denied' THEN RAISE EXCEPTION 'Sender accepted their own video invitation'; END IF;
 result:=public.cafe_community_command_server(learner_id,'call.respond',jsonb_build_object('callId',call_id,'accept',true));
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Recipient acceptance failed: %',result; END IF;
 result:=public.cafe_community_authorize_call_server(owner_id,call_id);
 IF result->>'ok'<>'true' OR (result->>'fromId')::uuid<>owner_id OR (result->>'toId')::uuid<>learner_id THEN RAISE EXCEPTION 'Accepted call authorization failed: %',result; END IF;
 result:=public.cafe_community_authorize_call_server(outsider_id,call_id);
 IF result->>'code'<>'call_access_denied' THEN RAISE EXCEPTION 'Unrelated account authorized for private video'; END IF;
 result:=public.cafe_community_command_server(owner_id,'member.block',jsonb_build_object('targetId',learner_id));
 IF result->>'ok'<>'true' OR NOT (result->'cleanupCallIds' ? call_id::text) THEN RAISE EXCEPTION 'Block omitted durable call cleanup: %',result; END IF;
 result:=public.cafe_community_authorize_call_server(learner_id,call_id);
 IF result->>'code'<>'call_access_denied' THEN RAISE EXCEPTION 'Block did not revoke video authorization'; END IF;
 result:=public.cafe_community_command_server(learner_id,'room.join',jsonb_build_object('roomId',room_id));
 IF result->>'code'<>'room_access_denied' THEN RAISE EXCEPTION 'Blocked member rejoined creator room'; END IF;
 result:=public.cafe_community_command_server(owner_id,'report.submit',jsonb_build_object(
  'roomId',room_id,'callId',call_id,'targetId',learner_id,'reason','sexual_harassment','messageIds',jsonb_build_array(message_id),'details','Synthetic report after block'));
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Report after block failed: %',result; END IF;
 report_id:=(result->>'reportId')::uuid;
 result:=public.cafe_community_reports_server(outsider_id);
 IF result->>'code'<>'access_denied' THEN RAISE EXCEPTION 'Non-admin read reports'; END IF;
 result:=public.cafe_community_reports_server(admin_id);
 IF result->>'ok'<>'true' OR jsonb_array_length(result->'reports')<>1
  OR result->'reports'->0->'messages'->0->>'body'<>'Selected authentic report evidence' THEN
  RAISE EXCEPTION 'Admin did not receive selected authentic evidence: %',result;
 END IF;
 result:=public.cafe_community_review_report_server(admin_id,report_id);
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Admin review failed: %',result; END IF;
 cleanup:=public.cafe_community_cleanup_pending_server(NULL);
 IF cleanup<>jsonb_build_array(jsonb_build_object('callId',call_id,'fromId',owner_id,'toId',learner_id,'generation',1)) THEN RAISE EXCEPTION 'Private cleanup omitted both participant IDs: %',cleanup; END IF;
 PERFORM public.cafe_community_cleanup_done_server(call_id,1);
 IF public.cafe_community_cleanup_pending_server(NULL)<>'[]'::jsonb THEN RAISE EXCEPTION 'Cleanup completion did not persist'; END IF;
 RESET ROLE;
 DELETE FROM auth.users WHERE id=owner_id;
 SET LOCAL ROLE service_role;
 cleanup:=public.cafe_community_cleanup_pending_server(NULL);
 IF cleanup<>jsonb_build_array(jsonb_build_object('callId',call_id,'fromId',owner_id,'toId',learner_id,'generation',2)) THEN RAISE EXCEPTION 'Account deletion lost provider cleanup: %',cleanup; END IF;
 result:=public.cafe_community_cleanup_done_server(call_id,1);
 IF result->>'completed'<>'false' THEN RAISE EXCEPTION 'Stale worker acknowledged a newer teardown generation'; END IF;
 PERFORM public.cafe_community_cleanup_done_server(call_id,2);
 IF public.cafe_community_cleanup_pending_server(NULL)<>'[]'::jsonb THEN RAISE EXCEPTION 'Independent teardown completion failed'; END IF;
 result:=public.cafe_community_cleanup_requeue_server(call_id);
 IF result->>'queued'<>'true' THEN RAISE EXCEPTION 'Delayed provisioning of a deleted call has no durable compensation'; END IF;
 result:=public.cafe_community_cleanup_done_server(call_id,2);
 IF result->>'completed'<>'false' THEN RAISE EXCEPTION 'Stale worker acknowledged delayed-provision compensation'; END IF;
 cleanup:=public.cafe_community_cleanup_pending_server(NULL);
 IF (cleanup->0->>'generation')::integer<>3 THEN RAISE EXCEPTION 'Detached cleanup generation did not advance'; END IF;
 PERFORM public.cafe_community_cleanup_done_server(call_id,3);
 RESET ROLE;
END $community$;

ROLLBACK;
SELECT 'PASS native PostgreSQL community permissions, capacity, private text, mutual video, block, report and cleanup' AS result;
