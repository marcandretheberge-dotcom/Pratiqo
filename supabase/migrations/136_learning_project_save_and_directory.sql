-- 135 remains unchanged. Apply this migration before deploying the v2 API.
-- Keep the existing 30/minute per-student budget without an external Redis
-- dependency. One private counter per account; no cron, notifications or names.
CREATE TABLE public.student_learning_project_write_limits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  write_count integer NOT NULL CHECK (write_count BETWEEN 1 AND 30)
);
ALTER TABLE public.student_learning_project_write_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_learning_project_write_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.student_learning_project_write_limits TO service_role;

CREATE FUNCTION public.enforce_student_learning_project_write_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  actor uuid := auth.uid();
  bucket timestamptz := date_trunc('minute', statement_timestamp());
  consumed integer;
BEGIN
  -- Trusted maintenance is not a student request. An authenticated caller with
  -- a missing subject must never acquire this exemption.
  IF actor IS NULL AND current_setting('role', true) IN ('none', 'postgres', 'service_role') THEN
    RETURN NULL;
  END IF;
  IF actor IS NULL OR actor <> NEW.user_id THEN
    RAISE EXCEPTION 'student account required' USING ERRCODE = '42501';
  END IF;

  -- ON CONFLICT locks the account counter: concurrent requests cannot each
  -- observe the same remaining budget. A failed project write rolls this back.
  INSERT INTO public.student_learning_project_write_limits AS limits
    (user_id, window_start, write_count) VALUES (actor, bucket, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    window_start = greatest(limits.window_start, excluded.window_start),
    write_count = CASE WHEN limits.window_start < excluded.window_start
      THEN 1 ELSE limits.write_count + 1 END
  WHERE limits.window_start < excluded.window_start OR limits.write_count < 30
  RETURNING write_count INTO consumed;
  IF consumed IS NULL THEN
    RAISE EXCEPTION 'learning_project_rate_limited' USING ERRCODE = 'PT429';
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_student_learning_project_write_limit()
  FROM PUBLIC, anon, authenticated;

-- AFTER runs once for the actual upsert outcome (not once for its attempted
-- INSERT and again for UPDATE). Covers direct saves and the original RPC too.
-- DELETE is unchanged: it cannot reset the counter (which belongs to profiles)
-- and account-deletion cascades must not consume quota or recreate a counter.
CREATE TRIGGER student_learning_project_write_limit
AFTER INSERT OR UPDATE ON public.student_learning_projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_student_learning_project_write_limit();

-- Versioned entry point is a deployment guard: code deployed before 136 fails
-- closed instead of silently using the original RPC without a database quota.
CREATE FUNCTION public.save_student_learning_project_v2(
  p_action text, p_subject text DEFAULT '', p_audience text DEFAULT 'self',
  p_format text DEFAULT 'in_person', p_city text DEFAULT ''
) RETURNS public.student_learning_projects
LANGUAGE sql SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT public.save_student_learning_project(p_action, p_subject, p_audience, p_format, p_city);
$$;
REVOKE ALL ON FUNCTION public.save_student_learning_project_v2(text,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_student_learning_project_v2(text,text,text,text,text)
  TO authenticated;

-- Private, bounded list of ALL student accounts, including unanswered projects.
-- Profile city and desired lesson city are deliberately separate: a preference
-- is not proof of where a person lives. No address or geolocation is returned.
CREATE FUNCTION public.admin_student_learning_project_directory(
  p_query text DEFAULT '', p_status text DEFAULT 'all', p_page integer DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF p_query IS NULL OR char_length(p_query) > 120 OR
     p_status IS NULL OR p_status NOT IN ('all', 'declared', 'deferred', 'unanswered') OR
     p_page IS NULL OR p_page < 1 OR p_page > 100000 THEN
    RAISE EXCEPTION 'invalid directory query' USING ERRCODE = '22023';
  END IF;
  WITH students AS (
    SELECT p.id, p.name, p.email, nullif(btrim(p.city), '') AS profile_city,
      p.created_at,
      (p.is_active IS FALSE OR p.deactivated_at IS NOT NULL OR
        p.deleted_at IS NOT NULL OR p.anonymized_at IS NOT NULL) AS inactive,
      CASE WHEN s.completed_at IS NOT NULL THEN s.subject END AS subject,
      CASE WHEN s.completed_at IS NOT NULL THEN s.audience END AS audience,
      CASE WHEN s.completed_at IS NOT NULL THEN s.format END AS format,
      CASE WHEN s.completed_at IS NOT NULL THEN nullif(btrim(s.city), '') END AS project_city,
      s.updated_at AS project_updated_at,
      CASE WHEN s.completed_at IS NOT NULL THEN 'declared'
        WHEN s.dismissed_at IS NOT NULL THEN 'deferred' ELSE 'unanswered' END AS status
    FROM public.profiles p
    LEFT JOIN public.student_learning_projects s ON s.user_id = p.id
    WHERE p.role = 'student'
  ), matching AS (
    SELECT * FROM students
    WHERE (p_status = 'all' OR status = p_status)
      AND (btrim(p_query) = '' OR position(lower(btrim(p_query)) IN lower(concat_ws(' ',
        name, email, profile_city, project_city, subject))) > 0)
  ), page AS (
    SELECT * FROM matching ORDER BY created_at DESC NULLS LAST, id
    LIMIT 25 OFFSET (p_page - 1) * 25
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM matching), 'page', p_page, 'pageSize', 25,
    'students', coalesce((SELECT jsonb_agg(to_jsonb(page)
      ORDER BY created_at DESC NULLS LAST, id) FROM page), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_student_learning_project_directory(text,text,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_student_learning_project_directory(text,text,integer)
  TO service_role;
