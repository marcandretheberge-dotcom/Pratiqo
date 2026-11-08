import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { introCourses } from "@/lib/yo/shared/course";
import { courseSteps } from "@/lib/yo/shared/steps";
import { freshIntro, parseIntro, introKey, introPoints, suggestedMission } from "@/lib/yo/shared/state";
import { introAudioPaths } from "@/lib/yo/shared/audio.server";
import { artworkPath } from "@/lib/yo/personalized/approvedVocabulary";
import { yoPublicCatalog } from "@/lib/yo/publicCatalog";
let n=0;const test=(name:string,fn:()=>void)=>{fn();n++;console.log(`PASS ${name}`);};
const coverage:Record<string,{phrases:number;recordingPaths:number;deviceVoice:number}>={};
for(const c of introCourses){
 test(`${c.slug}: complete, localized authored module`,()=>{
  assert.equal(c.missions.length,3);assert.equal(c.final.length,6);assert.equal(c.missions.flatMap(m=>m.practice).length,15);
  const phrases=new Map(c.phrases.map(p=>[p.id,p]));assert.equal(phrases.size,c.phrases.length);
  const taught=new Set<string>();
  for(const m of c.missions){
   m.phrases.forEach(id=>{assert.ok(phrases.has(id));taught.add(id);});
   for(const v of m.visuals){assert.ok(taught.has(v.phrase));assert.equal(v.pictures.length,4);assert.equal(new Set(v.pictures.map(p=>p.id)).size,4);assert.equal(v.pictures.filter(p=>p.id===v.answer).length,1);for(const p of v.pictures){assert.ok(p.artwork);assert.ok(existsSync('public'+artworkPath(p.artwork!)));}}
   for(const e of m.practice){assert.ok(taught.has(e.answer),e.id);assert.ok(e.options.every(id=>taught.has(id)),e.id);if(e.cue)assert.ok(taught.has(e.cue));if(e.kind==='order'){const p=phrases.get(e.answer)!;assert.ok(p.parts?.length);assert.equal(p.parts!.join('').replace(/\s/g,''),p.text.replace(/\s/g,''));}else assert.equal(e.options.filter(id=>id===e.answer).length,1);}
   for(const s of m.concepts)for(const lang of ['fr','en','es'] as const){assert.ok(s.body[lang].length>30);assert.ok(s.title[lang]);assert.ok(s.examples.every(id=>taught.has(id)));}
  }
  for(const p of c.phrases){assert.ok(taught.has(p.id));for(const l of ['fr','en','es']as const)assert.ok(p.meaning[l]);if(['ja','zh-Hans'].includes(c.language))assert.ok(p.reading);}
 });
 test(`${c.slug}: preparation precedes real teaching and evidence stays language-scoped`,()=>{
  const steps=courseSteps(c);assert.equal(new Set(steps.map(s=>s.id)).size,steps.length);
  for(let i=0;i<3;i++){const p=steps.filter(s=>s.mission===i);assert.equal(p[0].kind,'visual');assert.ok(p.findIndex(s=>s.kind==='words')<p.findIndex(s=>s.kind==='scene'));}
  const s=freshIntro(c);assert.deepEqual(parseIntro(JSON.stringify(s),c),s);assert.equal(introPoints(c,s),0);
  assert.deepEqual(parseIntro('{bad',c),s);assert.deepEqual(parseIntro(JSON.stringify({...s,language:'WRONG'}),c),s);assert.deepEqual(parseIntro(JSON.stringify({...s,step:99999}),c),s);
  s.completed=c.missions.flatMap(m=>m.practice.map(e=>e.id));s.best=6;assert.equal(introPoints(c,s),250);s.completed.push(s.completed[0]);assert.equal(introPoints(c,s),250);
 });
 const paths=introAudioPaths(c);coverage[c.slug]={phrases:c.phrases.length,recordingPaths:Object.keys(paths).length,deviceVoice:c.phrases.length-Object.keys(paths).length};
 for(const path of Object.values(paths))if(path.startsWith('/audio/'))assert.ok(existsSync('public'+path));
}
test('eight catalogue entries, Italian retains its existing player and storage',()=>{assert.equal(yoPublicCatalog.length,8);assert.ok(yoPublicCatalog.every(c=>c.path.endsWith(c.slug==='italien'?'/parcours':'/demarrer')));assert.equal(new Set(introCourses.map(c=>introKey(c.language))).size,7);const route=readFileSync('app/yo/langues/[language]/demarrer/page.tsx','utf8');assert.match(route,/p.language==='italien'.*redirect/);});
test('placement only selects a mission, never creates mastery',()=>{assert.equal(suggestedMission([]),0);assert.equal(suggestedMission(Array.from({length:6},()=>({correct:true,assisted:false}))),2);assert.equal(suggestedMission([{correct:true,assisted:false},{correct:true,assisted:false},{correct:false,assisted:false},{correct:true,assisted:false}]),1);});
test('no finance, server learner data or runtime AI endpoints introduced',()=>{for(const f of ['SharedIntro','IntroWelcome','IntroQuestion','IntroNotebook'])assert.doesNotMatch(readFileSync(`components/yo/shared/${f}.tsx`,'utf8'),/fetch\(|\.rpc\(|stripe|OPENAI_API_KEY|textarea|type=["']checkbox/);});
console.log(`${n} shared intro checks passed`);console.log('Exact recording-path inventory (not a live playback claim):',JSON.stringify(coverage));
