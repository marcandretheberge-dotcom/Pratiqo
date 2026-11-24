-- One read-only summary over committed Italian practice events. No rollup
-- tables, client grants, or access granted to teacher/anonymous accounts.
CREATE INDEX IF NOT EXISTS yo_learning_events_practice_user_date_idx
  ON public.yo_learning_events (user_id, created_at)
  WHERE event_type = 'srs_practice';

CREATE OR REPLACE FUNCTION public.yo_daily_read(p_user_id uuid, p_timezone text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH zone AS (
    SELECT COALESCE(
      (SELECT name FROM pg_catalog.pg_timezone_names WHERE name = p_timezone),
      'America/Toronto'
    ) AS name
  ), activity AS (
    SELECT (e.created_at AT TIME ZONE z.name)::date AS day,
           count(DISTINCT e.item_id)::integer AS exercises
    FROM public.yo_learning_events e CROSS JOIN zone z
    WHERE e.user_id = p_user_id AND e.event_type = 'srs_practice'
    GROUP BY 1
  ), calendar AS (
    SELECT (now() AT TIME ZONE name)::date AS today FROM zone
  )
  SELECT jsonb_build_object(
    'today', c.today,
    'exercises', COALESCE((SELECT exercises FROM activity WHERE day = c.today), 0),
    'activeDays', COALESCE((SELECT jsonb_agg(day ORDER BY day) FROM activity WHERE day <= c.today), '[]'::jsonb)
  ) FROM calendar c;
$$;

REVOKE ALL ON FUNCTION public.yo_daily_read(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yo_daily_read(uuid,text) TO service_role;
