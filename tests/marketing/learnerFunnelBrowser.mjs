/* Local production-build UI QA. All demand writes and external requests are mocked. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.LEARNER_QA_URL || 'http://127.0.0.1:3191';
assert.equal(new URL(base).hostname, '127.0.0.1');
const output = process.env.LEARNER_QA_OUTPUT;
if (output) fs.mkdirSync(output, { recursive: true });
async function main() {
 const browser = await chromium.launch({headless:true, ...(process.env.LEARNER_QA_BROWSER ? {channel:process.env.LEARNER_QA_BROWSER} : {})});
 try {
  for (const viewport of [{width:375,height:667},{width:1280,height:900}]) {
   const context=await browser.newContext({viewport,locale:'fr-CA'});
   let outcome='waitlist'; const requests=[]; const errors=[];
   await context.route('**/*',async route=>{
    const req=route.request(); const url=new URL(req.url());
    if(url.hostname!=='127.0.0.1') return route.abort();
    if(url.pathname==='/api/learner-demand') {
     const input=req.postDataJSON(); requests.push(input);
     assert.equal(input.subject,'Piano');assert.equal(input.city,'Saint-Georges');
     assert.equal(input.requestedFormat,'in_person');assert.equal(input.availabilityPreference,'weekend');
     if(outcome==='error') return route.fulfill({status:503,json:{ok:false,error:'match_unavailable'}});
     return route.fulfill({json:{ok:true,outcome,saved:input.intent==='waitlist',city:'Saint-Georges',matchCount:outcome==='waitlist'?0:1,
      searchUrl:outcome==='waitlist'?null:'/student/search?q=piano&city=Saint-Georges&format=in_person&availability=weekend'}});
    }
    if(req.method()!=='GET' && req.method()!=='HEAD') return route.abort();
    return route.continue();
   });
   const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
   for(outcome of ['local_match','online_match','waitlist','error']) {
    await page.goto(`${base}/trouver-mon-prof`,{waitUntil:'networkidle'});
    const necessary=page.getByRole('button',{name:'Nécessaires seulement',exact:true});
    if(await necessary.isVisible()) await necessary.click();
    await page.getByRole('heading',{level:1}).filter({hasText:'Tu veux apprendre'}).waitFor();
    await page.locator('#finder-subject').fill('Piano'); await page.locator('#finder-subject').press('Enter');
    await page.locator('#finder-city').fill('Saint-Georges'); await page.locator('#finder-city').press('Enter');
    await page.locator('#finder-availability').selectOption('weekend');
    assert.equal(await page.locator('#finder-email').count(),0);
    const section=page.locator('section').filter({has:page.locator('#finder-availability')});
    await section.getByRole('button').last().click();
    if(outcome==='error') { await page.getByText(/Impossible de traiter/).waitFor(); }
    else {
     await page.getByRole('button',{name:'Me prévenir lorsqu’un cours correspond',exact:true}).waitFor();
     if(outcome!=='waitlist') assert.match(await page.locator('a[href*="availability=weekend"]').getAttribute('href'),/city=Saint-Georges/);
     if(outcome==='online_match') assert.match(await page.locator('main').innerText(),/ligne/);
     if(outcome==='waitlist') {
      await page.getByRole('button',{name:'Me prévenir lorsqu’un cours correspond',exact:true}).click();
      await page.locator('#finder-email').fill('fixture@example.test');
      const form=page.locator('section').filter({has:page.locator('#finder-email')});
      const checks=form.getByRole('checkbox');assert.equal(await checks.count(),2);
      for(let i=0;i<2;i++) { assert.equal(await checks.nth(i).isChecked(),false);await checks.nth(i).check(); }
      await form.getByRole('button').last().click();
      await page.getByText('fixture@example.test',{exact:true}).waitFor();
      const sent=requests.at(-1);assert.equal(sent.alertConsent,true);assert.equal(sent.adultContactConfirmed,true);assert.ok(!sent.marketingConsent);
     }
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
    if(output) await page.screenshot({path:path.join(output,`${viewport.width}-${outcome}.png`),fullPage:true});
   }
   assert.deepEqual(errors,[]); await context.close();
   console.log(`PASS browser ${viewport.width}: local / online / saved waitlist / error, unselected consent, no email before search, no horizontal overflow`);
  }
 } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
