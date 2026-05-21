-- Launch security hotfix: ensure every known public application table has RLS enabled.
-- This migration is intentionally conservative: it enables RLS, adds only the
-- missing safe public-read policy for learning_disciplines, and does not create
-- broad fallback allow policies.

ALTER TABLE IF EXISTS public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.group_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learning_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waitlist ENABLE ROW LEVEL SECURITY;

-- learning_disciplines is public taxonomy data: safe to read, not safe to write
-- from anon/authenticated clients. Service-role/admin writes bypass RLS.
DROP POLICY IF EXISTS "learning_disciplines_select_public" ON public.learning_disciplines;
CREATE POLICY "learning_disciplines_select_public"
  ON public.learning_disciplines
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Production drift guard: if any additional ordinary public application table
-- exists with RLS disabled, enable it. Extension-owned tables are excluded
-- because locking them down can break extension internals such as PostGIS.
-- Without an explicit policy, drift tables are locked down for anon/authenticated
-- clients, which is safer than accidental public access.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE 'sql_%'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.objid = c.oid
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.table_name);
  END LOOP;
END $$;
