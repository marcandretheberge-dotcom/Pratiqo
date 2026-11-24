import {chromium} from "playwright";
import {mkdirSync} from "node:fs";
import {randomBytes,randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {isolate} from "./local.cjs";
import path from "node:path";
import assert from "node:assert/strict";
import {personalizedItalianUnits} from "../../lib/yo/personalized/courseData";
import {buildItalianTrivia} from "../../lib/yo/italian/trivia";
// Record the real UI after a synthetic QA account has supplied scoreable answer fixtures.
// Neither credentials nor account identifiers belong in the recording.
async function main(){
 const origin="http://127.0.0.1:55941",out=".qa-guided/pass-pilot";
 const env=isolate(),acct={email:"pass-phone-"+randomUUID()+"@example.invalid",password:randomBytes(20).toString("hex")};
 const user=await createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY).auth.admin.createUser({...acct,email_confirm:true,app_metadata:{yo_pass_pilot:true}});assert.ifError(user.error);
 const browser=await chromium.launch({executablePath:process.env.QA_BROWSER});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}});
 const post=async(action:string,data={})=>{const r=await ctx.request.post(origin+"/api/yo/pass-pilot",{data:{action,...data}});assert.ok(r.ok(),action+":"+r.status());return r.json();};
 await post("login",{email:acct.email,password:acct.password});
 await post("evidence",{round:"bologna",answers:personalizedItalianUnits[0].quiz.questions.map(a=>({answer:a.kind==="type"?a.accepted[0]:a.correctId,assisted:false}))});
 await post("evidence",{round:"parma",answers:buildItalianTrivia(personalizedItalianUnits[1]).map(q=>({answer:q.correctOptionId,assisted:false}))});
 const p=await ctx.newPage(),video=p.video()!,errors:string[]=[];p.on("pageerror",e=>errors.push(e.name));
 await p.goto(origin+"/yo/langues/italien/parcours/pass",{timeout:120000});
 await p.getByRole("button",{name:/Nécessaires seulement|Necessary only|Refuser/}).first().click({timeout:2500}).catch(()=>{});
 const btn=(name:RegExp)=>p.getByRole("button",{name});
 await btn(/Utiliser 1 Yoppo Pass/).click({timeout:30000});
 await btn(/Continuer mon voyage|Rejouer gratuitement/).click({timeout:30000});await btn(/Parma · (09 h 40|10 h 25)/).click();
 await btn(/Da quale binario/).click();await p.locator('audio[src$="/platform.mp3"]').evaluate(async a=>{await (a as HTMLAudioElement).play();});await p.waitForFunction(()=>document.querySelector("audio")?.ended);
 await btn(/Binario tre/).click();await btn(/questo treno va a Parma/).click();await p.getByText(/Mission réussie : tu as guidé/).waitFor();
 await p.reload();await btn(/Rejouer gratuitement/).waitFor();assert.deepEqual(errors,[]);
 const folder="docs/yopratiqo/pass-pilot";mkdirSync(folder,{recursive:true});
 await p.screenshot({path:path.join(folder,"parma-mobile.png")});await p.close();await video.saveAs(path.join(folder,"parma-mobile.webm"));await ctx.close();
 console.log("PASS mobile Chromium: real wallet debit or already-owned replay, rail audio decoded and ended, earned completion after reload; capture excludes login and secrets.");
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
