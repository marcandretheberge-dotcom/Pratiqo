-- Prevent authenticated users from self-assigning or removing the admin role.
-- Service-role backend paths (Supabase admin client) may still manage roles when needed.

CREATE OR REPLACE FUNCTION public.profiles_guard_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  -- Caller JWT only; service_role bypass is limited to the JWT role claim.
  jwt_role := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' THEN
      NEW.role := 'student';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: never demote an existing admin or self-promote to admin.
  IF OLD.role = 'admin' AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  ELSIF NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin' THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_escalation_trigger ON public.profiles;
CREATE TRIGGER profiles_guard_role_escalation_trigger
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_escalation();

COMMENT ON FUNCTION public.profiles_guard_role_escalation() IS
  'Blocks non-service JWT clients from assigning or removing profiles.role = admin. Only auth JWT role service_role bypasses.';
