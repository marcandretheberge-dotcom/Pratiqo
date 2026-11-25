-- Café community: authenticated text rooms, expiring presence, personal blocks,
-- report evidence and explicitly accepted private call invitations.
-- All access is through service-only RPCs. The HTTP layer derives p_actor_id
-- from auth.getUser; no client may invoke these functions or read these tables.
-- Initial throughput tradeoff: a short transaction advisory lock serializes
-- community decisions. No network/provider work occurs while this lock is held.

CREATE TABLE cafe_private.community_members (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  native_languages text[] NOT NULL,
  learning_languages text[] NOT NULL,
  adult_attested_at timestamptz NOT NULL,
  rules_accepted_at timestamptz NOT NULL,
  rules_version text NOT NULL CHECK (rules_version = 'cafe-community-adults-v1'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cafe_private.community_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  languages text[] NOT NULL,
  mode text NOT NULL CHECK (mode IN ('now','scheduled')),
  state text NOT NULL CHECK (state IN ('scheduled','waiting','live','ended','cancelled')),
  starts_at timestamptz,
  capacity integer NOT NULL CHECK (capacity BETWEEN 2 AND 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  UNIQUE (creator_id, request_id),
  CHECK ((mode = 'now' AND starts_at IS NULL) OR (mode = 'scheduled' AND starts_at IS NOT NULL))
);
CREATE TABLE cafe_private.community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES cafe_private.community_rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz
);
CREATE UNIQUE INDEX cafe_community_one_active_membership ON cafe_private.community_memberships(profile_id) WHERE left_at IS NULL;
CREATE INDEX cafe_community_membership_room ON cafe_private.community_memberships(room_id, profile_id, joined_at);
CREATE TABLE cafe_private.community_presence (
  profile_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  room_id uuid REFERENCES cafe_private.community_rooms(id) ON DELETE SET NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, session_id)
);
CREATE INDEX cafe_community_presence_lease ON cafe_private.community_presence(last_seen_at);
CREATE TABLE cafe_private.community_rsvps (
  room_id uuid NOT NULL REFERENCES cafe_private.community_rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);
CREATE TABLE cafe_private.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES cafe_private.community_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, request_id)
);
CREATE INDEX cafe_community_messages_room ON cafe_private.community_messages(room_id, created_at DESC, id);
CREATE INDEX cafe_community_messages_sender ON cafe_private.community_messages(sender_id, created_at DESC);
CREATE TABLE cafe_private.community_blocks (
  blocker_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id), CHECK (blocker_id <> blocked_id)
);
CREATE INDEX cafe_community_blocks_reverse ON cafe_private.community_blocks(blocked_id, blocker_id);
CREATE TABLE cafe_private.community_room_bans (
  room_id uuid NOT NULL REFERENCES cafe_private.community_rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);
CREATE TABLE cafe_private.community_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES cafe_private.community_rooms(id) ON DELETE CASCADE,
  -- Copied at creation so a cascading room/profile deletion can still queue
  -- provider teardown after the parent room is no longer queryable.
  creator_id uuid NOT NULL,
  from_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled','ended','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  ends_at timestamptz,
  closed_at timestamptz,
  UNIQUE (from_id, request_id), CHECK (from_id <> to_id)
);
CREATE INDEX cafe_community_calls_from ON cafe_private.community_calls(from_id, created_at DESC);
CREATE INDEX cafe_community_calls_to ON cafe_private.community_calls(to_id, created_at DESC);
CREATE TABLE cafe_private.community_call_cleanup (
  -- Deliberately independent of account, room and call foreign keys: deleting
  -- local records must never erase an outstanding external teardown obligation.
  call_id uuid PRIMARY KEY,
  from_id uuid NOT NULL,
  to_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
  queued_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE cafe_private.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
  room_id uuid REFERENCES cafe_private.community_rooms(id) ON DELETE SET NULL,
  call_id uuid REFERENCES cafe_private.community_calls(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('sexual_harassment','harassment','spam','other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CHECK (reporter_id <> target_id)
);
CREATE INDEX cafe_community_reports_queue ON cafe_private.community_reports(status,created_at);

DO $acl$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['community_members','community_rooms','community_memberships','community_presence','community_rsvps','community_messages','community_blocks','community_room_bans','community_calls','community_call_cleanup','community_reports'] LOOP
    EXECUTE format('ALTER TABLE cafe_private.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON cafe_private.%I FROM PUBLIC, anon, authenticated, service_role',t);
  END LOOP;
END $acl$;

CREATE FUNCTION cafe_private.community_lock() RETURNS void
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  SELECT pg_advisory_xact_lock(hashtextextended('cafe-community-write-v1',0));
$$;
CREATE FUNCTION cafe_private.community_languages(p_value jsonb) RETURNS text[]
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE result text[];
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'array' THEN RETURN NULL; END IF;
  IF jsonb_array_length(p_value) NOT BETWEEN 1 AND 10
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_value) x WHERE jsonb_typeof(x) <> 'string') THEN RETURN NULL; END IF;
  SELECT array_agg(DISTINCT lower(trim(v)) ORDER BY lower(trim(v))) INTO result FROM jsonb_array_elements_text(p_value) v;
  IF EXISTS(SELECT 1 FROM unnest(result) v WHERE v !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$' OR char_length(v)>35) THEN RETURN NULL; END IF;
  RETURN result;
END $$;
CREATE FUNCTION cafe_private.community_ready(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT cafe_private.host_is_eligible(p_id) AND EXISTS(
   SELECT 1 FROM cafe_private.community_members m WHERE m.profile_id=p_id
     AND m.rules_version='cafe-community-adults-v1' AND m.adult_attested_at IS NOT NULL AND m.rules_accepted_at IS NOT NULL);
$$;
CREATE FUNCTION cafe_private.community_blocked(p_a uuid,p_b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM cafe_private.community_blocks b WHERE (b.blocker_id=p_a AND b.blocked_id=p_b) OR (b.blocker_id=p_b AND b.blocked_id=p_a));
$$;
CREATE FUNCTION cafe_private.community_member_json(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object('id',m.profile_id,'displayName',m.display_name,'nativeLanguages',m.native_languages,'learningLanguages',m.learning_languages)
 FROM cafe_private.community_members m WHERE m.profile_id=p_id;
$$;
CREATE FUNCTION cafe_private.community_in_room(p_id uuid,p_room uuid,p_now timestamptz) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT cafe_private.community_ready(p_id) AND EXISTS(SELECT 1 FROM cafe_private.community_memberships m
  WHERE m.profile_id=p_id AND m.room_id=p_room AND m.left_at IS NULL AND m.last_seen_at>p_now-interval '90 seconds');
$$;
CREATE FUNCTION cafe_private.community_online(p_id uuid,p_now timestamptz) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT cafe_private.community_ready(p_id) AND (EXISTS(SELECT 1 FROM cafe_private.community_presence p
   WHERE p.profile_id=p_id AND p.last_seen_at>p_now-interval '90 seconds')
   OR EXISTS(SELECT 1 FROM cafe_private.community_memberships m WHERE m.profile_id=p_id AND m.left_at IS NULL AND m.last_seen_at>p_now-interval '90 seconds'));
$$;
CREATE FUNCTION cafe_private.community_effective_room_state(p_id uuid,p_now timestamptz) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN r.state IN ('ended','cancelled') THEN r.state
   WHEN NOT cafe_private.community_ready(r.creator_id) THEN 'ended'
   WHEN r.state='scheduled' THEN CASE WHEN r.starts_at < p_now-interval '24 hours' THEN 'ended' ELSE 'scheduled' END
   WHEN NOT cafe_private.community_in_room(r.creator_id,r.id,p_now) THEN 'ended'
   WHEN (SELECT count(*) FROM cafe_private.community_memberships m WHERE m.room_id=r.id AND m.left_at IS NULL
     AND m.last_seen_at>p_now-interval '90 seconds' AND cafe_private.community_ready(m.profile_id))>1 THEN 'live'
   ELSE 'waiting' END
 FROM cafe_private.community_rooms r WHERE r.id=p_id;
$$;
CREATE FUNCTION cafe_private.community_room_json(p_id uuid,p_actor uuid,p_now timestamptz) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object('id',r.id,'title',r.title,'languages',r.languages,
  'creator',cafe_private.community_member_json(r.creator_id),'mode',r.mode,
  'state',cafe_private.community_effective_room_state(r.id,p_now),'startsAt',r.starts_at,'capacity',r.capacity,
  'participants',coalesce((SELECT jsonb_agg(cafe_private.community_member_json(m.profile_id) ORDER BY m.joined_at)
    FROM cafe_private.community_memberships m WHERE m.room_id=r.id AND m.left_at IS NULL AND m.last_seen_at>p_now-interval '90 seconds'
    AND cafe_private.community_ready(m.profile_id) AND NOT cafe_private.community_blocked(p_actor,m.profile_id)),'[]'::jsonb),
  'rsvpCount',(SELECT count(*) FROM cafe_private.community_rsvps v WHERE v.room_id=r.id),
  'myRsvp',EXISTS(SELECT 1 FROM cafe_private.community_rsvps v WHERE v.room_id=r.id AND v.profile_id=p_actor))
 FROM cafe_private.community_rooms r WHERE r.id=p_id;
$$;
CREATE FUNCTION cafe_private.community_call_status(p_id uuid,p_now timestamptz) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN c.status NOT IN ('pending','accepted') THEN c.status
  WHEN cafe_private.community_blocked(c.from_id,c.to_id)
   OR NOT cafe_private.community_in_room(c.from_id,c.room_id,p_now)
   OR NOT cafe_private.community_in_room(c.to_id,c.room_id,p_now)
   OR cafe_private.community_effective_room_state(c.room_id,p_now) NOT IN ('waiting','live') THEN 'ended'
  WHEN c.status='pending' AND c.expires_at<=p_now THEN 'expired'
  WHEN c.status='accepted' AND c.ends_at<=p_now THEN 'ended' ELSE c.status END
 FROM cafe_private.community_calls c WHERE c.id=p_id;
$$;
CREATE FUNCTION cafe_private.community_queue_cleanup(p_call uuid,p_from uuid,p_to uuid,p_creator uuid,p_now timestamptz) RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
 INSERT INTO cafe_private.community_call_cleanup(call_id,from_id,to_id,creator_id,queued_at)
 VALUES(p_call,p_from,p_to,p_creator,p_now)
 ON CONFLICT(call_id) DO UPDATE SET completed_at=NULL,queued_at=p_now,
  generation=cafe_private.community_call_cleanup.generation+1;
$$;
CREATE FUNCTION cafe_private.community_queue_call_deletion() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 -- This also runs for FK cascades from room/profile/auth.users deletion. Copy
 -- identities from OLD, not a parent table that may already have disappeared.
 IF OLD.status IN ('pending','accepted') OR OLD.accepted_at IS NOT NULL THEN
  PERFORM cafe_private.community_queue_cleanup(OLD.id,OLD.from_id,OLD.to_id,OLD.creator_id,clock_timestamp());
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER cafe_community_call_delete_cleanup
 BEFORE DELETE ON cafe_private.community_calls FOR EACH ROW
 EXECUTE FUNCTION cafe_private.community_queue_call_deletion();
CREATE FUNCTION cafe_private.community_close_calls(p_ids uuid[],p_status text,p_now timestamptz) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE cafe_private.community_calls SET status=p_status,closed_at=p_now WHERE id=ANY(p_ids) AND status IN ('pending','accepted');
 -- An explicit repeated close is also a durable compensation for provider work
 -- that completed after an earlier block/end cleanup finished.
 PERFORM cafe_private.community_queue_cleanup(id,from_id,to_id,creator_id,p_now) FROM cafe_private.community_calls WHERE id=ANY(p_ids);
END $$;
CREATE FUNCTION cafe_private.community_expire(p_now timestamptz) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE ids uuid[];
BEGIN
 UPDATE cafe_private.community_memberships SET left_at=least(last_seen_at+interval '90 seconds',p_now)
 WHERE left_at IS NULL AND (last_seen_at<=p_now-interval '90 seconds' OR NOT cafe_private.community_ready(profile_id));
 UPDATE cafe_private.community_rooms r SET state='ended',ended_at=p_now WHERE r.state IN ('scheduled','waiting','live')
  AND cafe_private.community_effective_room_state(r.id,p_now)='ended';
 UPDATE cafe_private.community_memberships m SET left_at=p_now WHERE m.left_at IS NULL
  AND EXISTS(SELECT 1 FROM cafe_private.community_rooms r WHERE r.id=m.room_id AND r.state IN ('ended','cancelled'));
 SELECT array_agg(c.id) INTO ids FROM cafe_private.community_calls c WHERE c.status IN ('pending','accepted')
  AND cafe_private.community_call_status(c.id,p_now) NOT IN ('pending','accepted');
 IF ids IS NOT NULL THEN
  UPDATE cafe_private.community_calls c SET status=CASE WHEN c.status='pending' AND c.expires_at<=p_now THEN 'expired' ELSE 'ended' END,closed_at=p_now WHERE c.id=ANY(ids);
  PERFORM cafe_private.community_queue_cleanup(id,from_id,to_id,creator_id,p_now) FROM cafe_private.community_calls WHERE id=ANY(ids);
 END IF;
 DELETE FROM cafe_private.community_presence WHERE last_seen_at<p_now-interval '1 day';
 DELETE FROM cafe_private.community_call_cleanup WHERE completed_at<p_now-interval '7 days';
END $$;

CREATE FUNCTION public.cafe_community_snapshot_server(p_actor_id uuid,p_room_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE decision_time timestamptz; me jsonb; rooms jsonb; people jsonb; room jsonb; calls jsonb; blocked jsonb; visible_ids uuid[];
BEGIN
 PERFORM cafe_private.community_lock();
 PERFORM cafe_private.require_active_profile(p_actor_id);
 decision_time:=clock_timestamp();
 me:=cafe_private.community_member_json(p_actor_id);
 IF me IS NULL THEN RETURN jsonb_build_object('ok',true,'me',NULL,'people','[]'::jsonb,'rooms','[]'::jsonb,'room',NULL,'calls','[]'::jsonb,'blockedMembers','[]'::jsonb,'serverTime',decision_time); END IF;
 IF NOT cafe_private.community_ready(p_actor_id) THEN RETURN jsonb_build_object('ok',false,'code','agreement_required'); END IF;
 SELECT array_agg(r.id ORDER BY r.created_at DESC) INTO visible_ids FROM cafe_private.community_rooms r
 WHERE cafe_private.community_effective_room_state(r.id,decision_time) IN ('scheduled','waiting','live')
 AND NOT cafe_private.community_blocked(p_actor_id,r.creator_id)
 AND NOT EXISTS(SELECT 1 FROM cafe_private.community_room_bans b WHERE b.room_id=r.id AND b.profile_id=p_actor_id)
 AND NOT EXISTS(SELECT 1 FROM cafe_private.community_memberships m WHERE m.room_id=r.id AND m.left_at IS NULL
   AND m.last_seen_at>decision_time-interval '90 seconds' AND cafe_private.community_blocked(p_actor_id,m.profile_id));
 SELECT coalesce(jsonb_agg(cafe_private.community_room_json(r.id,p_actor_id,decision_time) ORDER BY r.created_at DESC),'[]'::jsonb) INTO rooms
 FROM (SELECT listed.* FROM cafe_private.community_rooms listed WHERE listed.id=ANY(visible_ids)
  ORDER BY CASE WHEN listed.id=p_room_id OR cafe_private.community_in_room(p_actor_id,listed.id,decision_time) THEN 0 ELSE 1 END,
    listed.created_at DESC,listed.id LIMIT 500) r;
 SELECT coalesce(jsonb_agg(cafe_private.community_member_json(m.profile_id)||jsonb_build_object(
   'online',cafe_private.community_online(m.profile_id,decision_time),
   'roomId',(SELECT x.room_id FROM cafe_private.community_memberships x WHERE x.profile_id=m.profile_id AND x.left_at IS NULL
    AND x.last_seen_at>decision_time-interval '90 seconds' AND x.room_id=ANY(visible_ids) LIMIT 1)) ORDER BY m.display_name),'[]'::jsonb) INTO people
 FROM (SELECT listed.* FROM cafe_private.community_members listed WHERE listed.profile_id<>p_actor_id AND cafe_private.community_ready(listed.profile_id)
  AND NOT cafe_private.community_blocked(p_actor_id,listed.profile_id)
  AND (cafe_private.community_online(listed.profile_id,decision_time) OR EXISTS(SELECT 1 FROM cafe_private.community_rooms r WHERE r.id=ANY(visible_ids) AND r.creator_id=listed.profile_id))
  ORDER BY cafe_private.community_online(listed.profile_id,decision_time) DESC,listed.display_name,listed.profile_id LIMIT 500) m;
 IF p_room_id IS NOT NULL THEN
  IF NOT (p_room_id=ANY(coalesce(visible_ids,'{}'::uuid[]))) OR NOT cafe_private.community_in_room(p_actor_id,p_room_id,decision_time) THEN
   RETURN jsonb_build_object('ok',false,'code','room_access_denied');
  END IF;
  room:=cafe_private.community_room_json(p_room_id,p_actor_id,decision_time)||jsonb_build_object('messages',coalesce((
   SELECT jsonb_agg(jsonb_build_object('id',m.id,'roomId',m.room_id,'sender',cafe_private.community_member_json(m.sender_id),'body',m.body,'createdAt',m.created_at) ORDER BY m.created_at,m.id)
   FROM (SELECT msg.* FROM cafe_private.community_messages msg WHERE msg.room_id=p_room_id
    AND NOT cafe_private.community_blocked(p_actor_id,msg.sender_id)
    AND EXISTS(SELECT 1 FROM cafe_private.community_memberships own WHERE own.room_id=msg.room_id AND own.profile_id=p_actor_id
      AND own.joined_at<=msg.created_at AND (own.left_at IS NULL OR own.left_at>=msg.created_at))
    ORDER BY msg.created_at DESC,msg.id DESC LIMIT 100) m),'[]'::jsonb));
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'roomId',c.room_id,'from',cafe_private.community_member_json(c.from_id),
  'to',cafe_private.community_member_json(c.to_id),'status',cafe_private.community_call_status(c.id,decision_time),
  'createdAt',c.created_at,'expiresAt',c.expires_at,'endsAt',c.ends_at) ORDER BY c.created_at DESC),'[]'::jsonb) INTO calls
 FROM (SELECT * FROM cafe_private.community_calls WHERE (from_id=p_actor_id OR to_id=p_actor_id) AND created_at>decision_time-interval '1 day' ORDER BY created_at DESC LIMIT 20) c;
 SELECT coalesce(jsonb_agg(cafe_private.community_member_json(b.blocked_id) ORDER BY b.created_at DESC),'[]'::jsonb) INTO blocked
 FROM (SELECT * FROM cafe_private.community_blocks WHERE blocker_id=p_actor_id ORDER BY created_at DESC,blocked_id LIMIT 500) b;
 RETURN jsonb_build_object('ok',true,'me',me,'people',people,'rooms',rooms,'room',room,'calls',calls,'blockedMembers',blocked,'serverTime',decision_time);
EXCEPTION WHEN insufficient_privilege THEN RETURN jsonb_build_object('ok',false,'code','access_denied');
END $$;

CREATE FUNCTION public.cafe_community_command_server(p_actor_id uuid,p_action text,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 n timestamptz; rid uuid; target uuid; req uuid; cid uuid; sid uuid; new_id uuid;
 title text; body text; langs text[]; natives text[]; learning text[]; md text; start_at timestamptz; cap integer;
 r cafe_private.community_rooms%ROWTYPE; c cafe_private.community_calls%ROWTYPE;
 ids uuid[]; selected_ids uuid[]; evidence jsonb; result jsonb:=jsonb_build_object('ok',true); count_value integer;
BEGIN
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR p_action IS NULL THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
 PERFORM cafe_private.community_lock();
 PERFORM cafe_private.require_active_profile(p_actor_id); n:=clock_timestamp();
 PERFORM cafe_private.community_expire(n);
 IF p_action='profile.save' THEN
  title:=trim(p_payload->>'displayName'); natives:=cafe_private.community_languages(p_payload->'nativeLanguages'); learning:=cafe_private.community_languages(p_payload->'learningLanguages');
  IF title IS NULL OR char_length(title) NOT BETWEEN 1 AND 40 OR natives IS NULL OR learning IS NULL
   OR p_payload->'adultAgreement' IS DISTINCT FROM 'true'::jsonb OR p_payload->'rulesAgreement' IS DISTINCT FROM 'true'::jsonb THEN
   RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  INSERT INTO cafe_private.community_members(profile_id,display_name,native_languages,learning_languages,adult_attested_at,rules_accepted_at,rules_version)
   VALUES(p_actor_id,title,natives,learning,n,n,'cafe-community-adults-v1')
   ON CONFLICT(profile_id) DO UPDATE SET display_name=excluded.display_name,native_languages=excluded.native_languages,learning_languages=excluded.learning_languages,
    adult_attested_at=excluded.adult_attested_at,rules_accepted_at=excluded.rules_accepted_at,rules_version=excluded.rules_version,updated_at=n;
 ELSIF NOT cafe_private.community_ready(p_actor_id) THEN RETURN jsonb_build_object('ok',false,'code','profile_required');
 ELSIF p_action='presence.heartbeat' THEN
  sid:=(p_payload->>'presenceSessionId')::uuid; rid:=nullif(p_payload->>'roomId','')::uuid;
  IF sid IS NULL THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  IF rid IS NOT NULL AND NOT cafe_private.community_in_room(p_actor_id,rid,n) THEN RETURN jsonb_build_object('ok',false,'code','room_access_denied'); END IF;
  IF (SELECT count(*) FROM cafe_private.community_presence WHERE profile_id=p_actor_id AND last_seen_at>n-interval '90 seconds')>=20
    AND NOT EXISTS(SELECT 1 FROM cafe_private.community_presence WHERE profile_id=p_actor_id AND session_id=sid AND last_seen_at>n-interval '90 seconds') THEN RETURN jsonb_build_object('ok',false,'code','rate_limited'); END IF;
  INSERT INTO cafe_private.community_presence(profile_id,session_id,room_id,last_seen_at) VALUES(p_actor_id,sid,rid,n)
   ON CONFLICT(profile_id,session_id) DO UPDATE SET room_id=excluded.room_id,last_seen_at=n;
  IF rid IS NOT NULL THEN UPDATE cafe_private.community_memberships SET last_seen_at=n WHERE profile_id=p_actor_id AND room_id=rid AND left_at IS NULL; END IF;
 ELSIF p_action='presence.leave' THEN
  sid:=(p_payload->>'presenceSessionId')::uuid;
  IF sid IS NULL THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  DELETE FROM cafe_private.community_presence WHERE profile_id=p_actor_id AND session_id=sid;
 ELSIF p_action='room.create' THEN
  req:=(p_payload->>'requestId')::uuid; title:=trim(p_payload->>'title'); langs:=cafe_private.community_languages(p_payload->'languages');
  md:=p_payload->>'mode'; cap:=(p_payload->>'capacity')::integer; start_at:=nullif(p_payload->>'startsAt','')::timestamptz;
  IF req IS NULL OR title IS NULL OR char_length(title) NOT BETWEEN 1 AND 120 OR langs IS NULL OR md IS NULL OR md NOT IN ('now','scheduled') OR cap IS NULL OR cap NOT BETWEEN 2 AND 8
   OR (md='now' AND start_at IS NOT NULL) OR (md='scheduled' AND (start_at IS NULL OR start_at<=n OR start_at>n+interval '90 days')) THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  SELECT id INTO new_id FROM cafe_private.community_rooms WHERE creator_id=p_actor_id AND request_id=req;
  IF new_id IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'roomId',new_id); END IF;
  IF (SELECT count(*) FROM cafe_private.community_rooms WHERE creator_id=p_actor_id AND state IN ('scheduled','waiting','live'))>=3 THEN RETURN jsonb_build_object('ok',false,'code','room_limit'); END IF;
  IF md='now' AND EXISTS(SELECT 1 FROM cafe_private.community_memberships WHERE profile_id=p_actor_id AND left_at IS NULL) THEN RETURN jsonb_build_object('ok',false,'code','already_in_room'); END IF;
  INSERT INTO cafe_private.community_rooms(creator_id,request_id,title,languages,mode,state,starts_at,capacity)
   VALUES(p_actor_id,req,title,langs,md,CASE WHEN md='now' THEN 'waiting' ELSE 'scheduled' END,start_at,cap) RETURNING id INTO new_id;
  IF md='now' THEN INSERT INTO cafe_private.community_memberships(room_id,profile_id,joined_at,last_seen_at) VALUES(new_id,p_actor_id,n,n);
  ELSE INSERT INTO cafe_private.community_rsvps(room_id,profile_id) VALUES(new_id,p_actor_id); END IF;
  result:=result||jsonb_build_object('roomId',new_id);
 ELSIF p_action IN ('room.join','room.leave','room.end','room.rsvp','room.remove','message.send','call.invite') THEN
  rid:=(p_payload->>'roomId')::uuid;
  SELECT * INTO r FROM cafe_private.community_rooms WHERE id=rid;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','room_not_found'); END IF;
  IF p_action='room.leave' THEN
   IF r.creator_id=p_actor_id THEN UPDATE cafe_private.community_rooms SET state='ended',ended_at=n WHERE id=rid AND state NOT IN ('ended','cancelled');
    UPDATE cafe_private.community_memberships SET left_at=n WHERE room_id=rid AND left_at IS NULL;
   ELSE UPDATE cafe_private.community_memberships SET left_at=n WHERE room_id=rid AND profile_id=p_actor_id AND left_at IS NULL; END IF;
  ELSIF p_action='room.end' THEN
   IF r.creator_id<>p_actor_id THEN RETURN jsonb_build_object('ok',false,'code','access_denied'); END IF;
   UPDATE cafe_private.community_rooms SET state=CASE WHEN state='scheduled' THEN 'cancelled' ELSE 'ended' END,ended_at=n WHERE id=rid;
   UPDATE cafe_private.community_memberships SET left_at=n WHERE room_id=rid AND left_at IS NULL;
  ELSIF p_action='room.remove' THEN
   target:=(p_payload->>'targetId')::uuid;
   IF r.creator_id<>p_actor_id OR target IS NULL OR target=p_actor_id THEN RETURN jsonb_build_object('ok',false,'code','access_denied'); END IF;
   IF NOT EXISTS(SELECT 1 FROM cafe_private.community_members WHERE profile_id=target) THEN RETURN jsonb_build_object('ok',false,'code','member_not_found'); END IF;
   INSERT INTO cafe_private.community_room_bans(room_id,profile_id) VALUES(rid,target) ON CONFLICT DO NOTHING;
   UPDATE cafe_private.community_memberships SET left_at=n WHERE room_id=rid AND profile_id=target AND left_at IS NULL;
   DELETE FROM cafe_private.community_rsvps WHERE room_id=rid AND profile_id=target;
  ELSE
   IF cafe_private.community_blocked(p_actor_id,r.creator_id) OR EXISTS(SELECT 1 FROM cafe_private.community_room_bans WHERE room_id=rid AND profile_id=p_actor_id)
    OR EXISTS(SELECT 1 FROM cafe_private.community_memberships m WHERE m.room_id=rid AND m.left_at IS NULL AND m.last_seen_at>n-interval '90 seconds' AND cafe_private.community_blocked(p_actor_id,m.profile_id)) THEN
    RETURN jsonb_build_object('ok',false,'code','room_access_denied'); END IF;
   IF p_action='room.rsvp' THEN
    IF p_payload->'attending' NOT IN ('true'::jsonb,'false'::jsonb) OR p_payload->'attending' IS NULL THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
    IF p_payload->'attending'='false'::jsonb THEN
     IF r.creator_id=p_actor_id THEN RETURN jsonb_build_object('ok',false,'code','access_denied'); END IF;
     DELETE FROM cafe_private.community_rsvps WHERE room_id=rid AND profile_id=p_actor_id;
    ELSE
     IF r.state<>'scheduled' OR r.starts_at<=n THEN RETURN jsonb_build_object('ok',false,'code','room_unavailable'); END IF;
     IF NOT EXISTS(SELECT 1 FROM cafe_private.community_rsvps WHERE room_id=rid AND profile_id=p_actor_id) THEN
      IF (SELECT count(*) FROM cafe_private.community_rsvps WHERE room_id=rid)>=r.capacity THEN RETURN jsonb_build_object('ok',false,'code','capacity_full'); END IF;
      INSERT INTO cafe_private.community_rsvps(room_id,profile_id) VALUES(rid,p_actor_id);
     END IF;
    END IF;
   ELSIF p_action='room.join' THEN
    IF r.state='scheduled' THEN
     IF r.starts_at>n OR r.creator_id<>p_actor_id THEN RETURN jsonb_build_object('ok',false,'code','room_not_started'); END IF;
    ELSIF r.state NOT IN ('waiting','live') THEN RETURN jsonb_build_object('ok',false,'code','room_unavailable'); END IF;
    IF NOT cafe_private.community_in_room(p_actor_id,rid,n) THEN
     IF EXISTS(SELECT 1 FROM cafe_private.community_memberships WHERE profile_id=p_actor_id AND left_at IS NULL) THEN RETURN jsonb_build_object('ok',false,'code','already_in_room'); END IF;
     IF (SELECT count(*) FROM cafe_private.community_memberships WHERE room_id=rid AND left_at IS NULL AND last_seen_at>n-interval '90 seconds')>=r.capacity THEN RETURN jsonb_build_object('ok',false,'code','capacity_full'); END IF;
     INSERT INTO cafe_private.community_memberships(room_id,profile_id,joined_at,last_seen_at) VALUES(rid,p_actor_id,n,n);
    ELSE UPDATE cafe_private.community_memberships SET last_seen_at=n WHERE room_id=rid AND profile_id=p_actor_id AND left_at IS NULL; END IF;
    IF r.state='scheduled' THEN UPDATE cafe_private.community_rooms SET state='waiting' WHERE id=rid; END IF;
   ELSE
    IF r.state NOT IN ('waiting','live') OR NOT cafe_private.community_in_room(p_actor_id,rid,n) THEN RETURN jsonb_build_object('ok',false,'code','room_access_denied'); END IF;
    IF p_action='message.send' THEN
     req:=(p_payload->>'requestId')::uuid; body:=trim(p_payload->>'body');
     IF req IS NULL OR body IS NULL OR char_length(body) NOT BETWEEN 1 AND 2000 THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
     IF EXISTS(SELECT 1 FROM cafe_private.community_messages WHERE sender_id=p_actor_id AND request_id=req) THEN RETURN result; END IF;
     IF (SELECT count(*) FROM cafe_private.community_messages WHERE sender_id=p_actor_id AND created_at>n-interval '1 minute')>=40 THEN RETURN jsonb_build_object('ok',false,'code','rate_limited'); END IF;
     INSERT INTO cafe_private.community_messages(room_id,sender_id,request_id,body,created_at) VALUES(rid,p_actor_id,req,body,n);
    ELSIF p_action='call.invite' THEN
     target:=(p_payload->>'targetId')::uuid; req:=(p_payload->>'requestId')::uuid;
     IF target IS NULL OR target=p_actor_id OR req IS NULL THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
     IF NOT cafe_private.community_in_room(target,rid,n) OR cafe_private.community_blocked(p_actor_id,target) THEN RETURN jsonb_build_object('ok',false,'code','call_access_denied'); END IF;
     SELECT id INTO new_id FROM cafe_private.community_calls WHERE from_id=p_actor_id AND request_id=req;
     IF new_id IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'callId',new_id); END IF;
     IF EXISTS(SELECT 1 FROM cafe_private.community_calls WHERE status IN ('pending','accepted') AND (from_id IN (p_actor_id,target) OR to_id IN (p_actor_id,target))) THEN RETURN jsonb_build_object('ok',false,'code','call_busy'); END IF;
     IF EXISTS(SELECT 1 FROM cafe_private.community_calls WHERE from_id=p_actor_id AND to_id=target AND status='declined' AND closed_at>n-interval '2 minutes')
      OR (SELECT count(*) FROM cafe_private.community_calls WHERE from_id=p_actor_id AND created_at>n-interval '10 minutes')>=6 THEN RETURN jsonb_build_object('ok',false,'code','rate_limited'); END IF;
     INSERT INTO cafe_private.community_calls(room_id,creator_id,from_id,to_id,request_id,status,created_at,expires_at)
      VALUES(rid,r.creator_id,p_actor_id,target,req,'pending',n,n+interval '2 minutes') RETURNING id INTO new_id;
     result:=result||jsonb_build_object('callId',new_id);
    END IF;
   END IF;
  END IF;
 ELSIF p_action IN ('member.block','member.unblock') THEN
  target:=(p_payload->>'targetId')::uuid;
  IF target IS NULL OR target=p_actor_id OR NOT EXISTS(SELECT 1 FROM cafe_private.community_members WHERE profile_id=target) THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  IF p_action='member.unblock' THEN DELETE FROM cafe_private.community_blocks WHERE blocker_id=p_actor_id AND blocked_id=target;
  ELSE
   INSERT INTO cafe_private.community_blocks(blocker_id,blocked_id) VALUES(p_actor_id,target) ON CONFLICT DO NOTHING;
   -- A creator may remove the offender from their own room; an ordinary member
   -- leaves the shared interaction. A personal block never grants global moderation.
   UPDATE cafe_private.community_memberships m SET left_at=n WHERE m.left_at IS NULL AND (
    (m.profile_id=target AND EXISTS(SELECT 1 FROM cafe_private.community_rooms rr WHERE rr.id=m.room_id AND rr.creator_id=p_actor_id))
    OR (m.profile_id=p_actor_id AND EXISTS(SELECT 1 FROM cafe_private.community_memberships other WHERE other.room_id=m.room_id AND other.profile_id=target AND other.left_at IS NULL)
      AND NOT EXISTS(SELECT 1 FROM cafe_private.community_rooms rr WHERE rr.id=m.room_id AND rr.creator_id=p_actor_id)));
   INSERT INTO cafe_private.community_room_bans(room_id,profile_id)
    SELECT id,target FROM cafe_private.community_rooms WHERE creator_id=p_actor_id AND state IN ('waiting','live','scheduled') ON CONFLICT DO NOTHING;
   DELETE FROM cafe_private.community_rsvps v USING cafe_private.community_rooms rr WHERE v.room_id=rr.id AND ((rr.creator_id=p_actor_id AND v.profile_id=target) OR (rr.creator_id=target AND v.profile_id=p_actor_id));
  END IF;
 ELSIF p_action IN ('call.respond','call.end') THEN
  cid:=(p_payload->>'callId')::uuid; SELECT * INTO c FROM cafe_private.community_calls WHERE id=cid;
  IF NOT FOUND OR p_actor_id NOT IN (c.from_id,c.to_id) THEN RETURN jsonb_build_object('ok',false,'code','call_access_denied'); END IF;
  IF p_action='call.end' THEN PERFORM cafe_private.community_close_calls(ARRAY[cid],CASE WHEN c.status='pending' THEN 'cancelled' ELSE 'ended' END,n);
  ELSE
   IF c.to_id<>p_actor_id OR p_payload->'accept' IS NULL OR p_payload->'accept' NOT IN ('true'::jsonb,'false'::jsonb) THEN RETURN jsonb_build_object('ok',false,'code','call_access_denied'); END IF;
   IF c.status='accepted' AND p_payload->'accept'='true'::jsonb THEN RETURN jsonb_build_object('ok',true,'callId',cid); END IF;
   IF c.status<>'pending' OR c.expires_at<=n THEN RETURN jsonb_build_object('ok',false,'code','call_unavailable'); END IF;
   IF p_payload->'accept'='true'::jsonb THEN
    IF cafe_private.community_blocked(c.from_id,c.to_id) OR NOT cafe_private.community_in_room(c.from_id,c.room_id,n) OR NOT cafe_private.community_in_room(c.to_id,c.room_id,n) THEN RETURN jsonb_build_object('ok',false,'code','call_access_denied'); END IF;
    UPDATE cafe_private.community_calls SET status='accepted',accepted_at=n,ends_at=n+interval '60 minutes' WHERE id=cid;
   ELSE PERFORM cafe_private.community_close_calls(ARRAY[cid],'declined',n); END IF;
   result:=result||jsonb_build_object('callId',cid);
  END IF;
 ELSIF p_action='report.submit' THEN
  target:=(p_payload->>'targetId')::uuid; rid:=nullif(p_payload->>'roomId','')::uuid; cid:=nullif(p_payload->>'callId','')::uuid;
  body:=coalesce(trim(p_payload->>'details'),''); title:=p_payload->>'reason';
  IF target IS NULL OR target=p_actor_id OR NOT EXISTS(SELECT 1 FROM cafe_private.community_members WHERE profile_id=target)
   OR title IS NULL OR title NOT IN ('sexual_harassment','harassment','spam','other') OR char_length(body)>2000
   OR jsonb_typeof(p_payload->'messageIds') IS DISTINCT FROM 'array'
   OR (rid IS NULL AND cid IS NULL) THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  IF jsonb_array_length(p_payload->'messageIds')>10 THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  IF (SELECT count(*) FROM cafe_private.community_reports WHERE reporter_id=p_actor_id AND created_at>n-interval '1 day')>=10 THEN RETURN jsonb_build_object('ok',false,'code','rate_limited'); END IF;
  IF cid IS NOT NULL THEN
   SELECT * INTO c FROM cafe_private.community_calls WHERE id=cid;
   IF NOT FOUND OR NOT ((c.from_id=p_actor_id AND c.to_id=target) OR (c.to_id=p_actor_id AND c.from_id=target)) OR (rid IS NOT NULL AND rid<>c.room_id) THEN RETURN jsonb_build_object('ok',false,'code','report_access_denied'); END IF;
   rid:=c.room_id;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM cafe_private.community_memberships mine JOIN cafe_private.community_memberships theirs ON theirs.room_id=mine.room_id
    WHERE mine.room_id=rid AND mine.profile_id=p_actor_id AND theirs.profile_id=target
      AND mine.joined_at<=coalesce(theirs.left_at,n) AND theirs.joined_at<=coalesce(mine.left_at,n)) THEN RETURN jsonb_build_object('ok',false,'code','report_access_denied'); END IF;
  SELECT coalesce(array_agg(DISTINCT v::uuid),'{}'::uuid[]) INTO selected_ids FROM jsonb_array_elements_text(p_payload->'messageIds') v;
  SELECT count(*) INTO count_value FROM cafe_private.community_messages m WHERE m.id=ANY(selected_ids) AND m.room_id=rid
    AND EXISTS(SELECT 1 FROM cafe_private.community_memberships own WHERE own.profile_id=p_actor_id AND own.room_id=rid AND own.joined_at<=m.created_at AND coalesce(own.left_at,n)>=m.created_at);
  IF count_value<>cardinality(selected_ids) THEN RETURN jsonb_build_object('ok',false,'code','report_access_denied'); END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'body',m.body,'createdAt',m.created_at) ORDER BY m.created_at,m.id),'[]'::jsonb) INTO evidence FROM cafe_private.community_messages m WHERE m.id=ANY(selected_ids);
  INSERT INTO cafe_private.community_reports(reporter_id,target_id,room_id,call_id,reason,details,evidence) VALUES(p_actor_id,target,rid,cid,title,body,evidence) RETURNING id INTO new_id;
  result:=result||jsonb_build_object('reportId',new_id);
 ELSE RETURN jsonb_build_object('ok',false,'code','invalid_action');
 END IF;
 -- Membership changes and personal blocks invalidate calls before commit.
 PERFORM cafe_private.community_expire(n);
 SELECT array_agg(o.call_id ORDER BY o.queued_at) INTO ids FROM cafe_private.community_call_cleanup o
 WHERE o.completed_at IS NULL AND p_actor_id IN (o.from_id,o.to_id,o.creator_id)
 AND NOT EXISTS(SELECT 1 FROM cafe_private.community_calls active_call WHERE active_call.id=o.call_id AND active_call.status IN ('pending','accepted'));
 RETURN result||jsonb_build_object('cleanupCallIds',coalesce(to_jsonb(ids),'[]'::jsonb));
EXCEPTION
 WHEN insufficient_privilege THEN RETURN jsonb_build_object('ok',false,'code','access_denied');
 WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow OR invalid_datetime_format OR check_violation OR not_null_violation THEN
  RETURN jsonb_build_object('ok',false,'code','invalid_request');
END $$;

CREATE FUNCTION public.cafe_community_authorize_call_server(p_actor_id uuid,p_call_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE c cafe_private.community_calls%ROWTYPE; n timestamptz;
BEGIN
 PERFORM cafe_private.community_lock(); PERFORM cafe_private.require_active_profile(p_actor_id); n:=clock_timestamp();
 SELECT * INTO c FROM cafe_private.community_calls WHERE id=p_call_id;
 IF NOT FOUND OR p_actor_id NOT IN (c.from_id,c.to_id) OR cafe_private.community_call_status(c.id,n)<>'accepted' THEN RETURN jsonb_build_object('ok',false,'code','call_access_denied'); END IF;
 RETURN jsonb_build_object('ok',true,'callId',c.id,'roomId',c.room_id,'fromId',c.from_id,'toId',c.to_id,
  'displayName',(SELECT display_name FROM cafe_private.community_members WHERE profile_id=p_actor_id),'acceptedAt',c.accepted_at,'endsAt',c.ends_at);
EXCEPTION WHEN insufficient_privilege THEN RETURN jsonb_build_object('ok',false,'code','access_denied');
END $$;

CREATE FUNCTION public.cafe_community_cleanup_pending_server(p_actor_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE n timestamptz;
BEGIN
 PERFORM cafe_private.community_lock();
 IF p_actor_id IS NOT NULL THEN PERFORM cafe_private.require_active_profile(p_actor_id); END IF;
 n:=clock_timestamp(); PERFORM cafe_private.community_expire(n);
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('callId',x.call_id,'fromId',x.from_id,'toId',x.to_id,'generation',x.generation)) FROM (
  SELECT o.call_id,o.from_id,o.to_id,o.generation FROM cafe_private.community_call_cleanup o
  WHERE o.completed_at IS NULL AND (p_actor_id IS NULL OR p_actor_id IN (o.from_id,o.to_id,o.creator_id))
   AND NOT EXISTS(SELECT 1 FROM cafe_private.community_calls active_call WHERE active_call.id=o.call_id AND active_call.status IN ('pending','accepted'))
  ORDER BY o.queued_at LIMIT 50) x),'[]'::jsonb);
END $$;
CREATE FUNCTION public.cafe_community_cleanup_done_server(p_call_id uuid,p_generation integer) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM cafe_private.community_lock();
 UPDATE cafe_private.community_call_cleanup o SET completed_at=clock_timestamp() WHERE o.call_id=p_call_id
  AND o.generation=p_generation AND o.completed_at IS NULL
  AND NOT EXISTS(SELECT 1 FROM cafe_private.community_calls c WHERE c.id=o.call_id AND c.status IN ('pending','accepted'));
 RETURN jsonb_build_object('ok',true,'completed',EXISTS(SELECT 1 FROM cafe_private.community_call_cleanup o
  WHERE o.call_id=p_call_id AND o.generation=p_generation AND o.completed_at IS NOT NULL));
END $$;
CREATE FUNCTION public.cafe_community_cleanup_requeue_server(p_call_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE queued boolean;
BEGIN
 -- Trusted provider compensation only. Identities come from a retained outbox
 -- row, including after account/call deletion; the server supplies no new IDs.
 PERFORM cafe_private.community_lock();
 UPDATE cafe_private.community_call_cleanup o SET completed_at=NULL,queued_at=clock_timestamp(),generation=o.generation+1
 WHERE o.call_id=p_call_id
  AND NOT EXISTS(SELECT 1 FROM cafe_private.community_calls c WHERE c.id=o.call_id AND c.status IN ('pending','accepted'));
 queued:=FOUND;
 RETURN jsonb_build_object('ok',true,'queued',queued);
END $$;
CREATE FUNCTION public.cafe_community_reports_server(p_actor_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE reports jsonb;
BEGIN
 PERFORM cafe_private.community_lock(); PERFORM cafe_private.require_admin(p_actor_id);
 -- An unresolved report must never age out behind newer or reviewed reports.
 -- Keep the selection and aggregation priorities identical and deterministic.
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'reporter',cafe_private.community_member_json(r.reporter_id),'target',cafe_private.community_member_json(r.target_id),
  'reason',r.reason,'details',r.details,'createdAt',r.created_at,'status',r.status,'messages',r.evidence)
   ORDER BY (r.status='open') DESC,r.created_at,r.id),'[]'::jsonb) INTO reports
 FROM (SELECT * FROM cafe_private.community_reports ORDER BY (status='open') DESC,created_at,id LIMIT 100) r;
 RETURN jsonb_build_object('ok',true,'reports',reports);
EXCEPTION WHEN insufficient_privilege THEN RETURN jsonb_build_object('ok',false,'code','access_denied');
END $$;
CREATE FUNCTION public.cafe_community_review_report_server(p_actor_id uuid,p_report_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM cafe_private.community_lock(); PERFORM cafe_private.require_admin(p_actor_id);
 UPDATE cafe_private.community_reports SET status='reviewed',reviewed_at=clock_timestamp(),reviewed_by=p_actor_id WHERE id=p_report_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','report_not_found'); END IF;
 RETURN jsonb_build_object('ok',true);
EXCEPTION WHEN insufficient_privilege THEN RETURN jsonb_build_object('ok',false,'code','access_denied');
END $$;

DO $functions_acl$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE (n.nspname='cafe_private' AND p.proname LIKE 'community_%') OR (n.nspname='public' AND p.proname LIKE 'cafe_community_%') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',f.signature);
  IF f.nspname='public' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature); END IF;
 END LOOP;
END $functions_acl$;
