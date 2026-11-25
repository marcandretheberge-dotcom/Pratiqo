/** Read-only inventory + optional public GET verification. No credentials, generation or upload. */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { introCourses } from "../lib/yo/shared/course";
import { introAudioPaths } from "../lib/yo/shared/audio.server";
import { personalizedItalianUnits, moduleBank } from "../lib/yo/personalized/courseData";
import { unitSpeech, distinctSpeech } from "../lib/yo/italian/course/courseSpeech";
import { courseAudioPaths } from "../lib/yo/italian/course/courseAudio.server";
import { getItalianBolognaAudioItem } from "../lib/yo/audio/italianBolognaAudio";
import { YOPRATIQO_AUDIO_MANIFEST } from "../lib/yo/audio/audioManifest";
import { italianCourseAudioDependencies } from "../lib/yo/audio/italianCourseAudio";
import { germanPublishedAudio } from "../lib/yo/german/courseAudioPublished";
import { portuguesePublishedAudio } from "../lib/yo/portuguese/courseAudioPublished";
import mandarinAudio from "../lib/yo/mandarin/audioPaths.json";
import { validateMp3 } from "./generate-yopratiqo-audio";

export function audioInventory() {
  const groups = introCourses.map(c => ({name:`intro/${c.slug}`, rows:c.phrases.map(p=>({text:p.text,path:introAudioPaths(c)[p.text]??null}))}));
  for (const unit of personalizedItalianUnits) {
    const texts=distinctSpeech([...unitSpeech(unit),...moduleBank(unit).map(p=>p.it)]),paths=courseAudioPaths(texts);
    groups.push({name:`italian/${unit.id}`,rows:texts.map(text=>({text,path:paths[text]??getItalianBolognaAudioItem(text)?.storagePath??null}))});
  }
  const paths=[...new Set([
    ...groups.flatMap(g=>g.rows.flatMap(r=>r.path?[r.path]:[])),
    ...YOPRATIQO_AUDIO_MANIFEST.map(a=>a.storagePath), ...italianCourseAudioDependencies.map(a=>a.storagePath),
    ...Object.values(germanPublishedAudio), ...Object.values(portuguesePublishedAudio), ...Object.values(mandarinAudio),
  ])].sort();
  if(paths.some(p=>!/^\/?(?:audio\/)?yo\/[a-zA-Z0-9/_.-]+\.mp3$/.test(p)||p.includes('..')))throw new Error('Unexpected registry path');
  return {groups,paths};
}
async function main(){
 const args=process.argv.slice(2);if(args.some(a=>!['--live'].includes(a)))throw new Error('Only --live is supported; default is offline.');
 const live=args.includes('--live'),out=resolve(process.env.YO_QA_DIR??'/tmp/yo-audio-audit');await mkdir(out,{recursive:true});
 const inventory=audioInventory();
 const summary=inventory.groups.map(g=>({group:g.name,total:g.rows.length,recordingPaths:g.rows.filter(r=>r.path).length,deviceVoiceOnly:g.rows.filter(r=>!r.path).length}));
 await writeFile(resolve(out,'inventory.json'),JSON.stringify({summary,...inventory},null,2));
 console.log(JSON.stringify({live,registryPaths:inventory.paths.length,summary}));
 type Result={path:string;ok:boolean;bytes?:number;durationSeconds?:number;sha256?:string;error?:string};
 const results:Result[]=[];let cursor=0;
 async function check(path:string):Promise<Result>{
  try{
   let data:Uint8Array,contentType='audio/mpeg';
   if(!live){if(!path.startsWith('/audio/yo/'))return {path,ok:false,error:'not-fetched-offline'};data=await readFile(resolve('public'+path));}
   else{
    const url=path.startsWith('/audio/yo/')?'https://www.pratiqo.ca'+path:'https://jwlbwmxoradmbuvqfkhe.supabase.co/storage/v1/object/public/yopratiqo-audio/'+path;
    const response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'error'});
    if(!response.ok)return {path,ok:false,error:`HTTP ${response.status}`};
    contentType=response.headers.get('content-type')??'';
    const reader=response.body?.getReader();if(!reader)throw new Error('empty body');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>5_000_000){await reader.cancel();throw new Error('oversized response');}chunks.push(value);}
    data=Buffer.concat(chunks);
   }
   const {durationSeconds}=validateMp3(data,contentType);
   return {path,ok:true,bytes:data.byteLength,durationSeconds,sha256:createHash('sha256').update(data).digest('hex')};
  }catch(error){return {path,ok:false,error:error instanceof Error?error.message:'verification failed'};}
 }
 await Promise.all(Array.from({length:6},async()=>{while(cursor<inventory.paths.length){const path=inventory.paths[cursor++];results.push(await check(path));}}));
 results.sort((a,b)=>a.path.localeCompare(b.path));
 const failures=results.filter(r=>!r.ok&&r.error!=='not-fetched-offline');
 const report={checkedAt:new Date().toISOString(),live,valid:results.filter(r=>r.ok).length,unverified:results.filter(r=>r.error==='not-fetched-offline').length,failures,results};
 await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({valid:report.valid,unverified:report.unverified,failures:failures.length}));
 if(failures.length)process.exitCode=1;
}
if(process.argv[1]?.endsWith('audit_yo_audio.ts'))void main().catch(e=>{console.error(e);process.exitCode=1;});
