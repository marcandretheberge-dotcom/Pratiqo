import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {getSupabaseAdmin} from "@/lib/supabaseAdmin";
import {createClient} from "@supabase/supabase-js";
import {account,pilotEnabled} from "@/lib/yo/passPilot/account.server";
import {balance,cheapest,covered,owned,quote,redeem,stage,win} from "@/lib/yo/passPilot/wallet";
import {prepare,reconcile} from "@/lib/yo/passPilot/stripe.server";
import {passedRound} from "@/lib/yo/passPilot/assessment";
import {railBeat} from "@/lib/yo/passPilot/rail";

export const runtime="nodejs";
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
  if(!pilotEnabled())return reply({},404);
  // Reject cross-origin browser writes; Auth cookies cannot be presented by another site.
  const origin=req.headers.get("origin");if(origin&&origin!==process.env.YO_PASS_ORIGIN&&origin!==new URL(req.url).origin)return reply({},403);
  if(!req.headers.get("content-type")?.startsWith("application/json")||Number(req.headers.get("content-length"))>8192)return reply({},400);
  try{
    const raw=await req.text();if(raw.length>8192)return reply({},413);
    const b=JSON.parse(raw);const jar=await cookies();const authName="yo_pass_preview";
    if(b.action==="login"){
      if(typeof b.email!=="string"||!/^pass-[a-z0-9-]+@example\.invalid$/.test(b.email)||typeof b.password!=="string")return reply({},403);
      const local=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
      const r=await local.auth.signInWithPassword({email:b.email,password:b.password});
      if(!r.data.session||r.data.user?.app_metadata.yo_pass_pilot!==true)return reply({},401);
      jar.set(authName,r.data.session.access_token,{httpOnly:true,sameSite:"strict",secure:process.env.YO_PASS_ORIGIN?.startsWith("https:"),path:"/api/yo/pass-pilot",maxAge:r.data.session.expires_in});
    }else if(b.action==="logout"){jar.delete({name:authName,path:"/api/yo/pass-pilot"});return reply({});}
    const token=jar.get(authName)?.value;if(!token)return reply({error:"login"},401);
    const {data}=await getSupabaseAdmin().auth.getUser(token);
    if(!data.user||data.user.app_metadata.yo_pass_pilot!==true)return reply({error:"login"},401);
    const uid=data.user.id,now=Date.now();let feedback="";
    if(b.action==="balance")return reply({balance:await account(uid,balance)});
    if(b.action==="evidence"){
      if((b.round!=="bologna"&&b.round!=="parma")||!passedRound(b.round,b.answers))return reply({error:"retry_checkpoint"},422);
      await account(uid,w=>{win(w,b.round==="bologna"?"free-final":"parma-half");if(w.wins.includes("free-final")&&w.wins.includes("parma-half"))win(w,stage);});
    }else if(b.action==="redeem")await account(uid,w=>redeem(w,stage,now));
    else if(b.action==="order"){
      if(!["single","explorer","italy"].includes(b.sku)||!/^[-a-f0-9]{36}$/.test(b.id))return reply({},400);
      await prepare(uid,b.sku,b.id);
    }else if(["confirm","cancel","refresh"].includes(b.action)){
      if(typeof b.id!=="string")return reply({},400);await reconcile(uid,b.id,b.action==="refresh"?"read":b.action);
    }else if(b.action==="play"||b.action==="answer"){
      feedback=await account(uid,w=>{
        if(!w.wins.includes(stage)||(!owned(w,stage)&&!covered(w,now)))throw Error("checkpoint");
        if(b.action==="play"){
          if(!w.run||w.run.step===4)w.run={step:0,attempt:(w.run?.attempt??-1)+1,mistakes:0,interest:b.interest==="art"?"art":b.interest==="history"?"history":"travel"};
          if(!w.plays.includes(stage))w.plays.push(stage);return "";
        }
        if(!w.run||w.run.step!==b.step||w.run.attempt!==b.attempt)return "";
        const beat=railBeat(w.run);if(!beat) return "";
        if(!Number.isInteger(b.choice)||!beat.options[b.choice])throw Error("invalid_choice");
        if(b.choice!==beat.answer){w.run.mistakes++;return beat.hint;}
        w.run.step++;if(w.run.step===4&&!w.completed.includes(stage))w.completed.push(stage);return "";
      });
    }else if(!["state","login"].includes(b.action))return reply({},400);
    if(b.action==="state"||b.action==="login"){
      const pending=await account(uid,w=>w.orders.find(o=>o.status==="waiting"&&o.intent)?.id);
      if(pending)await reconcile(uid,pending);
    }
    return reply(await account(uid,w=>{
      const hasCourse=covered(w,now),access=hasCourse||owned(w,stage),beat=access&&w.run&&railBeat(w.run);
      return {balance:balance(w),italy:hasCourse,access,eligible:w.wins.includes(stage),final:w.wins.includes("free-final"),half:w.wins.includes("parma-half"),upgrade:quote(w,now).amount,
        best:cheapest(w,access?0:1,now),waiting:w.orders.filter(o=>o.status==="waiting").map(({id,amount,sku})=>({id,amount,sku}))[0],feedback,complete:w.completed.includes(stage),
        run:access?w.run:undefined,beat:beat?{prompt:beat.prompt,options:beat.options,audio:beat.audio,transcript:beat.transcript}:null};
    }));
  }catch(e){const message=e instanceof Error?e.message:"";const allowed=["empty","checkpoint","wrong_offer","purchase_pending","already_owned","busy_retry","test_price_missing","test_provider_unavailable","receipt_mismatch","quote_changed_review","closed_order","unknown_order"];
    return reply({error:allowed.includes(message)?message:"temporarily_unavailable"},409);}
}
