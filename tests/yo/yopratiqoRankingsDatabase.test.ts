import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { RankingAward, RankingSnapshot } from "../../lib/yo/rankings/contract";

const migration = "supabase/migrations/20261127002505_yo_real_xp_rankings.sql";
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA auth; CREATE SCHEMA cafe_private;
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, is_anonymous boolean DEFAULT false, banned_until timestamptz, deleted_at timestamptz);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, is_active boolean DEFAULT true,
        deactivated_at timestamptz, deleted_at timestamptz, anonymized_at timestamptz, deletion_requested_at timestamptz);
      CREATE TABLE cafe_private.community_blocks(blocker_id uuid,blocked_id uuid);
      CREATE FUNCTION cafe_private.community_blocked(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
       SELECT EXISTS(SELECT 1 FROM cafe_private.community_blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)) $$;
      REVOKE ALL ON FUNCTION cafe_private.community_blocked(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
    `);
    const sql = await readFile(migration, "utf8");
    await db.exec(sql); await db.exec(sql);
    for (let n = 1; n <= 35; n++) {
      await db.query("INSERT INTO auth.users(id) VALUES($1)", [uid(n)]);
      await db.query("INSERT INTO public.profiles(id) VALUES($1)", [uid(n)]);
    }
    const privilegeRows = await db.query<{ allowed: boolean }>(`SELECT has_table_privilege('anon','public.yo_ranked_events','SELECT')
      OR has_table_privilege('authenticated','public.yo_ranked_events','INSERT')
      OR has_table_privilege('authenticated','public.yo_rank_friendships','SELECT')
      OR has_function_privilege('anon','public.yo_rankings_read(uuid,text,text,text)','EXECUTE')
      OR has_function_privilege('authenticated','public.yo_rankings_award(uuid,text,text)','EXECUTE')
      OR has_function_privilege('authenticated','yo_rankings_private.active(uuid)','EXECUTE')
      OR has_column_privilege('service_role','auth.users','banned_until','SELECT') AS allowed`);
    assert.equal(privilegeRows.rows[0].allowed, false);
    assert.equal((await db.query<{ok:boolean}>(`SELECT bool_and(relrowsecurity) AS ok FROM pg_class WHERE relname IN('yo_ranking_profiles','yo_ranked_events','yo_rank_friendships','yo_rank_blocks','yo_rank_limits')`)).rows[0].ok,true);
    assert.equal((await db.query<{n:number}>(`SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'yo_rankings_%' AND p.prosecdef`)).rows[0].n,0);
    await db.exec("SET ROLE authenticated");
    await assert.rejects(db.query("SELECT public.yo_rankings_read($1)",[uid(1)]),/permission denied/);
    await assert.rejects(db.query("INSERT INTO public.yo_ranked_events(user_id,language,item_id) VALUES($1,'it','course:fake')",[uid(1)]),/permission denied/);
    await db.exec("RESET ROLE; SET ROLE service_role");
    const read = async (n:number,scope="everyone",period="week",language="all") => (await db.query<{data:RankingSnapshot}>(
      "SELECT public.yo_rankings_read($1,$2,$3,$4) AS data",[uid(n),scope,period,language])).rows[0].data;
    const award = async (n:number,item:string,language="it") => (await db.query<{data:RankingAward}>(
      "SELECT public.yo_rankings_award($1,$2,$3) AS data",[uid(n),language,`course:${item}`])).rows[0].data;
    const profile = (n:number,name:string|null,on=true) => db.query("SELECT public.yo_rankings_set_profile($1,$2,$3)",[uid(n),name,on]);
    const act = (n:number,action:string,code:string|null=null,id:string|null=null) => db.query("SELECT public.yo_rankings_friend_action($1,$2,$3,$4)",[uid(n),action,code,id]);
    for (const query of [
      "SELECT public.yo_rankings_throttle($1,NULL)",
      "SELECT public.yo_rankings_read($1,NULL,'week','all')",
      "SELECT public.yo_rankings_read($1,'everyone',NULL,'all')",
      "SELECT public.yo_rankings_read($1,'everyone','week',NULL)",
      "SELECT public.yo_rankings_set_profile($1,'Lea',NULL)",
      "SELECT public.yo_rankings_award($1,NULL,'course:invalid')",
      "SELECT public.yo_rankings_award($1,'it',NULL)",
      "SELECT public.yo_rankings_friend_action($1,NULL)",
    ]) await assert.rejects(db.query(query,[uid(1)]),/invalid_request/,"explicit null arguments fail closed");
    await assert.rejects(db.query("SELECT public.yo_rankings_read(NULL)"),/account_unavailable/);
    const empty = await read(1);
    assert.deepEqual(empty.profile,{id:"",displayName:"",participating:false,friendCode:"",totalXp:0,weekXp:0});
    assert.deepEqual(empty.rows,[]); assert.equal(empty.me,null);
    assert.equal((await db.query("SELECT * FROM public.yo_ranking_profiles")).rows.length,0,"GET does not join/create a profile");
    assert.deepEqual(await award(1,"u1:l1:a1"),{awarded:10,totalXp:10,weekXp:10});
    assert.equal((await read(1)).profile.participating,false,"earning XP never opts into public comparison");
    const duplicate = await Promise.all([award(1,"u1:l1:a1"),award(1,"u1:l1:a1")]);
    assert.deepEqual(duplicate.map(a=>a.awarded),[0,0]);
    const concurrent = await Promise.all([award(1,"u1:l1:a2"),award(1,"u1:l1:a2")]);
    assert.deepEqual(concurrent.map(a=>a.awarded).sort(),[0,10]);
    assert.equal((await read(2)).profile.totalXp,0,"another account does not inherit XP");
    await profile(1,"Marc"); await profile(2,"Lucía"); await profile(3,"Kaori");
    await award(2,"u1:l1:a1"); await award(2,"u1:l1:a2"); await award(3,"u1:l1:a1","ja");
    let data=await read(1);
    assert.equal(data.rows[0].rank,1); assert.equal(data.rows[1].rank,1); assert.equal(data.rows[2].rank,3,"ties share rank");
    assert.equal(data.me?.xp,20);
    assert.equal((await read(1,"everyone","all","ja")).rows[0].name,"Kaori");
    assert.equal((await read(1,"everyone","all","ja")).me?.xp,0);
    const serialized=JSON.stringify(data);
    assert.ok(!serialized.includes(uid(1))&&!serialized.includes(uid(2)),"auth UUIDs never leave the projection");
    assert.ok(!serialized.includes((await read(2)).profile.friendCode),"other users' friend codes are not enumerated");
    await db.query("UPDATE public.yo_ranked_events SET awarded_at=public.yo_rankings_week_start()-interval '1 second' WHERE user_id=$1 AND item_id='course:u1:l1:a1'",[uid(1)]);
    data=await read(1); assert.equal(data.profile.totalXp,20); assert.equal(data.profile.weekXp,10);
    assert.equal((await read(1,"everyone","all")).me?.xp,20);
    const week=await db.query<{week:string}>("SELECT to_char(public.yo_rankings_week_start() AT TIME ZONE 'America/Toronto','ID HH24:MI:SS') AS week");
    assert.equal(week.rows[0].week,"1 00:00:00","Monday midnight uses Toronto, not browser/process zone");
    await profile(2,null,false); assert.equal((await read(1)).rows.some(r=>r.name==="Lucía"),false,"optout disappears immediately");
    assert.equal((await read(2)).profile.totalXp,20,"optout never destroys achievements");
    await profile(2,"Lucía");
    const a=(await read(1)).profile,b=(await read(2)).profile,c=(await read(3)).profile;
    await act(1,"request",b.friendCode);
    assert.deepEqual((await read(2)).friends.incoming,[{id:a.id,name:a.displayName}]);
    assert.deepEqual((await read(1)).friends.outgoing,[{id:b.id,name:b.displayName}]);
    await act(1,"request",b.friendCode); assert.equal((await read(2)).friends.incoming.length,1,"retry does not duplicate a request");
    await assert.rejects(act(1,"accept",null,b.id),/invalid_friend/,"requester cannot accept own request");
    await assert.rejects(act(3,"accept",null,a.id),/invalid_friend/,"unrelated account cannot accept");
    await act(2,"accept",null,a.id);
    assert.equal((await read(1,"friends")).rows.length,2); assert.equal((await read(1)).friends.accepted[0].id,b.id);
    await act(2,"block",null,a.id);
    assert.equal((await read(1)).rows.some(r=>r.id===b.id),false); assert.equal((await read(2)).rows.some(r=>r.id===a.id),false);
    assert.equal((await read(1)).friends.accepted.length,0);
    await assert.rejects(act(1,"request",b.friendCode),/invalid_friend/);
    await act(2,"unblock",null,a.id); assert.equal((await read(1)).friends.accepted.length,0,"unblock does not silently restore a friendship");
    await assert.rejects(act(1,"request",b.friendCode),/invalid_friend/,"closed requests have a cooldown");
    await db.query("UPDATE public.yo_rank_friendships SET updated_at=now()-interval '2 days'");
    await act(1,"request",b.friendCode); await act(2,"decline",null,a.id);
    assert.equal((await read(1)).friends.outgoing.length,0);
    await act(1,"request",c.friendCode);
    await db.query("UPDATE public.yo_rank_friendships SET created_at=now()-interval '15 days' WHERE recipient_id=$1",[uid(3)]);
    assert.equal((await read(3)).friends.incoming.length,0); await assert.rejects(act(3,"accept",null,a.id),/invalid_friend/);
    await act(1,"request",c.friendCode); await act(3,"accept",null,a.id); await act(1,"remove",null,c.id);
    assert.equal((await read(1)).friends.accepted.length,0);
    await db.exec("RESET ROLE");
    await db.query("INSERT INTO cafe_private.community_blocks VALUES($1,$2)",[uid(3),uid(1)]);
    await db.exec("SET ROLE service_role");
    assert.equal((await read(1)).rows.some(r=>r.id===c.id),false,"existing Café blocks also hide rankings in either direction");
    await assert.rejects(db.query("SELECT * FROM cafe_private.community_blocks"),/permission denied/,"narrow helper grants no private table access");
    await db.exec("RESET ROLE");
    for (const [table,col,value] of [["profiles","is_active","false"],["profiles","deletion_requested_at","now()"],["profiles","deleted_at","now()"],["profiles","anonymized_at","now()"],["profiles","deactivated_at","now()"],["auth.users","is_anonymous","true"],["auth.users","banned_until","now()+interval '1 day'"],["auth.users","deleted_at","now()"]]) {
      await db.query(`UPDATE ${table} SET ${col}=${value} WHERE id=$1`,[uid(2)]);
      await db.exec("SET ROLE service_role");
      await assert.rejects(read(2),/account_unavailable/); await assert.rejects(award(2,"bad"),/account_unavailable/);
      assert.equal((await read(1)).rows.some(r=>r.id===b.id),false);
      await db.exec("RESET ROLE");
      await db.query(`UPDATE ${table} SET ${col}=${col==="is_active"?"true":col==="is_anonymous"?"false":"NULL"} WHERE id=$1`,[uid(2)]);
    }
    await db.exec("SET ROLE service_role");
    // A large real cohort still shows the caller's immediate neighborhood.
    for(let n=4;n<=30;n++) { await profile(n,`Learner ${n}`); for(let i=0;i<3;i++) await award(n,`unit:lesson:activity${i}`); }
    data=await read(1); assert.equal(data.rows.length,20); assert.ok(data.me); assert.ok(data.nearby.some(r=>r.isYou));
    assert.ok(data.nearby.length<=5);
    // At the top-list boundary, keep the full immediate neighborhood. Rank 20
    // may intentionally appear in both sections instead of losing context.
    await db.exec("RESET ROLE; DELETE FROM cafe_private.community_blocks; SET ROLE service_role");
    await db.query("DELETE FROM public.yo_ranked_events");
    for(let n=2;n<=30;n++) await db.query(`INSERT INTO public.yo_ranked_events(user_id,language,item_id)
      SELECT $1,'it','course:edge:'||i::text FROM generate_series(1,$2::integer) i`,[uid(n),2*(31-n)]);
    for(const position of [19,20,21,22]) {
      await db.query("DELETE FROM public.yo_ranked_events WHERE user_id=$1",[uid(1)]);
      await db.query(`INSERT INTO public.yo_ranked_events(user_id,language,item_id)
        SELECT $1,'it','course:edge:'||i::text FROM generate_series(1,$2::integer) i`,[uid(1),61-2*position]);
      const edge=await read(1);
      assert.equal(edge.me?.rank,position);
      assert.deepEqual(edge.nearby.map(row=>row.rank),[position-2,position-1,position,position+1,position+2]);
    }
    // The actual database transaction caps awards regardless of callers racing.
    for(let i=0;i<100;i++) await award(31,`cap:lesson:a${i}`);
    assert.equal((await award(31,"cap:lesson:over")).awarded,0); assert.equal((await read(31)).profile.totalXp,1000);
    const rate=async()=> (await db.query<{allowed:boolean}>("SELECT public.yo_rankings_throttle($1,'profile') AS allowed",[uid(32)])).rows[0].allowed;
    for(let i=0;i<10;i++) assert.equal(await rate(),true);
    assert.equal(await rate(),false);
    // Failed award rolls back profile initialization and receipt together.
    await db.exec("RESET ROLE; ALTER TABLE public.yo_ranked_events ADD CONSTRAINT test_fault CHECK(item_id<>'course:rollback:item'); SET ROLE service_role");
    await assert.rejects(award(33,"rollback:item")); assert.equal((await read(33)).profile.id,"");
    await db.exec("RESET ROLE; ALTER TABLE public.yo_ranked_events DROP CONSTRAINT test_fault; SET ROLE service_role");
    assert.equal((await award(33,"rollback:item")).awarded,10);
    await db.exec("RESET ROLE"); await db.query("DELETE FROM auth.users WHERE id=$1",[uid(33)]);
    assert.equal((await db.query("SELECT * FROM public.yo_ranked_events WHERE user_id=$1",[uid(33)])).rows.length,0);
    console.log("Rankings database passed: service-only privileges, eligibility, verified ledger, replay, weekly/total/language/ties, privacy, reciprocal friends, expiry, blocks, neighborhood, caps and rollback.");
  } finally { await db.close(); }
}
void main();
