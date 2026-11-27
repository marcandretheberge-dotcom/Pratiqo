-- Competitive XP is separate from client-reported SRS/progress and all local
-- prototypes. Only server-checked new answers reach the award RPC. No backfill.
BEGIN;
CREATE SCHEMA IF NOT EXISTS yo_rankings_private;
REVOKE ALL ON SCHEMA yo_rankings_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA yo_rankings_private TO service_role;

-- Auth tables deliberately remain unreadable to service_role. This narrow
-- boolean predicate is the only definer function in this migration.
CREATE OR REPLACE FUNCTION yo_rankings_private.active(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
  WHERE u.id=p_user_id AND NOT coalesce(u.is_anonymous,false)
    AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())
    AND coalesce(p.is_active,true) AND p.deactivated_at IS NULL
    AND p.deleted_at IS NULL AND p.anonymized_at IS NULL AND p.deletion_requested_at IS NULL);
$$;
REVOKE ALL ON FUNCTION yo_rankings_private.active(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION yo_rankings_private.active(uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.yo_ranking_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name)<=24 AND display_name !~ '[<>@/\\[:cntrl:]]'),
 participating boolean NOT NULL DEFAULT false,
 friend_code text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)) UNIQUE CHECK (friend_code ~ '^[A-F0-9]{16}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (NOT participating OR char_length(display_name) BETWEEN 2 AND 24)
);
CREATE TABLE IF NOT EXISTS public.yo_ranked_events (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 language text NOT NULL CHECK(language IN('it','de','pt-BR','en','es','fr-CA','ja','zh')),
 item_id text NOT NULL CHECK(char_length(item_id) BETWEEN 8 AND 240 AND item_id ~ '^course:[A-Za-z0-9:_-]+$'),
 xp integer NOT NULL DEFAULT 10 CHECK(xp=10),
 awarded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,language,item_id)
);
CREATE INDEX IF NOT EXISTS yo_ranked_events_period ON public.yo_ranked_events(awarded_at,user_id);
CREATE INDEX IF NOT EXISTS yo_ranked_events_language_period ON public.yo_ranked_events(language,awarded_at,user_id);
CREATE TABLE IF NOT EXISTS public.yo_rank_friendships (
 requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN('pending','accepted','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(requester_id,recipient_id),
 CHECK(requester_id<>recipient_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS yo_rank_friend_pair ON public.yo_rank_friendships(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
CREATE INDEX IF NOT EXISTS yo_rank_friend_requester ON public.yo_rank_friendships(requester_id,status);
CREATE INDEX IF NOT EXISTS yo_rank_friend_recipient ON public.yo_rank_friendships(recipient_id,status);
CREATE TABLE IF NOT EXISTS public.yo_rank_blocks (
 blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);
CREATE INDEX IF NOT EXISTS yo_rank_block_target ON public.yo_rank_blocks(blocked_id,blocker_id);
CREATE TABLE IF NOT EXISTS public.yo_rank_limits (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('read','profile','friends','attempt')),
 minute_started timestamptz NOT NULL, minute_count integer NOT NULL,
 day_started date NOT NULL, day_count integer NOT NULL,
 PRIMARY KEY(user_id,kind)
);
ALTER TABLE public.yo_ranking_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_ranked_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_rank_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_rank_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_rank_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.yo_ranking_profiles,public.yo_ranked_events,public.yo_rank_friendships,public.yo_rank_blocks,public.yo_rank_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.yo_ranking_profiles,public.yo_ranked_events,public.yo_rank_friendships,public.yo_rank_blocks,public.yo_rank_limits TO service_role;

-- Reuse only the existing bidirectional block predicate. Never import Café
-- aliases/photos, consent, friend relationships or membership into YoPratiqo.
DO $$ BEGIN
 IF to_regprocedure('cafe_private.community_blocked(uuid,uuid)') IS NOT NULL THEN
  EXECUTE 'GRANT USAGE ON SCHEMA cafe_private TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION cafe_private.community_blocked(uuid,uuid) TO service_role';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.yo_rankings_blocked(p_a uuid,p_b uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE blocked boolean;
BEGIN
 IF EXISTS(SELECT 1 FROM public.yo_rank_blocks WHERE (blocker_id=p_a AND blocked_id=p_b) OR (blocker_id=p_b AND blocked_id=p_a)) THEN RETURN true; END IF;
 IF to_regprocedure('cafe_private.community_blocked(uuid,uuid)') IS NOT NULL THEN
  EXECUTE 'SELECT cafe_private.community_blocked($1,$2)' INTO blocked USING p_a,p_b;
  RETURN coalesce(blocked,false);
 END IF;
 RETURN false;
END $$;
CREATE OR REPLACE FUNCTION public.yo_rankings_week_start() RETURNS timestamptz
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT date_trunc('week',now() AT TIME ZONE 'America/Toronto') AT TIME ZONE 'America/Toronto';
$$;

-- Bounded, durable per-account rate limits work across application instances.
-- Reading rankings never initializes membership or silently opts anyone in.
CREATE OR REPLACE FUNCTION public.yo_rankings_throttle(p_user_id uuid,p_kind text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
DECLARE n timestamptz:=clock_timestamp(); d date; minute_limit int; day_limit int; row public.yo_rank_limits%ROWTYPE;
BEGIN
 IF NOT yo_rankings_private.active(p_user_id) THEN RAISE EXCEPTION 'account_unavailable'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN('read','profile','friends','attempt') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 minute_limit:=CASE p_kind WHEN 'read' THEN 60 WHEN 'profile' THEN 10 WHEN 'friends' THEN 10 ELSE 60 END;
 day_limit:=CASE p_kind WHEN 'read' THEN 5000 WHEN 'profile' THEN 100 WHEN 'friends' THEN 30 ELSE 1000 END;
 d:=(n AT TIME ZONE 'America/Toronto')::date;
 PERFORM pg_advisory_xact_lock(hashtextextended('yo-rank-limit:'||p_user_id::text||':'||p_kind,0));
 SELECT * INTO row FROM public.yo_rank_limits WHERE user_id=p_user_id AND kind=p_kind;
 IF row.user_id IS NULL THEN
  INSERT INTO public.yo_rank_limits VALUES(p_user_id,p_kind,n,1,d,1); RETURN true;
 END IF;
 IF row.minute_started<=n-interval '1 minute' THEN row.minute_started:=n; row.minute_count:=0; END IF;
 IF row.day_started<>d THEN row.day_started:=d; row.day_count:=0; END IF;
 IF row.minute_count>=minute_limit OR row.day_count>=day_limit THEN RETURN false; END IF;
 UPDATE public.yo_rank_limits SET minute_started=row.minute_started,minute_count=row.minute_count+1,
  day_started=row.day_started,day_count=row.day_count+1 WHERE user_id=p_user_id AND kind=p_kind;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.yo_rankings_xp(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT yo_rankings_private.active(p_user_id) THEN RAISE EXCEPTION 'account_unavailable'; END IF;
 RETURN (SELECT jsonb_build_object('totalXp',coalesce(sum(xp),0),'weekXp',coalesce(sum(xp) FILTER(WHERE awarded_at>=public.yo_rankings_week_start()),0))
 FROM public.yo_ranked_events WHERE user_id=p_user_id);
END $$;
CREATE OR REPLACE FUNCTION public.yo_rankings_set_profile(p_user_id uuid,p_name text,p_participating boolean) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT yo_rankings_private.active(p_user_id) THEN RAISE EXCEPTION 'account_unavailable'; END IF;
 IF p_participating IS NULL OR (p_participating AND (p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 24))
  OR (p_name IS NOT NULL AND (char_length(p_name)>24 OR p_name ~ '[<>@/\\[:cntrl:]]')) THEN RAISE EXCEPTION 'invalid_request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('yo-rank-user:'||p_user_id::text,0));
 INSERT INTO public.yo_ranking_profiles(user_id,display_name,participating)
 VALUES(p_user_id,coalesce(btrim(p_name),''),p_participating)
 ON CONFLICT(user_id) DO UPDATE SET display_name=coalesce(btrim(p_name),public.yo_ranking_profiles.display_name),
  participating=p_participating,updated_at=clock_timestamp();
END $$;
CREATE OR REPLACE FUNCTION public.yo_rankings_award(p_user_id uuid,p_language text,p_item_id text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
DECLARE awarded integer:=0; n timestamptz; day_start timestamptz;
BEGIN
 IF NOT yo_rankings_private.active(p_user_id) THEN RAISE EXCEPTION 'account_unavailable'; END IF;
 IF p_language IS NULL OR p_language NOT IN('it','de','pt-BR','en','es','fr-CA','ja','zh')
  OR p_item_id IS NULL OR char_length(p_item_id) NOT BETWEEN 8 AND 240 OR p_item_id !~ '^course:[A-Za-z0-9:_-]+$' THEN RAISE EXCEPTION 'invalid_request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('yo-rank-user:'||p_user_id::text,0));
 n:=clock_timestamp(); day_start:=date_trunc('day',n AT TIME ZONE 'America/Toronto') AT TIME ZONE 'America/Toronto';
 IF NOT EXISTS(SELECT 1 FROM public.yo_ranked_events WHERE user_id=p_user_id AND language=p_language AND item_id=p_item_id)
  AND (SELECT count(*) FROM public.yo_ranked_events WHERE user_id=p_user_id AND awarded_at>=day_start)<100 THEN
  INSERT INTO public.yo_ranking_profiles(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.yo_ranked_events(user_id,language,item_id,awarded_at) VALUES(p_user_id,p_language,p_item_id,n) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS awarded=ROW_COUNT; awarded:=awarded*10;
 END IF;
 RETURN public.yo_rankings_xp(p_user_id)||jsonb_build_object('awarded',awarded);
END $$;

CREATE OR REPLACE FUNCTION public.yo_rankings_friend_action(p_user_id uuid,p_action text,p_code text DEFAULT NULL,p_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
DECLARE target uuid; actor public.yo_ranking_profiles%ROWTYPE; person public.yo_ranking_profiles%ROWTYPE;
 relation public.yo_rank_friendships%ROWTYPE; n timestamptz:=clock_timestamp();
BEGIN
 IF NOT yo_rankings_private.active(p_user_id) THEN RAISE EXCEPTION 'account_unavailable'; END IF;
 IF p_action IS NULL OR p_action NOT IN('request','accept','decline','remove','block','unblock') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 SELECT * INTO actor FROM public.yo_ranking_profiles WHERE user_id=p_user_id;
 IF p_action='request' THEN SELECT * INTO person FROM public.yo_ranking_profiles WHERE friend_code=p_code;
 ELSE SELECT * INTO person FROM public.yo_ranking_profiles WHERE public_id=p_id; END IF;
 target:=person.user_id;
 IF actor.user_id IS NULL OR target IS NULL OR target=p_user_id THEN RAISE EXCEPTION 'invalid_friend'; END IF;
 -- Lock both accounts in stable order: requests, blocks and opt-outs serialize.
 PERFORM pg_advisory_xact_lock(hashtextextended('yo-rank-user:'||least(p_user_id,target)::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('yo-rank-user:'||greatest(p_user_id,target)::text,0));
 SELECT * INTO actor FROM public.yo_ranking_profiles WHERE user_id=p_user_id;
 SELECT * INTO person FROM public.yo_ranking_profiles WHERE user_id=target;
 SELECT * INTO relation FROM public.yo_rank_friendships
  WHERE least(requester_id,recipient_id)=least(p_user_id,target) AND greatest(requester_id,recipient_id)=greatest(p_user_id,target);
 IF p_action='unblock' THEN DELETE FROM public.yo_rank_blocks WHERE blocker_id=p_user_id AND blocked_id=target; RETURN; END IF;
 IF p_action='block' THEN
  IF (SELECT count(*) FROM public.yo_rank_blocks WHERE blocker_id=p_user_id)>=500
   AND NOT EXISTS(SELECT 1 FROM public.yo_rank_blocks WHERE blocker_id=p_user_id AND blocked_id=target) THEN RAISE EXCEPTION 'rate_limited'; END IF;
  INSERT INTO public.yo_rank_blocks(blocker_id,blocked_id) VALUES(p_user_id,target) ON CONFLICT DO NOTHING;
  UPDATE public.yo_rank_friendships SET status='closed',updated_at=n
   WHERE least(requester_id,recipient_id)=least(p_user_id,target) AND greatest(requester_id,recipient_id)=greatest(p_user_id,target);
  RETURN;
 END IF;
 IF p_action IN('decline','remove') THEN
  IF relation.requester_id IS NULL THEN RAISE EXCEPTION 'invalid_friend'; END IF;
  UPDATE public.yo_rank_friendships SET status='closed',updated_at=n
   WHERE least(requester_id,recipient_id)=least(p_user_id,target) AND greatest(requester_id,recipient_id)=greatest(p_user_id,target);
  RETURN;
 END IF;
 IF NOT actor.participating OR NOT person.participating OR NOT yo_rankings_private.active(target)
  OR public.yo_rankings_blocked(p_user_id,target) THEN RAISE EXCEPTION 'invalid_friend'; END IF;
 IF relation.status='accepted' THEN RETURN; END IF;
 IF p_action='accept' THEN
  IF relation.recipient_id IS DISTINCT FROM p_user_id OR relation.status IS DISTINCT FROM 'pending' OR relation.created_at<=n-interval '14 days' THEN RAISE EXCEPTION 'invalid_friend'; END IF;
  IF (SELECT count(*) FROM public.yo_rank_friendships WHERE status='accepted' AND p_user_id IN(requester_id,recipient_id))>=100
   OR (SELECT count(*) FROM public.yo_rank_friendships WHERE status='accepted' AND target IN(requester_id,recipient_id))>=100 THEN RAISE EXCEPTION 'rate_limited'; END IF;
  UPDATE public.yo_rank_friendships SET status='accepted',updated_at=n WHERE requester_id=relation.requester_id AND recipient_id=relation.recipient_id;
  RETURN;
 END IF;
 IF relation.status='pending' AND relation.created_at>n-interval '14 days' THEN RETURN; END IF;
 IF relation.status='closed' AND relation.updated_at>n-interval '1 day' THEN RAISE EXCEPTION 'invalid_friend'; END IF;
 IF (SELECT count(*) FROM public.yo_rank_friendships WHERE requester_id=p_user_id AND status='pending' AND created_at>n-interval '14 days')>=20
  OR (SELECT count(*) FROM public.yo_rank_friendships WHERE recipient_id=target AND status='pending' AND created_at>n-interval '14 days')>=50 THEN RAISE EXCEPTION 'rate_limited'; END IF;
 IF relation.requester_id IS NOT NULL THEN
  DELETE FROM public.yo_rank_friendships WHERE requester_id=relation.requester_id AND recipient_id=relation.recipient_id;
 END IF;
 INSERT INTO public.yo_rank_friendships(requester_id,recipient_id,status,created_at,updated_at) VALUES(p_user_id,target,'pending',n,n);
END $$;

CREATE OR REPLACE FUNCTION public.yo_rankings_read(p_user_id uuid,p_scope text DEFAULT 'everyone',p_period text DEFAULT 'week',p_language text DEFAULT 'all') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE profile jsonb; board jsonb; friends jsonb; n timestamptz:=now(); week_start timestamptz:=public.yo_rankings_week_start();
BEGIN
 IF NOT yo_rankings_private.active(p_user_id) THEN RAISE EXCEPTION 'account_unavailable'; END IF;
 IF p_scope IS NULL OR p_scope NOT IN('everyone','friends') OR p_period IS NULL OR p_period NOT IN('week','all')
  OR p_language IS NULL OR p_language NOT IN('all','it','de','pt-BR','en','es','fr-CA','ja','zh') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 SELECT jsonb_build_object('id',public_id,'displayName',display_name,'participating',participating,'friendCode',friend_code)
 INTO profile FROM public.yo_ranking_profiles WHERE user_id=p_user_id;
 profile:=coalesce(profile,jsonb_build_object('id','','displayName','','participating',false,'friendCode',''))||public.yo_rankings_xp(p_user_id);
 WITH accepted AS MATERIALIZED (
  SELECT CASE WHEN requester_id=p_user_id THEN recipient_id ELSE requester_id END AS other_id
  FROM public.yo_rank_friendships WHERE status='accepted' AND p_user_id IN(requester_id,recipient_id)
 ), eligible AS MATERIALIZED (
  SELECT p.user_id,p.public_id,p.display_name,(p.user_id=p_user_id) AS is_you,(a.other_id IS NOT NULL) AS is_friend
  FROM public.yo_ranking_profiles p LEFT JOIN accepted a ON a.other_id=p.user_id
  WHERE p.participating AND yo_rankings_private.active(p.user_id) AND NOT public.yo_rankings_blocked(p_user_id,p.user_id)
   AND (p_scope='everyone' OR p.user_id=p_user_id OR a.other_id IS NOT NULL)
 ), scores AS (
  SELECT e.*,coalesce(sum(x.xp),0) AS xp FROM eligible e LEFT JOIN public.yo_ranked_events x
   ON x.user_id=e.user_id AND (p_period='all' OR x.awarded_at>=week_start) AND (p_language='all' OR x.language=p_language)
  GROUP BY e.user_id,e.public_id,e.display_name,e.is_you,e.is_friend
 ), positioned AS MATERIALIZED (
  SELECT *,rank() OVER(ORDER BY xp DESC) AS rank,row_number() OVER(ORDER BY xp DESC,public_id) AS position FROM scores
 ), rendered AS MATERIALIZED (
  SELECT position,is_you,jsonb_build_object('id',public_id,'name',display_name,'xp',xp,'rank',rank,'isYou',is_you,'friend',is_friend) AS item FROM positioned
 ) SELECT jsonb_build_object(
  'rows',coalesce((SELECT jsonb_agg(item ORDER BY position) FROM rendered WHERE position<=20),'[]'::jsonb),
  'nearby',coalesce((SELECT jsonb_agg(item ORDER BY position) FROM rendered WHERE (SELECT position FROM rendered WHERE is_you)>=19 AND EXISTS(SELECT 1 FROM rendered WHERE position>20) AND abs(position-(SELECT position FROM rendered WHERE is_you))<=2),'[]'::jsonb),
  'me',(SELECT item FROM rendered WHERE is_you),'totalParticipants',(SELECT count(*) FROM rendered)) INTO board;
 WITH visible AS MATERIALIZED (
  SELECT p.user_id,p.public_id,p.display_name FROM public.yo_ranking_profiles p
  WHERE p.participating AND yo_rankings_private.active(p.user_id) AND NOT public.yo_rankings_blocked(p_user_id,p.user_id)
 ), connections AS MATERIALIZED (
  SELECT f.*,jsonb_build_object('id',p.public_id,'name',p.display_name) AS item
  FROM public.yo_rank_friendships f JOIN visible p ON p.user_id=CASE WHEN f.requester_id=p_user_id THEN f.recipient_id ELSE f.requester_id END
  WHERE p_user_id IN(f.requester_id,f.recipient_id) AND (f.status='accepted' OR (f.status='pending' AND f.created_at>n-interval '14 days'))
 ) SELECT jsonb_build_object(
  'incoming',coalesce((SELECT jsonb_agg(item ORDER BY created_at,requester_id) FROM connections WHERE status='pending' AND recipient_id=p_user_id),'[]'::jsonb),
  'outgoing',coalesce((SELECT jsonb_agg(item ORDER BY created_at,recipient_id) FROM connections WHERE status='pending' AND requester_id=p_user_id),'[]'::jsonb),
  'accepted',coalesce((SELECT jsonb_agg(item ORDER BY created_at,requester_id) FROM connections WHERE status='accepted'),'[]'::jsonb),
  'blocked',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.public_id,'name',CASE WHEN p.participating AND yo_rankings_private.active(p.user_id) THEN p.display_name ELSE '' END) ORDER BY b.created_at,p.public_id)
    FROM public.yo_rank_blocks b JOIN public.yo_ranking_profiles p ON p.user_id=b.blocked_id WHERE b.blocker_id=p_user_id),'[]'::jsonb)) INTO friends;
 RETURN jsonb_build_object('profile',profile,'scope',p_scope,'period',p_period,'language',p_language,'weekStartsAt',week_start,'friends',friends)
  || board;
END $$;

-- Every exposed function is invoker-only and service-only. No browser may
-- award XP, read private ledgers, impersonate an actor or enumerate codes.
REVOKE ALL ON FUNCTION public.yo_rankings_blocked(uuid,uuid),public.yo_rankings_week_start(),public.yo_rankings_throttle(uuid,text),public.yo_rankings_xp(uuid),public.yo_rankings_set_profile(uuid,text,boolean),public.yo_rankings_award(uuid,text,text),public.yo_rankings_friend_action(uuid,text,text,uuid),public.yo_rankings_read(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.yo_rankings_blocked(uuid,uuid),public.yo_rankings_week_start(),public.yo_rankings_throttle(uuid,text),public.yo_rankings_xp(uuid),public.yo_rankings_set_profile(uuid,text,boolean),public.yo_rankings_award(uuid,text,text),public.yo_rankings_friend_action(uuid,text,text,uuid),public.yo_rankings_read(uuid,text,text,text) TO service_role;
COMMIT;
