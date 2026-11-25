import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
/* Browser integration of real pages with synthetic, in-memory API boundaries. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { build } from "esbuild";

async function main() {
  const { chromium } = load(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const root = process.cwd();
  const harness = await (await import('./guidedPublicationHarness.mjs')).createHarness();
  const output = process.env.QA_OUTPUT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-guided-qa-'));
  fs.mkdirSync(output, { recursive: true });
  const fixture = `
    export const user = {id:'22222222-2222-4222-8222-222222222222',email:'teacher@example.invalid',user_metadata:{}};
    export const profile = {id:user.id,role:'teacher',name:'Prof QA',plan:'free',teacher_onboarding_complete:true};
    const initial = {id:'qa-teacher',user_id:user.id,name:'Prof QA',bio:'',discipline:'piano',teaching_mode:'online',price_per_lesson:45,default_lesson_duration_minutes:60,availability:[],city:'Saint-Georges',region:'QC',country_code:'CA',timezone:'America/Toronto',schedule_mode:'legacy_blocks',is_public:false,identity_status:'pending',location:{}};
    initial.id='11111111-1111-4111-8111-111111111111';
    export const teacher = JSON.parse(localStorage.getItem('qa-teacher') || JSON.stringify(initial));
    export function getSupabaseClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'synthetic-token'}}})},from(table){
      let single=false; let update=null;
      const q = new Proxy({}, {get(_,method){
        if(method==='then')return resolve=>{if(update&&table==='teachers'){Object.assign(teacher,update);localStorage.setItem('qa-teacher',JSON.stringify(teacher));}resolve({error:null,data:table==='teachers'?teacher:table==='profiles'?profile:table==='teacher_disciplines'?[{id:'qa-discipline',discipline_id:'piano',specialite:'',sort_order:0}]:single?null:[]});};
        return (...args)=>{if(method==='maybeSingle'||method==='single')single=true;if(method==='update')update=args[0];return q;};
      }});return q;
    }}};
    window.qaCalls=[];
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async(url,options={})=>{
      const p=new URL(String(url),location.origin);window.qaCalls.push({path:p.pathname,method:options.method||'GET'});
      let body={};let status=200;
      if(p.pathname==='/api/teacher/teaching-zones')body={zones:[]};
      else if(p.pathname==='/api/stripe/connect'){status=options.method==='POST'?503:200;body=options.method==='POST'?{error:'Hosted Stripe is unavailable in this synthetic preview'}:{};}
      else if(p.pathname==='/api/teacher/setup-status'||p.pathname==='/api/teacher/profile/visibility'){
        if(localStorage.getItem('qa-status-failure'))return new Response('{}',{status:503});
        const kind=p.pathname.endsWith('setup-status')?'status':options.method==='PATCH'?'publish':'visibility';
        if(kind==='publish'&&localStorage.getItem('qa-network-failure'))throw new TypeError('Synthetic network failure');
        const result=await (await nativeFetch('/__qa/handler',{method:'POST',body:JSON.stringify({kind,teacher:JSON.parse(localStorage.getItem('qa-teacher')||JSON.stringify(teacher)),refuse:localStorage.getItem('qa-refuse')==='1'})})).json();
        Object.assign(teacher,result.teacher);localStorage.setItem('qa-teacher',JSON.stringify(teacher));
        return new Response(JSON.stringify(result.body),{status:result.status,headers:{'Content-Type':'application/json'}});
      }
      else if(p.pathname==='/api/teacher/weekly-intervals'){
        if(options.method==='PUT'){
          if(localStorage.getItem('qa-save-failure'))status=503;
          else {
            const intervals=JSON.parse(options.body).intervals;
            localStorage.setItem('qa-intervals',JSON.stringify(intervals));
            teacher.availability=await (await nativeFetch('/__qa/coarse',{method:'POST',body:JSON.stringify(intervals)})).json();
            localStorage.setItem('qa-teacher',JSON.stringify(teacher));
          }
        }
        body={intervals:JSON.parse(localStorage.getItem('qa-intervals')||'[]')};
      } else if(p.pathname==='/api/teacher/schedule/availability-preview')body={startDate:'2026-10-19',daysRequested:14,durationMinutes:60,days:[],paymentReadiness:{ready:false,reason:'not_ready'}};
      else if(p.pathname==='/api/teacher/lesson-duration'){teacher.default_lesson_duration_minutes=JSON.parse(options.body).defaultLessonDurationMinutes;localStorage.setItem('qa-teacher',JSON.stringify(teacher));body={ok:true,defaultLessonDurationMinutes:teacher.default_lesson_duration_minutes};}
      else if(p.pathname==='/api/teacher/pricing'){Object.assign(teacher,JSON.parse(options.body));localStorage.setItem('qa-teacher',JSON.stringify(teacher));body={ok:true};}
      else throw new Error('Unmocked request: '+p.pathname);
      return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
    };
  `;
  const bundled = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import './qa-fixture';
      import Course from './app/(app)/teacher/verification/page';
      import Schedule from './app/(app)/teacher/schedule/page';
      import Payments from './app/(app)/teacher/setup-payments/page';
      const Page=location.pathname.includes('setup-payments')?Payments:location.pathname.includes('schedule')?Schedule:Course;
      createRoot(document.getElementById('root')).render(<Page/>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': '""' },
    plugins: [{name:'synthetic-boundaries',setup(b){
      b.onResolve({filter:/qa-fixture$|(?:AuthProvider|locale-context|lib\/supabase)$|^next\/(?:link|navigation|image)$/},args=>({path:args.path,namespace:'qa'}));
      b.onLoad({filter:/.*/,namespace:'qa'},args=>{
        let contents;
        if(args.path.endsWith('qa-fixture'))contents=fixture;
        else if(args.path.endsWith('AuthProvider'))contents=`import {user,profile} from './qa-fixture';export const useAuth=()=>({user,profile,loading:false});`;
        else if(args.path.endsWith('lib/supabase'))contents=`export {getSupabaseClient} from './qa-fixture';`;
        else if(args.path.endsWith('locale-context'))contents=`import fr from './lib/i18n/locales/fr.json'; const value={locale:'fr',t:key=>fr[key]||key};export const useLocale=()=>value;`;
        else if(args.path==='next/link')contents=`import React from 'react'; export default function Link({href,children,prefetch,...props}){return <a href={href} {...props}>{children}</a>}`;
        else if(args.path==='next/image')contents=`import React from 'react';export default function Image({fill,priority,...props}){return <img {...props}/>}`;
        else contents=`const params=new URLSearchParams(location.search);const router={push:p=>location.assign(p),replace:p=>location.replace(p),refresh:()=>location.reload()};export const useSearchParams=()=>params;export const useRouter=()=>router;export const usePathname=()=>location.pathname;`;
        return {contents,loader:'tsx',resolveDir:root};
      });
    }}],
  });
  const cssDir=path.join(root,'.next/static/chunks');
  const css=fs.existsSync(cssDir)?fs.readdirSync(cssDir).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(cssDir,f),'utf8')).join('\n'):'';
  assert.ok(css,'Build first: QA must use generated application CSS');
  const server=http.createServer(async(req,res)=>{
    if(req.url.startsWith('/__qa/')){
      try {
        let raw='';for await(const chunk of req)raw+=chunk;
        const input=JSON.parse(raw);res.setHeader('Content-Type','application/json');
        if(req.url==='/__qa/coarse')res.end(JSON.stringify(harness.coarse(input)));
        else {
          // Simulates a prerequisite changing on the server between GET and PATCH.
          if(input.kind==='publish'&&input.refuse)input.teacher.bio='';
          res.end(JSON.stringify(await harness.run(input.kind,{teacher:input.teacher})));
        }
      }catch(error){res.statusCode=500;res.end(JSON.stringify({error:String(error)}));}
    }
    else if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundled.outputFiles[0].text);}
    else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css);}
    else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><body><main id="root" style="padding:16px"></main><script src="/fixture.js"></script></body></html>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  if(process.env.QA_PREVIEW==='1'){
    console.log(`Synthetic preview (no external requests): http://127.0.0.1:${server.address().port}/teacher/verification?setup=1`);
    return;
  }
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const context=await browser.newContext({viewport:{width:375,height:667}});
    const origin=`http://127.0.0.1:${server.address().port}`;
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/teacher/verification?setup=1');
    await page.getByRole('heading',{name:'Mon cours',exact:true}).waitFor();
    const bio=page.locator('textarea').first();await bio.fill('Présentation synthétique pour tester la reprise sans perte.');
    await page.reload();await bio.waitFor();assert.equal(await bio.inputValue(),'Présentation synthétique pour tester la reprise sans perte.');
    assert.equal(await page.getByTestId('teacher-profile-mgmt-ai-toggle').count(),0);
    await page.screenshot({path:path.join(output,'course-mobile.png'),fullPage:true});
    await page.getByTestId('teacher-guided-navigation').getByRole('link').nth(1).click();
    await page.getByTestId('teacher-guided-availability').waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qa-teacher')).bio),'Présentation synthétique pour tester la reprise sans perte.');
    const duration=page.locator('select').first();await duration.selectOption('45');await page.reload();await duration.waitFor();assert.equal(await duration.inputValue(),'45');
    const day=page.locator('input[type="checkbox"]').first();await day.check();
    await page.locator('select').nth(1).selectOption('09:15');
    await page.reload();await day.waitFor();assert.equal(await day.isChecked(),true);
    assert.equal(await page.locator('select').nth(1).inputValue(),'09:15');
    await page.evaluate(()=>localStorage.setItem('qa-save-failure','1'));
    await page.getByTestId('teacher-weekly-intervals-save-bar-save').click();
    await page.waitForFunction(()=>window.qaCalls.some(c=>c.path==='/api/teacher/weekly-intervals'&&c.method==='PUT'));
    assert.equal(await page.getByRole('button',{name:'Mes paiements',exact:true}).isDisabled(),true);
    assert.equal(await page.evaluate(()=>localStorage.getItem('qa-intervals')),null);
    await page.evaluate(()=>localStorage.removeItem('qa-save-failure'));
    await page.getByTestId('teacher-weekly-intervals-save-bar-save').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('qa-intervals')||'[]').length===1);
    await page.screenshot({path:path.join(output,'availability-mobile.png'),fullPage:true});
    await page.getByRole('button',{name:'Mes paiements',exact:true}).click();
    await page.waitForURL('**/teacher/setup-payments?setup=1');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qa-teacher')).default_lesson_duration_minutes),45);
    await page.goto(origin+'/teacher/setup-payments?setup=1&stripe=success');
    const publish=page.getByRole('button',{name:'Publier mon profil',exact:true});
    await publish.waitFor();assert.equal(await publish.isEnabled(),true, await page.locator('main').innerText());
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qa-teacher')).is_public),false);
    const calls=await page.evaluate(()=>window.qaCalls.map(c=>c.path));
    assert.deepEqual(calls.slice(0,2),['/api/stripe/connect','/api/teacher/setup-status']);
    await page.screenshot({path:path.join(output,'publish-mobile.png'),fullPage:true});
    await page.evaluate(()=>localStorage.setItem('qa-network-failure','1'));await publish.click();await page.getByRole('alert').waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qa-teacher')).is_public),false);
    await page.evaluate(()=>localStorage.removeItem('qa-network-failure'));await page.reload();await publish.waitFor();
    await page.evaluate(()=>localStorage.setItem('qa-refuse','1'));await publish.click();await page.getByRole('alert').waitFor();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('qa-teacher')).bio==='');
    assert.equal(await publish.isDisabled(),true);
    await page.evaluate(()=>{localStorage.removeItem('qa-refuse');const t=JSON.parse(localStorage.getItem('qa-teacher'));t.bio='Présentation synthétique pour tester la reprise sans perte.';localStorage.setItem('qa-teacher',JSON.stringify(t));});
    await page.reload();await publish.waitFor();await publish.click();
    await page.getByRole('status').filter({hasText:'demande'}).waitFor();
    assert.equal(await publish.count(),0);
    await page.reload();await page.getByRole('status').filter({hasText:'demande'}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('pratiqo:teacher-setup:22222222-2222-4222-8222-222222222222')),'payments');
    await page.getByRole('link',{name:'Retour au tableau de bord'}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('pratiqo:teacher-setup:22222222-2222-4222-8222-222222222222')),'payments');
    await page.goto(origin+'/teacher/setup-payments?setup=1');await page.getByRole('status').filter({hasText:'demande'}).waitFor();
    // Only a refreshed authoritative readiness result, never stripe=success, completes setup.
    await page.evaluate(()=>{const t=JSON.parse(localStorage.getItem('qa-teacher'));Object.assign(t,{stripe_account_id:'acct_synthetic',stripe_connect_onboarding_complete:true,stripe_connect_charges_enabled:true,stripe_connect_payouts_enabled:true,stripe_connect_requirements_due:[]});localStorage.setItem('qa-teacher',JSON.stringify(t));});
    await page.reload();await page.getByRole('status').filter({hasText:'paiement'}).waitFor();
    await page.screenshot({path:path.join(output,'payments-mobile.png'),fullPage:true});
    await page.getByRole('link',{name:'Retour au tableau de bord'}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('pratiqo:teacher-setup:22222222-2222-4222-8222-222222222222')),null);
    await page.goto(origin+'/teacher/setup-payments?setup=1');
    await page.evaluate(()=>localStorage.setItem('qa-status-failure','1'));await page.reload();await page.getByRole('alert').waitFor();
    assert.ok(!(await page.getByRole('status').innerText()).includes('demande'));
    await page.evaluate(()=>{localStorage.removeItem('qa-status-failure');const t=JSON.parse(localStorage.getItem('qa-teacher'));t.is_public=false;localStorage.setItem('qa-teacher',JSON.stringify(t));});
    for(const width of [320,375,768,1280]){
      await page.setViewportSize({width,height:800});
      for(const route of ['/teacher/verification?setup=1','/teacher/schedule?setup=1','/teacher/setup-payments?setup=1']){
        await page.goto(origin+route);await page.getByTestId('teacher-guided-navigation').waitFor();
        if(route.includes('setup-payments'))await publish.waitFor();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow: ${width} ${route}`);
        if(width===320&&route.includes('setup-payments'))await page.screenshot({path:path.join(output,'publish-320.png'),fullPage:true});
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: actual page components, mobile draft reload, save-before-next, Stripe return resync/failure, 320/375/768/1280 widths. Synthetic APIs only. Screenshots:',output);
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
