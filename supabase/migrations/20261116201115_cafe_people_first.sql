-- People-first is a separate release gate. Public rooms and their RPCs keep their
-- existing lifecycle. Accepted connections reuse the existing message ledger,
-- with a distinct recipient authorization boundary (not a public two-seat room).
ALTER TABLE cafe_private.community_members
 ADD COLUMN discoverable boolean NOT NULL DEFAULT false,
 ADD COLUMN avatar_version uuid;
CREATE TABLE cafe_private.community_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 requester_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES cafe_private.community_members(profile_id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 introduction text NOT NULL CHECK (char_length(introduction) BETWEEN 1 AND 300),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 accepted_at timestamptz,
 CHECK (requester_id <> recipient_id),
 CHECK (status <> 'accepted' OR accepted_at IS NOT NULL),
 UNIQUE(requester_id,request_id)
);
CREATE UNIQUE INDEX cafe_connection_active_pair ON cafe_private.community_connections
 (least(requester_id,recipient_id),greatest(requester_id,recipient_id)) WHERE status IN ('pending','accepted');
CREATE INDEX cafe_connection_recipient ON cafe_private.community_connections(recipient_id,status,updated_at DESC);
CREATE INDEX cafe_connection_requester ON cafe_private.community_connections(requester_id,status,created_at DESC);
ALTER TABLE cafe_private.community_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cafe_private.community_connections FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE cafe_private.community_messages ALTER COLUMN room_id DROP NOT NULL,
 ADD COLUMN connection_id uuid REFERENCES cafe_private.community_connections(id) ON DELETE CASCADE,
 ADD CONSTRAINT cafe_message_one_destination CHECK ((room_id IS NULL) <> (connection_id IS NULL));
CREATE INDEX cafe_messages_connection ON cafe_private.community_messages(connection_id,created_at DESC,id) WHERE connection_id IS NOT NULL;
ALTER TABLE cafe_private.community_reports ADD COLUMN connection_id uuid REFERENCES cafe_private.community_connections(id) ON DELETE SET NULL;

-- Only processed WebP images, fetched through the authenticated application.
-- No Storage policy grants direct client access to this bucket.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('cafe-avatars','cafe-avatars',false,262144,ARRAY['image/webp']);

CREATE OR REPLACE FUNCTION cafe_private.community_member_json(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',m.profile_id,'displayName',m.display_name,'nativeLanguages',m.native_languages,'learningLanguages',m.learning_languages)
 || CASE WHEN m.avatar_version IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('avatarVersion',m.avatar_version) END
 FROM cafe_private.community_members m WHERE m.profile_id=p_id;
$$;
CREATE FUNCTION cafe_private.community_person_json(p_id uuid,p_now timestamptz) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT cafe_private.community_member_json(p_id)||jsonb_build_object('online',cafe_private.community_online(p_id,p_now),'roomId',NULL);
$$;
CREATE FUNCTION cafe_private.community_can_connect(p_actor uuid,p_target uuid,p_now timestamptz) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT cafe_private.community_ready(p_actor) AND cafe_private.community_ready(p_target)
 AND NOT cafe_private.community_blocked(p_actor,p_target)
 AND (p_actor=p_target OR cafe_private.community_online(p_target,p_now)
   OR EXISTS(SELECT 1 FROM cafe_private.community_members WHERE profile_id=p_target AND discoverable)
   OR EXISTS(SELECT 1 FROM cafe_private.community_connections WHERE status IN ('pending','accepted')
     AND ((requester_id=p_actor AND recipient_id=p_target) OR (requester_id=p_target AND recipient_id=p_actor))));
$$;
CREATE FUNCTION cafe_private.community_direct_allowed(p_actor uuid,p_connection uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM cafe_private.community_connections c WHERE c.id=p_connection
 AND p_actor IN(c.requester_id,c.recipient_id) AND c.status='accepted'
 AND cafe_private.community_ready(c.requester_id) AND cafe_private.community_ready(c.recipient_id)
 AND NOT cafe_private.community_blocked(c.requester_id,c.recipient_id));
$$;

CREATE FUNCTION public.cafe_community_people_snapshot_server(p_actor_id uuid,p_room_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; people jsonb; friends jsonb; selected jsonb; c cafe_private.community_connections%ROWTYPE; n timestamptz; target uuid;
BEGIN
 PERFORM cafe_private.community_lock(); n:=clock_timestamp();
 SELECT * INTO c FROM cafe_private.community_connections WHERE id=p_room_id;
 result:=public.cafe_community_snapshot_server(p_actor_id,CASE WHEN c.id IS NOT NULL THEN NULL ELSE p_room_id END);
 IF result->>'ok' IS DISTINCT FROM 'true' OR result->'me'='null'::jsonb THEN RETURN result; END IF;
 SELECT coalesce(jsonb_agg(cafe_private.community_person_json(m.profile_id,n) ORDER BY cafe_private.community_online(m.profile_id,n) DESC,m.display_name,m.profile_id),'[]'::jsonb)
 INTO people FROM (SELECT * FROM cafe_private.community_members m WHERE m.profile_id<>p_actor_id
  AND (m.discoverable OR cafe_private.community_online(m.profile_id,n)) AND cafe_private.community_can_connect(p_actor_id,m.profile_id,n)
  ORDER BY cafe_private.community_online(m.profile_id,n) DESC,m.display_name,m.profile_id LIMIT 500) m;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'member',cafe_private.community_person_json(
  CASE WHEN f.requester_id=p_actor_id THEN f.recipient_id ELSE f.requester_id END,n),
  'direction',CASE WHEN f.recipient_id=p_actor_id THEN 'incoming' ELSE 'outgoing' END,'status',f.status,
  'introduction',f.introduction,'updatedAt',f.updated_at) ORDER BY f.updated_at DESC,f.id),'[]'::jsonb)
 INTO friends FROM cafe_private.community_connections f WHERE p_actor_id IN(f.requester_id,f.recipient_id)
  AND f.status IN ('pending','accepted') AND cafe_private.community_ready(f.requester_id) AND cafe_private.community_ready(f.recipient_id)
  AND NOT cafe_private.community_blocked(f.requester_id,f.recipient_id);
 IF c.id IS NOT NULL THEN
  IF NOT cafe_private.community_direct_allowed(p_actor_id,c.id) THEN RETURN jsonb_build_object('ok',false,'code','room_access_denied'); END IF;
  target:=CASE WHEN c.requester_id=p_actor_id THEN c.recipient_id ELSE c.requester_id END;
  SELECT jsonb_build_object('kind','direct','id',c.id,'title',m.display_name,'languages',m.learning_languages,
   'creator',cafe_private.community_member_json(c.requester_id),'mode','now','state','live','startsAt',NULL,'capacity',2,
   'participants',jsonb_build_array(cafe_private.community_member_json(c.requester_id),cafe_private.community_member_json(c.recipient_id)),
   'rsvpCount',0,'myRsvp',false,'messages',coalesce((SELECT jsonb_agg(jsonb_build_object('id',msg.id,'roomId',c.id,
    'sender',cafe_private.community_member_json(msg.sender_id),'body',msg.body,'createdAt',msg.created_at) ORDER BY msg.created_at,msg.id)
    FROM (SELECT * FROM cafe_private.community_messages WHERE connection_id=c.id ORDER BY created_at DESC,id DESC LIMIT 100) msg),'[]'::jsonb))
  INTO selected FROM cafe_private.community_members m WHERE m.profile_id=target;
  result:=result||jsonb_build_object('room',selected);
 END IF;
 RETURN result||jsonb_build_object('people',people,'friends',friends,'me',result->'me'||jsonb_build_object('discoverable',
  (SELECT discoverable FROM cafe_private.community_members WHERE profile_id=p_actor_id)));
END $$;

CREATE FUNCTION public.cafe_community_people_command_server(p_actor_id uuid,p_action text,p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE c cafe_private.community_connections%ROWTYPE; old_message cafe_private.community_messages%ROWTYPE;
 target uuid; rid uuid; req uuid; fid uuid; new_id uuid; n timestamptz; body text; result jsonb;
 ids uuid[]; evidence jsonb; reason text; details text;
BEGIN
 PERFORM cafe_private.community_lock(); n:=clock_timestamp();
 PERFORM cafe_private.require_active_profile(p_actor_id);
 IF p_action='profile.save' THEN
  IF p_payload ? 'discoverable' AND jsonb_typeof(p_payload->'discoverable')<>'boolean' THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  result:=public.cafe_community_command_server(p_actor_id,p_action,p_payload);
  IF result->>'ok'='true' AND p_payload ? 'discoverable' THEN
   UPDATE cafe_private.community_members SET discoverable=(p_payload->>'discoverable')::boolean WHERE profile_id=p_actor_id;
  END IF;
  RETURN result;
 END IF;
 IF NOT cafe_private.community_ready(p_actor_id) THEN RETURN jsonb_build_object('ok',false,'code','agreement_required'); END IF;
 target:=(p_payload->>'targetId')::uuid; rid:=(p_payload->>'roomId')::uuid;
 req:=(p_payload->>'requestId')::uuid; fid:=(p_payload->>'friendshipId')::uuid;
 IF p_action='friend.request' THEN
  body:=trim(p_payload->>'introduction');
  IF target IS NULL OR target=p_actor_id OR req IS NULL OR body IS NULL OR char_length(body) NOT BETWEEN 1 AND 300
   THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  IF NOT cafe_private.community_can_connect(p_actor_id,target,n) THEN RETURN jsonb_build_object('ok',false,'code','member_not_found'); END IF;
  SELECT * INTO c FROM cafe_private.community_connections WHERE requester_id=p_actor_id AND request_id=req;
  IF FOUND THEN
   IF c.recipient_id<>target OR c.introduction<>body THEN RETURN jsonb_build_object('ok',false,'code','operation_conflict'); END IF;
   RETURN jsonb_build_object('ok',true,'friendshipId',c.id);
  END IF;
  SELECT * INTO c FROM cafe_private.community_connections WHERE status IN ('pending','accepted')
   AND least(requester_id,recipient_id)=least(p_actor_id,target) AND greatest(requester_id,recipient_id)=greatest(p_actor_id,target);
  IF FOUND THEN RETURN jsonb_build_object('ok',true,'friendshipId',c.id); END IF;
  IF EXISTS(SELECT 1 FROM cafe_private.community_connections WHERE status='closed' AND updated_at>n-interval '7 days'
   AND least(requester_id,recipient_id)=least(p_actor_id,target) AND greatest(requester_id,recipient_id)=greatest(p_actor_id,target))
   THEN RETURN jsonb_build_object('ok',false,'code','friendship_cooldown'); END IF;
  IF (SELECT count(*) FROM cafe_private.community_connections WHERE requester_id=p_actor_id AND created_at>n-interval '1 day')>=10
   THEN RETURN jsonb_build_object('ok',false,'code','rate_limited'); END IF;
  IF (SELECT count(*) FROM cafe_private.community_connections WHERE p_actor_id IN(requester_id,recipient_id) AND status IN ('pending','accepted'))>=500
   OR (SELECT count(*) FROM cafe_private.community_connections WHERE target IN(requester_id,recipient_id) AND status IN ('pending','accepted'))>=500
   THEN RETURN jsonb_build_object('ok',false,'code','friendship_limit'); END IF;
  INSERT INTO cafe_private.community_connections(requester_id,recipient_id,request_id,introduction,created_at,updated_at)
   VALUES(p_actor_id,target,req,body,n,n) RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok',true,'friendshipId',new_id);
 ELSIF p_action IN ('friend.respond','friend.remove') THEN
  SELECT * INTO c FROM cafe_private.community_connections WHERE id=fid AND p_actor_id IN(requester_id,recipient_id);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','friendship_not_found'); END IF;
  IF p_action='friend.remove' THEN
   UPDATE cafe_private.community_connections SET status='closed',updated_at=n WHERE id=c.id AND status<>'closed';
  ELSE
   IF c.recipient_id<>p_actor_id THEN RETURN jsonb_build_object('ok',false,'code','not_friend_recipient'); END IF;
   IF jsonb_typeof(p_payload->'accept') IS DISTINCT FROM 'boolean' THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
   IF (p_payload->>'accept')::boolean THEN
    IF c.status='closed' OR NOT cafe_private.community_can_connect(p_actor_id,c.requester_id,n) THEN RETURN jsonb_build_object('ok',false,'code','friendship_not_found'); END IF;
    UPDATE cafe_private.community_connections SET status='accepted',accepted_at=coalesce(accepted_at,n),updated_at=n WHERE id=c.id AND status='pending';
   ELSE
    UPDATE cafe_private.community_connections SET status='closed',updated_at=n WHERE id=c.id AND status='pending';
   END IF;
  END IF;
  RETURN jsonb_build_object('ok',true,'friendshipId',c.id);
 END IF;
 SELECT * INTO c FROM cafe_private.community_connections WHERE id=rid;
 IF c.id IS NOT NULL AND p_action<>'report.submit' THEN
  IF NOT cafe_private.community_direct_allowed(p_actor_id,c.id) THEN RETURN jsonb_build_object('ok',false,'code','room_access_denied'); END IF;
  IF p_action='presence.heartbeat' THEN
   RETURN public.cafe_community_command_server(p_actor_id,p_action,p_payload||jsonb_build_object('roomId',NULL));
  ELSIF p_action IN ('room.join','room.leave') THEN RETURN jsonb_build_object('ok',true,'roomId',c.id);
  ELSIF p_action='message.send' THEN
   body:=trim(p_payload->>'body');
   IF req IS NULL OR body IS NULL OR char_length(body) NOT BETWEEN 1 AND 2000 THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
   SELECT * INTO old_message FROM cafe_private.community_messages WHERE sender_id=p_actor_id AND request_id=req;
   IF FOUND THEN
    IF old_message.connection_id IS DISTINCT FROM c.id OR old_message.body<>body THEN RETURN jsonb_build_object('ok',false,'code','operation_conflict'); END IF;
    RETURN jsonb_build_object('ok',true);
   END IF;
   IF (SELECT count(*) FROM cafe_private.community_messages WHERE sender_id=p_actor_id AND created_at>n-interval '1 minute')>=40
    THEN RETURN jsonb_build_object('ok',false,'code','rate_limited'); END IF;
   INSERT INTO cafe_private.community_messages(connection_id,sender_id,request_id,body,created_at) VALUES(c.id,p_actor_id,req,body,n);
   UPDATE cafe_private.community_connections SET updated_at=n WHERE id=c.id;
   RETURN jsonb_build_object('ok',true);
  ELSE RETURN jsonb_build_object('ok',false,'code','not_allowed'); END IF;
 END IF;
 IF p_action='report.submit' AND (c.id IS NOT NULL OR (rid IS NULL AND p_payload->>'callId' IS NULL)) THEN
  IF target IS NULL OR target=p_actor_id OR NOT EXISTS(SELECT 1 FROM cafe_private.community_members WHERE profile_id=target)
   THEN RETURN jsonb_build_object('ok',false,'code','report_access_denied'); END IF;
  IF c.id IS NOT NULL AND (p_actor_id NOT IN(c.requester_id,c.recipient_id) OR target NOT IN(c.requester_id,c.recipient_id))
   THEN RETURN jsonb_build_object('ok',false,'code','report_access_denied'); END IF;
  IF c.id IS NULL AND NOT (cafe_private.community_can_connect(p_actor_id,target,n) OR cafe_private.community_blocked(p_actor_id,target))
   THEN RETURN jsonb_build_object('ok',false,'code','report_access_denied'); END IF;
  reason:=p_payload->>'reason'; details:=coalesce(p_payload->>'details','');
  IF reason IS NULL OR reason NOT IN ('sexual_harassment','harassment','spam','other') OR char_length(details)>2000
   OR jsonb_typeof(p_payload->'messageIds') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'messageIds')>10
   THEN RETURN jsonb_build_object('ok',false,'code','invalid_request'); END IF;
  SELECT coalesce(array_agg(DISTINCT v::uuid),'{}'::uuid[]) INTO ids FROM jsonb_array_elements_text(p_payload->'messageIds') v;
  IF (SELECT count(*) FROM cafe_private.community_messages WHERE id=ANY(ids) AND connection_id=c.id AND sender_id=target)<>cardinality(ids)
   THEN RETURN jsonb_build_object('ok',false,'code','report_access_denied'); END IF;
  IF (SELECT count(*) FROM cafe_private.community_reports WHERE reporter_id=p_actor_id AND created_at>n-interval '1 day')>=10
   THEN RETURN jsonb_build_object('ok',false,'code','rate_limited'); END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'body',m.body,'createdAt',m.created_at) ORDER BY m.created_at,m.id),'[]'::jsonb)
   INTO evidence FROM cafe_private.community_messages m WHERE m.id=ANY(ids);
  INSERT INTO cafe_private.community_reports(reporter_id,target_id,connection_id,reason,details,evidence)
   VALUES(p_actor_id,target,c.id,reason,details,evidence) RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok',true,'reportId',new_id);
 END IF;
 result:=public.cafe_community_command_server(p_actor_id,p_action,p_payload);
 IF p_action='member.block' AND result->>'ok'='true' THEN
  UPDATE cafe_private.community_connections SET status='closed',updated_at=n WHERE status IN ('pending','accepted')
   AND least(requester_id,recipient_id)=least(p_actor_id,target) AND greatest(requester_id,recipient_id)=greatest(p_actor_id,target);
 END IF;
 RETURN result;
EXCEPTION WHEN invalid_text_representation OR check_violation OR not_null_violation THEN RETURN jsonb_build_object('ok',false,'code','invalid_request');
 WHEN insufficient_privilege THEN RETURN jsonb_build_object('ok',false,'code','access_denied');
END $$;

CREATE FUNCTION public.cafe_community_avatar_server(p_actor_id uuid,p_member_id uuid,p_write boolean DEFAULT false,p_version uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE old_version uuid;
BEGIN
 PERFORM cafe_private.community_lock();
 IF NOT cafe_private.community_can_connect(p_actor_id,p_member_id,clock_timestamp())
  THEN RETURN jsonb_build_object('ok',false,'code','not_found'); END IF;
 SELECT avatar_version INTO old_version FROM cafe_private.community_members WHERE profile_id=p_member_id;
 IF p_write THEN
  IF p_actor_id<>p_member_id THEN RETURN jsonb_build_object('ok',false,'code','not_allowed'); END IF;
  UPDATE cafe_private.community_members SET avatar_version=p_version,updated_at=clock_timestamp() WHERE profile_id=p_actor_id;
 END IF;
 RETURN jsonb_build_object('ok',true,'version',old_version);
END $$;

REVOKE ALL ON FUNCTION cafe_private.community_person_json(uuid,timestamptz),cafe_private.community_can_connect(uuid,uuid,timestamptz),cafe_private.community_direct_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.cafe_community_people_snapshot_server(uuid,uuid),public.cafe_community_people_command_server(uuid,text,jsonb),public.cafe_community_avatar_server(uuid,uuid,boolean,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.cafe_community_people_snapshot_server(uuid,uuid),public.cafe_community_people_command_server(uuid,text,jsonb),public.cafe_community_avatar_server(uuid,uuid,boolean,uuid) TO service_role;
