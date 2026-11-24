import assert from "node:assert/strict";
import {randomBytes,randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import Stripe from "stripe";
import {isolate} from "./local.cjs";
import {personalizedItalianUnits as units} from "../../lib/yo/personalized/courseData";
import {buildItalianTrivia} from "../../lib/yo/italian/trivia";
import {freshWallet} from "../../lib/yo/passPilot/wallet";
import {passCities} from "../../lib/yo/passPilot/cities";
import {railBeat} from "../../lib/yo/passPilot/rail";
async function main(){
 const env=isolate(),db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),stripe=new Stripe(env.YO_PASS_TEST_KEY);
 const url=env.YO_PASS_ORIGIN+"/api/yo/pass-pilot",cookie=async(email:string,password:string)=>{
   const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"login",email,password})});
   assert.equal(res.status,200,"local account login");return res.headers.getSetCookie().find(c=>c.startsWith("yo_pass_preview="))!.split(";")[0];};
 async function fixture(empty:boolean){
  const email="pass-qa-"+randomUUID()+"@example.invalid",password=randomBytes(20).toString("hex");
  const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{yo_pass_pilot:true}});assert.ifError(error);
  const uid=data.user!.id;if(empty){const w=freshWallet();w.units.forEach((u,i)=>u.used={at:Date.now(),stage:"test:past:"+i});assert.ifError((await db.from("yo_pass_pilot_accounts").insert({user_id:uid,wallet:w})).error);}
  const auth=await cookie(email,password);return {uid,auth,second:()=>cookie(email,password)};
 }
 const send=async(auth:string,action:string,params:Record<string,unknown>={},status=200)=>{
   const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json",cookie:auth},body:JSON.stringify({action,...params})});const r=await res.json();assert.equal(res.status,status,action+":"+JSON.stringify(r.error));return r;};
 const final=units[0].quiz.questions.map(q=>({answer:q.kind==="type"?q.accepted[0]:q.correctId,assisted:false})),half=buildItalianTrivia(units[1]).map(q=>({answer:q.correctOptionId,assisted:false}));
 async function prove(auth:string){await send(auth,"evidence",{round:"bologna",answers:final});return send(auth,"evidence",{round:"parma",answers:half});}
 const alice=await fixture(false),bob=await fixture(true);
 assert.equal((await send(alice.auth,"state")).balance,5);assert.equal((await send(await alice.second(),"state")).balance,5);assert.equal((await send(bob.auth,"state")).balance,0);
 await send(alice.auth,"evidence",{round:"bologna",answers:true},422);await send(alice.auth,"redeem",{},409);assert.ok((await prove(alice.auth)).eligible);
 const concurrent=await Promise.all([send(alice.auth,"redeem"),send(await alice.second(),"redeem")]);assert.ok(concurrent.every(s=>s.balance===4));
 const oid=randomUUID();await send(bob.auth,"order",{sku:"italy",id:oid});await send(alice.auth,"confirm",{id:oid},409);
 const pending=await send(bob.auth,"refresh",{id:oid});assert.equal(pending.italy,false);
 const paid=await send(bob.auth,"confirm",{id:oid});assert.equal(paid.italy,true);assert.equal(paid.eligible,false);await send(bob.auth,"play",{},409);
 await send(bob.auth,"confirm",{id:oid});await prove(bob.auth);await send(bob.auth,"redeem");let s=await send(await bob.second(),"play",{interest:"history"});
 for(let i=0;i<4;i++)s=await send(bob.auth,"answer",{step:i,attempt:s.run.attempt,choice:railBeat(s.run)!.answer});assert.equal(s.complete,true);assert.equal(s.balance,0);
 const first=await fixture(true);await prove(first.auth);const cancel=randomUUID();await send(first.auth,"order",{sku:"single",id:cancel});assert.ok((await send(first.auth,"cancel",{id:cancel})).eligible);
 for(const sku of ["single","explorer"]){const id=randomUUID();await send(first.auth,"order",{sku,id});await send(first.auth,"confirm",{id});await send(first.auth,"refresh",{id});}
 s=await send(first.auth,"redeem");assert.equal(s.balance,3);assert.equal(s.upgrade,1700);
 const raw=await db.from("yo_pass_pilot_accounts").select("wallet").eq("user_id",first.uid).single();assert.ifError(raw.error);
 const pack=raw.data!.wallet.orders.find((o:{sku:string})=>o.sku==="explorer");
 const refund=await stripe.refunds.create({payment_intent:pack.intent},{idempotencyKey:"yo-pass-test-refund:"+pack.id});assert.equal(refund.status,"succeeded");
 const reversed=await send(first.auth,"refresh",{id:pack.id});assert.equal(reversed.upgrade,1999);assert.equal(reversed.balance,1);assert.equal(reversed.access,false);
 // Apply all three purchased units through the account API and real city checkpoints.
 const upgrader=await fixture(true);await prove(upgrader.auth);const packId=randomUUID();
 await send(upgrader.auth,"order",{sku:"explorer",id:packId});await send(upgrader.auth,"confirm",{id:packId});await send(upgrader.auth,"redeem");
 for (const city of passCities.slice(1, 3)) {
   const unit = units.find(item => item.id === city.unit)!;
   const answers = buildItalianTrivia(unit).map(question => ({answer: question.correctOptionId, assisted: false}));
   await send(upgrader.auth, "evidence", {city: city.unit, round: city.round, answers});
   await send(upgrader.auth, "redeem", {city: city.unit});
 }
 const upgrade=randomUUID();assert.equal((await send(upgrader.auth,"order",{sku:"italy",id:upgrade})).waiting.amount,1100);await send(upgrader.auth,"confirm",{id:upgrade});
 const receipts=(await db.from("yo_pass_pilot_accounts").select("wallet").eq("user_id",upgrader.uid).single()).data!.wallet.orders;
 const receipt=await stripe.paymentIntents.retrieve(receipts.find((o:{id:string})=>o.id===upgrade).intent);
 assert.equal(receipt.livemode,false);assert.equal(receipt.amount_received,1100);
 const body=JSON.stringify({id:"evt_local_"+randomUUID(),object:"event",type:"payment_intent.succeeded",livemode:false,data:{object:receipt}});
 for(let i=0;i<2;i++){const sig=stripe.webhooks.generateTestHeaderString({payload:body,secret:env.YO_PASS_TEST_WEBHOOK!});const notify=await fetch(url+"/notification",{method:"POST",body,headers:{"stripe-signature":sig}});assert.equal(notify.status,204);}
 assert.equal((await send(upgrader.auth,"state")).balance,0);
 const d=randomUUID();await send(first.auth,"order",{sku:"single",id:d});
 const draft=(await db.from("yo_pass_pilot_accounts").select("wallet").eq("user_id",first.uid).single()).data!.wallet.orders.find((o:{id:string})=>o.id===d);
 await assert.rejects(stripe.paymentIntents.confirm(draft.intent,{payment_method:"pm_card_chargeDeclined"}));
 assert.equal((await send(first.auth,"refresh",{id:d})).balance,1);await send(first.auth,"cancel",{id:d});
 const rls=await createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY).from("yo_pass_pilot_accounts").select("wallet");assert.ok(rls.error);
 console.log("PASS local Auth, second session, isolated accounts, independent checkpoint evidence, simultaneous redemption; actual Stripe TEST CAD 3.49 / 8.99 / 19.99, cancellation, pending, replay, test refund, early owner and completed covered mission. No live payment.");
 console.log("PASS CAD 11.00 actual test receipt after CAD 8.99 of redeemed pack value; locally signed duplicate notifications; actual Stripe test decline grants nothing.");
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
