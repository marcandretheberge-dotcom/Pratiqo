-- One current declared project per student account. This does not subscribe
-- anyone to alerts, create a learner profile, or modify bookings/payments.
CREATE TABLE public.student_learning_projects (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT 'self' CHECK (audience IN ('self', 'child')),
  format text NOT NULL DEFAULT 'in_person' CHECK (format IN ('in_person', 'online', 'both')),
  city text NOT NULL DEFAULT '',
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(subject) <= 120 AND char_length(city) <= 120),
  CHECK (completed_at IS NULL OR
    (length(btrim(subject)) > 0 AND (format = 'online' OR length(btrim(city)) > 0)))
);
ALTER TABLE public.student_learning_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_learning_projects FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_learning_projects TO authenticated;
GRANT ALL ON public.student_learning_projects TO service_role;
CREATE POLICY student_learning_project_owner ON public.student_learning_projects
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) AND EXISTS
    (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student'))
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS
    (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student'));

-- Atomic save/defer: a delayed dismissal can never erase a completed project.
-- The invoker's JWT and table RLS both enforce ownership; no user id argument.
CREATE FUNCTION public.save_student_learning_project(
  p_action text, p_subject text DEFAULT '', p_audience text DEFAULT 'self',
  p_format text DEFAULT 'in_person', p_city text DEFAULT ''
) RETURNS public.student_learning_projects
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE result public.student_learning_projects;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_action = 'dismiss' THEN
    INSERT INTO public.student_learning_projects (user_id, dismissed_at)
      VALUES (auth.uid(), now())
    ON CONFLICT (user_id) DO UPDATE SET
      dismissed_at = CASE WHEN student_learning_projects.completed_at IS NULL
        THEN now() ELSE student_learning_projects.dismissed_at END,
      updated_at = CASE WHEN student_learning_projects.completed_at IS NULL
        THEN now() ELSE student_learning_projects.updated_at END
    RETURNING * INTO result;
  ELSIF p_action = 'save' THEN
    IF p_subject IS NULL OR length(btrim(p_subject)) = 0 OR
       p_audience IS NULL OR p_format IS NULL OR p_city IS NULL THEN
      RAISE EXCEPTION 'invalid learning project' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.student_learning_projects
      (user_id, subject, audience, format, city, completed_at)
    VALUES (auth.uid(), btrim(p_subject), p_audience, p_format,
      CASE WHEN p_format = 'online' THEN '' ELSE btrim(p_city) END, now())
    ON CONFLICT (user_id) DO UPDATE SET
      subject = excluded.subject, audience = excluded.audience,
      format = excluded.format, city = excluded.city,
      completed_at = excluded.completed_at, dismissed_at = NULL, updated_at = now()
    RETURNING * INTO result;
  ELSE
    RAISE EXCEPTION 'invalid action' USING ERRCODE = '22023';
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.save_student_learning_project(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_student_learning_project(text,text,text,text,text) TO authenticated;

-- Private service-only operational summary. Missing answers are not zero demand.
-- Counts describe current student ACCOUNTS, not visits or unique children.
CREATE FUNCTION public.student_learning_project_overview() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH students AS (
    SELECT p.id, s.subject, s.audience, s.format, s.city, s.completed_at, s.dismissed_at, s.updated_at
    FROM public.profiles p LEFT JOIN public.student_learning_projects s ON s.user_id = p.id
    WHERE p.role = 'student'
  ), groups AS (
    SELECT lower(btrim(subject)) AS subject_key, lower(btrim(city)) AS city_key,
      min(subject) AS subject, min(city) AS city, audience, format,
      count(*) AS account_count, max(updated_at) AS updated_at
    FROM students WHERE completed_at IS NOT NULL
    GROUP BY lower(btrim(subject)), lower(btrim(city)), audience, format
  )
  SELECT jsonb_build_object(
    'totalAccounts', (SELECT count(*) FROM students),
    'declaredAccounts', (SELECT count(*) FROM students WHERE completed_at IS NOT NULL),
    'deferredAccounts', (SELECT count(*) FROM students WHERE completed_at IS NULL AND dismissed_at IS NOT NULL),
    'unansweredAccounts', (SELECT count(*) FROM students WHERE completed_at IS NULL AND dismissed_at IS NULL),
    'groups', coalesce((SELECT jsonb_agg(to_jsonb(g) - 'subject_key' - 'city_key'
      ORDER BY account_count DESC, updated_at DESC) FROM groups g), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.student_learning_project_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_learning_project_overview() TO service_role;
