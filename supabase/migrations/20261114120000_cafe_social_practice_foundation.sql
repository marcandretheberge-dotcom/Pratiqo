-- Café social practice foundation: language lounges, presence, DMs, blocks/reports.
-- Gated in app by CAFE_SOCIAL_* flags. No production activation from this migration alone.
-- Follows Café secure pattern: RLS on, narrow authenticated policies, RPCs for mutations.

CREATE TABLE IF NOT EXISTS public.cafe_lounges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  native_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cafe_lounges_language_code_check
    CHECK (language_code = lower(language_code) AND char_length(language_code) BETWEEN 2 AND 16),
  CONSTRAINT cafe_lounges_slug_check
    CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT cafe_lounges_native_name_check
    CHECK (char_length(trim(native_name)) BETWEEN 1 AND 80)
);

CREATE TABLE IF NOT EXISTS public.cafe_member_blocks (
  blocker_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_profile_id, blocked_profile_id),
  CONSTRAINT cafe_member_blocks_not_self CHECK (blocker_profile_id <> blocked_profile_id)
);

CREATE TABLE IF NOT EXISTS public.cafe_member_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  context text NOT NULL DEFAULT 'general',
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cafe_member_reports_not_self CHECK (reporter_profile_id <> reported_profile_id),
  CONSTRAINT cafe_member_reports_context_check
    CHECK (context IN ('general', 'lounge', 'presence', 'dm', 'invitation')),
  CONSTRAINT cafe_member_reports_reason_check
    CHECK (char_length(trim(reason)) BETWEEN 3 AND 80),
  CONSTRAINT cafe_member_reports_details_check
    CHECK (details IS NULL OR char_length(details) <= 1000)
);

CREATE TABLE IF NOT EXISTS public.cafe_presence (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  appear_offline boolean NOT NULL DEFAULT false,
  short_intro text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  client_tab_id text NOT NULL DEFAULT 'default',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, client_tab_id),
  CONSTRAINT cafe_presence_language_code_check
    CHECK (language_code = lower(language_code) AND char_length(language_code) BETWEEN 2 AND 16),
  CONSTRAINT cafe_presence_status_check
    CHECK (status IN ('available', 'away', 'in_conversation')),
  CONSTRAINT cafe_presence_intro_check
    CHECK (short_intro IS NULL OR char_length(trim(short_intro)) BETWEEN 1 AND 140),
  CONSTRAINT cafe_presence_tab_check
    CHECK (char_length(trim(client_tab_id)) BETWEEN 1 AND 64)
);

CREATE TABLE IF NOT EXISTS public.cafe_lounge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lounge_id uuid NOT NULL REFERENCES public.cafe_lounges(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT cafe_lounge_messages_body_check
    CHECK (char_length(trim(body)) BETWEEN 1 AND 500)
);

CREATE TABLE IF NOT EXISTS public.cafe_dm_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT cafe_dm_invitations_not_self CHECK (from_profile_id <> to_profile_id),
  CONSTRAINT cafe_dm_invitations_language_check
    CHECK (language_code = lower(language_code) AND char_length(language_code) BETWEEN 2 AND 16),
  CONSTRAINT cafe_dm_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS cafe_dm_invitations_pending_pair_uidx
  ON public.cafe_dm_invitations (from_profile_id, to_profile_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.cafe_dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL UNIQUE REFERENCES public.cafe_dm_invitations(id) ON DELETE RESTRICT,
  language_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.cafe_dm_participants (
  thread_id uuid NOT NULL REFERENCES public.cafe_dm_threads(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (thread_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.cafe_dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.cafe_dm_threads(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT cafe_dm_messages_body_check
    CHECK (char_length(trim(body)) BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS cafe_presence_language_seen_idx
  ON public.cafe_presence (language_code, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS cafe_lounge_messages_lounge_created_idx
  ON public.cafe_lounge_messages (lounge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_dm_messages_thread_created_idx
  ON public.cafe_dm_messages (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_member_blocks_blocked_idx
  ON public.cafe_member_blocks (blocked_profile_id);

ALTER TABLE public.cafe_lounges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_member_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_member_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_lounge_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_dm_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_dm_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.cafe_lounges,
  public.cafe_member_blocks,
  public.cafe_member_reports,
  public.cafe_presence,
  public.cafe_lounge_messages,
  public.cafe_dm_invitations,
  public.cafe_dm_threads,
  public.cafe_dm_participants,
  public.cafe_dm_messages
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.cafe_lounges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cafe_member_blocks TO authenticated;
GRANT INSERT ON public.cafe_member_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cafe_presence TO authenticated;
GRANT SELECT, INSERT ON public.cafe_lounge_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cafe_dm_invitations TO authenticated;
GRANT SELECT ON public.cafe_dm_threads TO authenticated;
GRANT SELECT ON public.cafe_dm_participants TO authenticated;
GRANT SELECT, INSERT ON public.cafe_dm_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.cafe_profiles_blocked(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cafe_member_blocks
    WHERE (blocker_profile_id = a AND blocked_profile_id = b)
       OR (blocker_profile_id = b AND blocked_profile_id = a)
  );
$$;

REVOKE ALL ON FUNCTION public.cafe_profiles_blocked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_profiles_blocked(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS cafe_lounges_select_authenticated ON public.cafe_lounges;
CREATE POLICY cafe_lounges_select_authenticated
  ON public.cafe_lounges FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS cafe_member_blocks_own ON public.cafe_member_blocks;
CREATE POLICY cafe_member_blocks_own
  ON public.cafe_member_blocks FOR ALL TO authenticated
  USING (blocker_profile_id = auth.uid())
  WITH CHECK (blocker_profile_id = auth.uid() AND blocked_profile_id <> auth.uid());

DROP POLICY IF EXISTS cafe_member_reports_insert_own ON public.cafe_member_reports;
CREATE POLICY cafe_member_reports_insert_own
  ON public.cafe_member_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_profile_id = auth.uid() AND reported_profile_id <> auth.uid());

DROP POLICY IF EXISTS cafe_presence_own_write ON public.cafe_presence;
CREATE POLICY cafe_presence_own_write
  ON public.cafe_presence FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS cafe_presence_select_visible ON public.cafe_presence;
CREATE POLICY cafe_presence_select_visible
  ON public.cafe_presence FOR SELECT TO authenticated
  USING (
    appear_offline = false
    AND last_seen_at > now() - interval '75 seconds'
    AND NOT public.cafe_profiles_blocked(auth.uid(), profile_id)
  );

DROP POLICY IF EXISTS cafe_lounge_messages_select ON public.cafe_lounge_messages;
CREATE POLICY cafe_lounge_messages_select
  ON public.cafe_lounge_messages FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND NOT public.cafe_profiles_blocked(auth.uid(), profile_id)
  );

DROP POLICY IF EXISTS cafe_lounge_messages_insert_own ON public.cafe_lounge_messages;
CREATE POLICY cafe_lounge_messages_insert_own
  ON public.cafe_lounge_messages FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS cafe_dm_invitations_participants ON public.cafe_dm_invitations;
CREATE POLICY cafe_dm_invitations_participants
  ON public.cafe_dm_invitations FOR SELECT TO authenticated
  USING (from_profile_id = auth.uid() OR to_profile_id = auth.uid());

DROP POLICY IF EXISTS cafe_dm_invitations_insert_own ON public.cafe_dm_invitations;
CREATE POLICY cafe_dm_invitations_insert_own
  ON public.cafe_dm_invitations FOR INSERT TO authenticated
  WITH CHECK (
    from_profile_id = auth.uid()
    AND to_profile_id <> auth.uid()
    AND NOT public.cafe_profiles_blocked(auth.uid(), to_profile_id)
  );

DROP POLICY IF EXISTS cafe_dm_invitations_update_participants ON public.cafe_dm_invitations;
CREATE POLICY cafe_dm_invitations_update_participants
  ON public.cafe_dm_invitations FOR UPDATE TO authenticated
  USING (from_profile_id = auth.uid() OR to_profile_id = auth.uid())
  WITH CHECK (from_profile_id = auth.uid() OR to_profile_id = auth.uid());

DROP POLICY IF EXISTS cafe_dm_threads_participants ON public.cafe_dm_threads;
CREATE POLICY cafe_dm_threads_participants
  ON public.cafe_dm_threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_dm_participants p
      WHERE p.thread_id = cafe_dm_threads.id
        AND p.profile_id = auth.uid()
        AND p.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS cafe_dm_participants_self ON public.cafe_dm_participants;
CREATE POLICY cafe_dm_participants_self
  ON public.cafe_dm_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_dm_participants mine
      WHERE mine.thread_id = cafe_dm_participants.thread_id
        AND mine.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cafe_dm_messages_participants ON public.cafe_dm_messages;
CREATE POLICY cafe_dm_messages_participants
  ON public.cafe_dm_messages FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.cafe_dm_participants p
      WHERE p.thread_id = cafe_dm_messages.thread_id
        AND p.profile_id = auth.uid()
        AND p.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS cafe_dm_messages_insert_own ON public.cafe_dm_messages;
CREATE POLICY cafe_dm_messages_insert_own
  ON public.cafe_dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cafe_dm_participants p
      WHERE p.thread_id = cafe_dm_messages.thread_id
        AND p.profile_id = auth.uid()
        AND p.left_at IS NULL
    )
  );

INSERT INTO public.cafe_lounges (language_code, slug, native_name) VALUES
  ('fr', 'salon-francais', 'Français'),
  ('en', 'english-lounge', 'English'),
  ('es', 'salon-espanol', 'Español'),
  ('it', 'salotto-italiano', 'Italiano'),
  ('ja', 'salon-japonais', '日本語'),
  ('de', 'deutscher-salon', 'Deutsch'),
  ('pt', 'salao-portugues', 'Português'),
  ('zh', 'salon-chinois', '中文'),
  ('ar', 'salon-arabe', 'العربية')
ON CONFLICT (language_code) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cafe_lounge_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_lounge_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cafe_dm_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_dm_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cafe_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_presence;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
