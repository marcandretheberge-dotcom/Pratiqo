// Run after next build. Loopback-only visual QA; no secrets or external requests.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const root = process.cwd();
const stub = `
import React from 'react';
import {t as translate} from '${path.join(root, "lib/translations.ts").replaceAll("\\", "/")}';
const user = {id:'00000000-0000-4000-8000-000000000001'};
const profile = {role:'student',full_name:'Eleve QA',companion_chosen:true,student_onboarding_consent_completed_at:'2026-10-18',student_onboarding_consent_version:'student_onboarding_consent_v1_2026_06'};
export const useAuth = () => ({user,profile,profileHydrated:true});
const t = key => translate(key,'fr');
export const useLocale = () => ({locale:'fr',t,formatPrice: n => n+' CAD'});
const teacher={id:'qa-teacher',user_id:null,name:'Professeur synthetique',discipline:'Piano',timezone:'America/Toronto'};
const booking={id:'qa-course',teacher_id:teacher.id,status:'confirmed',date:'2099-10-20',time:'14:00-15:00',duration_minutes:60,price:40,teaching_mode:'online'};
export const getSupabaseClient = () => ({
  auth:{getSession:async()=>({data:{session:{user,access_token:'synthetic-only'}}})},
  from:table=>{
    const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,
      maybeSingle:async()=>({data:teacher}),
      then:(resolve,reject)=>Promise.resolve({data:table==='bookings'?[booking]:[]}).then(resolve,reject)};
    return q;
  }
});
export const CreditsWidget=()=>null;
export const ConfirmCancelBookingDialog=()=>null;
export const RescheduleModal=()=>null;
export const SupportCaseModal=()=>null;
export default function Link({href,children,...props}){return <a href={typeof href==='string'?href:'#'} {...props}>{children}</a>}
`;

(async () => {
  const bundle = await esbuild.build({
    entryPoints: ["tests/students/learningProjectBrowserFixture.tsx"],
    bundle: true, write: false, platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    plugins: [{ name: "synthetic-boundaries", setup(build) {
      build.onResolve({filter:/^next\/image$/},()=>({path:"image",namespace:"image-qa"}));
      build.onLoad({filter:/.*/,namespace:"image-qa"},()=>({contents:"import React from 'react'; export default function Image({fill,unoptimized,priority,...props}){return <img {...props}/>}",loader:"jsx",resolveDir:root}));
      build.onResolve({ filter: /^(next\/link|@\/lib\/(supabase|locale-context)|@\/components\/(AuthProvider|CreditsWidget|ConfirmCancelBookingDialog|RescheduleModal|support\/SupportCaseModal))$/ }, () => ({path:"fixture",namespace:"qa"}));
      build.onLoad({filter:/.*/,namespace:"qa"},()=>({contents:stub,loader:"jsx",resolveDir:root}));
    }}],
  });
  const cssDir = path.join(root, ".next/static/chunks");
  const css = fs.readdirSync(cssDir).filter(f=>f.endsWith(".css")).map(f=>fs.readFileSync(path.join(cssDir,f),"utf8")).join("\n");
  let project = null;
  let failNext = false;
  require("tsx/cjs");
  const {learningProjectSearchHref,parseLearningProject}=require(path.join(root,"lib/studentLearningProject.ts"));
  const overview = {
    totalAccounts:3,declaredAccounts:1,deferredAccounts:1,unansweredAccounts:1,
    groups:[{subject:"Piano",city:"",format:"online",audience:"child",account_count:1,updated_at:"2026-10-18T12:00:00Z",supply:"unavailable",matchingTeachers:null}],
  };
  const server=http.createServer(async(req,res)=>{
    if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||"")){res.writeHead(403).end();return;}
    const url=new URL(req.url,"http://127.0.0.1");
    const json=(status,data)=>{res.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify(data));};
    if(url.pathname==="/qa/fail"){failNext=true;res.writeHead(303,{Location:"/dashboard"}).end();return;}
    if(url.pathname==="/qa/reset"){project=null;res.writeHead(303,{Location:"/dashboard"}).end();return;}
    if(url.pathname==="/api/student/learning-project"){
      if(req.method==="PUT"){
        if(failNext){failNext=false;json(503,{error:"synthetic_failure"});return;}
        let body="";for await(const chunk of req)body+=chunk;
        const input=JSON.parse(body);
        if(input.action==="save"){
          const parsed=parseLearningProject(input);if(!parsed){json(400,{});return;}
          project={...parsed,completed_at:new Date().toISOString(),dismissed_at:null,updated_at:new Date().toISOString()};
        }else if(!project?.completed_at){project={subject:"",city:"",format:"in_person",audience:"self",completed_at:null,dismissed_at:new Date().toISOString(),updated_at:new Date().toISOString()};}
      }
      json(200,{project,searchHref:project?.completed_at?learningProjectSearchHref(project):null});return;
    }
    if(url.pathname==="/api/admin/learning-project-demand"){json(200,{overview});return;}
    if(url.pathname.startsWith("/api/")){json(404,{});return;}
    if(url.pathname==="/qa.js"){res.writeHead(200,{"Content-Type":"text/javascript"});res.end(bundle.outputFiles[0].text);return;}
    if(url.pathname==="/qa.css"){res.writeHead(200,{"Content-Type":"text/css"});res.end(css);return;}
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"});
    res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css"><title>PR407 - QA synthetique</title><body><nav style="padding:8px">QA locale seulement | <a href="/dashboard">Eleve</a> | <a href="/admin/learning-project-demand">Admin</a> | <a href="/qa/fail">Prochaine sauvegarde en erreur</a> | <a href="/qa/reset">Nouveau projet fictif</a></nav><div id="root" style="max-width:1100px;margin:auto;padding:12px"></div><script src="/qa.js"></script></body></html>`);
  });
  server.listen(0,"127.0.0.1",()=>console.log(`QA http://127.0.0.1:${server.address().port}/dashboard`));
})().catch(error=>{console.error(error);process.exitCode=1;});
