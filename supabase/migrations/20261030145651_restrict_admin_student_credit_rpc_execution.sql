-- Explicit role grants survive REVOKE FROM PUBLIC (migration 088).
-- Keep grant/void behind requireAdminApi and its service-role client.
-- Only function ACLs change; no business rows, function bodies or table policies.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

REVOKE ALL ON FUNCTION public.admin_grant_student_credit(uuid, integer, text, text, text, timestamptz, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_void_student_credit(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_student_credit(uuid, integer, text, text, text, timestamptz, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_void_student_credit(uuid, text, uuid, text) TO service_role;

DO $verify$
DECLARE
  target regprocedure;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.admin_grant_student_credit(uuid,integer,text,text,text,timestamptz,uuid,text)'::regprocedure,
    'public.admin_void_student_credit(uuid,text,uuid,text)'::regprocedure
  ] LOOP
    IF has_function_privilege('anon', target, 'EXECUTE')
       OR has_function_privilege('authenticated', target, 'EXECUTE')
       OR NOT has_function_privilege('service_role', target, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected credit RPC permissions: %', target;
    END IF;
  END LOOP;
END
$verify$;
