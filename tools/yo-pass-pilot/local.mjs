// Local test rig only. Keep fixture passwords, the API key and test receipts out of git and terminal output.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {execFileSync,spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {createClient} from "@supabase/supabase-js";
import Stripe from "stripe";
const runnerPath=fileURLToPath(import.meta.url),runnerDir=path.dirname(runnerPath);
const root=path.resolve(runnerDir,"../.."),dir=path.join(root,".qa-guided","pass-pilot"),file=path.join(dir,"review-accounts.json");
const envFile=process.env.YO_PASS_TEST_ENV_FILE;
function isolate(){
  if([".env",".env.local",".env.development.local",".env.production.local"].some(f=>fs.existsSync(path.join(root,f))))throw Error("Refusing ambient app env file");
  const inspect=JSON.parse(execFileSync("docker",["inspect","supabase_storage_pr405-local-sandbox"],{encoding:"utf8"}))[0];
  const port=execFileSync("docker",["port","supabase_kong_pr405-local-sandbox","8000/tcp"],{encoding:"utf8"}).trim();
  if(inspect.HostConfig.NetworkMode!=="pratiqo-pr405-loopback"||port!=="127.0.0.1:55421")throw Error("Unexpected local stack");
  const vars=Object.fromEntries(inspect.Config.Env.map(e=>{const i=e.indexOf("=");return [e.slice(0,i),e.slice(i+1)];}));
  const key=process.env.YO_PASS_TEST_KEY||(envFile&&fs.readFileSync(envFile,"utf8").match(/^\s*(?:STRIPE_TEST_SECRET_KEY|STRIPE_SECRET_KEY)\s*=\s*["']?((?:sk|rk)_test_[\w]+)["']?\s*$/m)?.[1]);
  if(!key||!/^(sk|rk)_test_/.test(key))throw Error("A verified Stripe test key is required");
  const signing=path.join(dir,"local-notification.key");
  return {YO_PASS_LOCAL:"1",NEXT_PUBLIC_YO_PASS_PILOT:"italian-test",YO_PASS_TEST_KEY:key,YO_PASS_TEST_WEBHOOK:fs.existsSync(signing)?fs.readFileSync(signing,"utf8"):undefined,YO_PASS_ORIGIN:"http://127.0.0.1:55941",NEXT_TELEMETRY_DISABLED:"1",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55421",NEXT_PUBLIC_SUPABASE_ANON_KEY:vars.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:vars.SERVICE_KEY};
}
async function setup(env){
  fs.mkdirSync(dir,{recursive:true});execFileSync("docker",["exec","-i","supabase_db_pr405-local-sandbox","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1"],{input:fs.readFileSync(path.join(runnerDir,"install-local.sql")),stdio:["pipe","pipe","pipe"]});
  if(!env.YO_PASS_TEST_WEBHOOK)fs.writeFileSync(path.join(dir,"local-notification.key"),crypto.randomBytes(30).toString("hex"),{flag:"wx",mode:0o600});
  const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  if(!fs.existsSync(file)){
    const fixtures={};for(const name of ["voyage","retour","qa","qa-paid"]){
      const email="pass-"+name+"-"+crypto.randomUUID().slice(0,8)+"@example.invalid",password=crypto.randomBytes(18).toString("base64url");
      const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{yo_pass_pilot:true}});if(error)throw Error("Local Auth fixture failed: "+error.code);
      fixtures[name]={email,password,id:data.user.id};
      if(name==="retour"||name==="qa-paid"){
        const {freshWallet}=await import("../../lib/yo/passPilot/wallet.ts"),w=freshWallet();
        w.units.forEach((u,i)=>{u.used={stage:"fixture:earlier:"+i,at:Date.now()};});
        const s=await db.from("yo_pass_pilot_accounts").insert({user_id:data.user.id,wallet:w});if(s.error)throw Error("Local balance seed failed: "+s.error.code);
      }
    }
    fs.writeFileSync(file,JSON.stringify(fixtures,null,2),{flag:"wx",mode:0o600});
  }
  const stripe=new Stripe(env.YO_PASS_TEST_KEY);
  for(const [sku,amount] of Object.entries({single:349,explorer:899,italy:1999})){
    const lookup="yo_it_20261123_"+sku,found=await stripe.prices.list({lookup_keys:[lookup],active:true});
    if(found.data.length){const p=found.data[0];if(p.livemode||p.currency!=="cad"||p.unit_amount!==amount||p.metadata.pilot!=="yo_it_20261123")throw Error("Unexpected test price");continue;}
    await stripe.prices.create({currency:"cad",unit_amount:amount,lookup_key:lookup,tax_behavior:"exclusive",product_data:{name:"YoPratiqo TEST · "+sku},metadata:{pilot:"yo_it_20261123"}},{idempotencyKey:lookup});
  }console.log("Local test schema, four synthetic accounts and three distinct CAD test prices verified.");
}
export {isolate,root,dir,file};
if(process.argv[1]&&path.resolve(process.argv[1])===runnerPath)(async()=>{const env=isolate();
 if(process.argv[2]==="setup")return setup(env);
 if(process.argv[2]!=="serve")throw Error("Choose setup or serve");
 const clean={};for(const k of ["SystemRoot","WINDIR","PATH","Path","TEMP","TMP","USERPROFILE","APPDATA","LOCALAPPDATA","COMSPEC","PATHEXT","NUMBER_OF_PROCESSORS"])if(process.env[k])clean[k]=process.env[k];
 const child=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--turbopack","-H","127.0.0.1","-p","55941"],{cwd:root,env:{...clean,...env},stdio:"inherit"});child.on("exit",code=>process.exitCode=code??1);
})().catch(e=>{console.error("Pilot unavailable:",String(e.message).replace(/(?:sk|rk)_(?:test|live)_\w+/g,"[redacted]"));process.exitCode=1;});
