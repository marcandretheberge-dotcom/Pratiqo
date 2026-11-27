import assert from "node:assert/strict";
import { GET } from "../../app/api/yo/rankings/route";
import { POST as setProfile } from "../../app/api/yo/rankings/profile/route";
import { POST as friends } from "../../app/api/yo/rankings/friends/route";
import { POST as attempt } from "../../app/api/yo/rankings/attempt/route";
import { parseRankingAttempt, parseRankingFriend, parseRankingProfile, projectRankingAward, projectRankingSnapshot, readRankingBody } from "../../lib/yo/rankings/validation";
import { personalizedItalianUnits } from "../../lib/yo/personalized/courseData";
import { courseReviewId } from "../../lib/yo/review/courseRegistry";

const owner="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002";
const publicId="10000000-0000-4000-8000-000000000001";
const origin="https://rankings.example.test";
async function main() {
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:origin,NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon-test",SUPABASE_SERVICE_ROLE_KEY:"service-test"});
  delete process.env.YO_SRS_SERVER_ENABLED; delete process.env.YO_DAILY_SERVER_ENABLED;
  const originalFetch=globalThis.fetch;
  let authId=owner,anonymous=false,banned=false,authError=false,dbError="",throttled=false,awardCalls=0,profileCalls=0;
  const calls:Array<{rpc:string;payload:Record<string,unknown>}>=[];
  const snapshot={
    profile:{id:publicId,displayName:"Marco",participating:true,friendCode:"1234567890ABCDEF",totalXp:20,weekXp:10,privateEmail:"secret"},
    scope:"everyone",period:"week",language:"all",weekStartsAt:"2026-11-23T05:00:00Z",rows:[],nearby:[],me:null,totalParticipants:0,
    friends:{incoming:[],outgoing:[],accepted:[],blocked:[]},user_id:owner,rawAnswers:["never expose"],
  };
  globalThis.fetch=async(input,init)=>{
    const request=new Request(input,init),url=new URL(request.url);
    assert.equal(url.origin,origin);
    if(url.pathname==="/auth/v1/user"){
      assert.equal(request.headers.get("authorization"),"Bearer learner-test");
      return authError?Response.json({message:"invalid"},{status:401}):Response.json({id:authId,aud:"authenticated",is_anonymous:anonymous,
        ...(banned?{banned_until:"2099-01-01T00:00:00Z"}:{})});
    }
    assert.equal(request.headers.get("authorization"),"Bearer service-test");
    const payload=await request.json();
    assert.equal(payload.p_user_id,authId,"every actor comes from verified auth, never body");
    const rpc=url.pathname.split("/").at(-1)!; calls.push({rpc,payload});
    if(dbError) return Response.json({code:"P0001",message:dbError},{status:400});
    if(rpc==="yo_rankings_throttle") return Response.json(!throttled);
    if(rpc==="yo_rankings_read") return Response.json(snapshot);
    if(rpc==="yo_rankings_xp") return Response.json({totalXp:20,weekXp:10,user_id:owner});
    if(rpc==="yo_rankings_award"){
      assert.deepEqual(Object.keys(payload).sort(),["p_item_id","p_language","p_user_id"]);
      awardCalls++; return Response.json({awarded:10,totalXp:30,weekXp:20,user_id:owner,answer:"do not expose"});
    }
    if(rpc==="yo_rankings_set_profile"){profileCalls++;return Response.json(null);}
    if(rpc==="yo_rankings_friend_action")return Response.json(null);
    throw new Error(`Unexpected RPC ${rpc}`);
  };
  const request=(path:string,method="GET",body?:unknown,token=true)=>new Request(`http://localhost/api/yo/rankings${path}`,{
    method,headers:{...(token?{Authorization:"Bearer learner-test"}:{}),"Content-Type":"application/json"},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  try {
    assert.equal((await GET(request("", "GET",undefined,false))).status,401);
    const result=await GET(request("")); assert.equal(result.status,200);
    assert.equal(result.headers.get("Cache-Control"),"private, no-store");
    const resultBody=await result.json(); assert.ok(!("user_id" in resultBody));assert.ok(!("rawAnswers" in resultBody));assert.ok(!("privateEmail" in resultBody.profile));
    assert.equal((await GET(request("?scope=private"))).status,400); assert.equal((await GET(request("?period=week&period=all"))).status,400);
    anonymous=true;assert.equal((await GET(request(""))).status,403);anonymous=false;
    banned=true;assert.equal((await GET(request(""))).status,403);banned=false;
    authError=true;assert.equal((await GET(request(""))).status,401);authError=false;
    dbError="account_unavailable";assert.equal((await GET(request(""))).status,403);
    dbError="missing relation with secret diagnostic";const unavailable=await GET(request(""));assert.equal(unavailable.status,503);assert.deepEqual(await unavailable.json(),{error:"unavailable"});dbError="";
    throttled=true;const limited=await GET(request(""));assert.equal(limited.status,429);assert.equal(limited.headers.get("Retry-After"),"60");throttled=false;
    assert.equal((await setProfile(request("/profile","POST",{displayName:"Lucía",participating:true}))).status,200);
    assert.equal(profileCalls,1);
    assert.equal((await setProfile(request("/profile","POST",{displayName:"my@email.test",participating:true}))).status,400);
    assert.equal((await setProfile(request("/profile","POST",{displayName:"<bad draft>",participating:false}))).status,200,"exit always available");
    assert.deepEqual(calls.filter(c=>c.rpc==="yo_rankings_set_profile").at(-1)!.payload,{p_user_id:owner,p_name:null,p_participating:false});
    assert.equal((await setProfile(request("/profile","POST",{displayName:"Lucía",participating:true,userId:other}))).status,400);
    assert.equal((await friends(request("/friends","POST",{action:"request",code:"1234567890abcdef"}))).status,200);
    assert.equal((await friends(request("/friends","POST",{action:"accept",id:other}))).status,200);
    assert.equal((await friends(request("/friends","POST",{action:"accept",id:other,user_id:other}))).status,400);
    dbError="invalid_friend";assert.equal((await friends(request("/friends","POST",{action:"request",code:"1234567890ABCDEF"}))).status,409);dbError="";
    const unit=personalizedItalianUnits[0],lesson=unit.lessons[0];
    const activity=lesson.activities.find(a=>a.kind==="choice"||a.kind==="listen"||a.kind==="culture");
    assert.ok(activity&&(activity.kind==="choice"||activity.kind==="listen"||activity.kind==="culture"));
    const itemId=courseReviewId(unit.id,lesson.id,activity.id),valid={language:"it",itemId,answer:activity.correctId};
    assert.equal((await attempt(request("/attempt","POST",{...valid,answer:"wrong"}))).status,200);assert.equal(awardCalls,0,"wrong answers cannot reach award RPC");
    assert.equal((await attempt(request("/attempt","POST",{...valid,correct:true}))).status,400);
    assert.equal((await attempt(request("/attempt","POST",{...valid,xp:999999}))).status,400);
    assert.equal((await attempt(request("/attempt","POST",{...valid,userId:other}))).status,400);
    assert.equal((await attempt(request("/attempt","POST",{...valid,at:"2026-01-01"}))).status,400);
    assert.deepEqual(await (await attempt(request("/attempt","POST",valid))).json(),{awarded:10,totalXp:30,weekXp:20});assert.equal(awardCalls,1);
    assert.deepEqual(await (await attempt(request("/attempt","POST",{...valid,itemId:"course:final:assessment"}))).json(),{awarded:0,totalXp:20,weekXp:10});assert.equal(awardCalls,1);
    authId=other;assert.equal((await attempt(request("/attempt","POST",valid))).status,200);
    assert.equal(calls.at(-1)?.payload.p_user_id,other,"switching accounts never writes previous identity");authId=owner;
    assert.equal(parseRankingAttempt({...valid,answer:"x".repeat(1025)}),null);
    assert.equal(parseRankingAttempt({...valid,answer:JSON.parse('{"__proto__":"yes"}')}),null);
    assert.equal(parseRankingFriend({action:"request",code:"1"}),null);
    assert.equal(parseRankingProfile({displayName:"A\u202eB",participating:true}),null);
    assert.equal(parseRankingProfile({displayName:"😀😀",participating:true}),null);
    assert.ok(parseRankingProfile({displayName:"かおり",participating:true}));
    assert.equal(projectRankingAward({awarded:10,totalXp:0,weekXp:0}),null);
    assert.equal(projectRankingSnapshot({...snapshot,rows:[{id:publicId,name:"Lea",xp:-1,rank:1,isYou:false,friend:false}]}),null);
    const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode(' '.repeat(17000)));controller.close();}});
    const oversized=new Request("http://localhost",{method:"POST",headers:{"Content-Type":"application/json","Content-Length":"1"},body:stream,duplex:"half"} as RequestInit);
    assert.equal(await readRankingBody(oversized),null,"stream bytes enforced regardless of forged size header");
    console.log("Rankings API passed: bearer identity, account eligibility, bounds, answer grading, unknown-field rejection, private projections, optout, friendship scope, outages and durable throttle.");
  } finally {globalThis.fetch=originalFetch;}
}
void main();
