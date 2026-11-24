import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import fs from "node:fs";
import {fieldMissions} from "../../lib/yo/scenarios/fieldMissions";
import {fresh,modes,progressFor} from "../../lib/yo/scenarios/practice";
import {sourceRecordings} from "../../tools/field-missions/sources";

test("the six new languages have separate progress and two different visits each",()=>{
  assert.deepEqual(fieldMissions.map(m=>m.targetLang).sort(),["de","en-CA","fr-CA","ja","pt-BR","zh-Hans"]);
  assert.equal(new Set(fieldMissions.map(m=>m.key)).size,6);
});
for(const m of fieldMissions)test(m.id+": real recordings, guided responses, independent recall",()=>{
  const {submit,ready,restore}=progressFor(m.visits);
  const provenance=JSON.parse(fs.readFileSync("tools/field-missions/recordings/sources.json","utf8")) as {mission:string;id:string;storagePath:string;sha256:string}[];
  for(const clip of sourceRecordings(m)){
    const local="public/audio/"+clip.storagePath;
    if(fs.existsSync(local))assert.ok(fs.statSync(local).size>500);
    else{
      const record=provenance.find(row=>row.mission===m.id&&row.id===clip.id);
      assert.equal(record?.storagePath,clip.storagePath);
      assert.equal(createHash("sha256").update(fs.readFileSync("tools/field-missions/recordings/"+m.id+"/"+clip.id+".mp3")).digest("hex"),record?.sha256);
    }
  }
  let s=fresh();const firstDay=Date.UTC(2026,10,23,17);
  assert.notEqual(m.visits.guided.guest,m.visits.tomorrow.guest);
  assert.deepEqual(submit(s,"tomorrow",m.visits.tomorrow.beats[0].answer,firstDay),s);
  for(const mode of modes){
    assert.ok(m.visits[mode].beats.some(b=>"clip" in b.prompt));
    for(const b of m.visits[mode].beats){
      if("clip" in b.prompt){const id=b.prompt.clip;assert.ok(m.lines.some(l=>l.id===id));}
      assert.equal(new Set(b.choices).size,3);assert.ok(b.choices.includes(b.answer));
      for(const lang of ["fr","en","es"] as const){assert.ok(b.task[lang]);assert.ok(b.hint[lang]);}
      const now=s.due??firstDay;
      const miss=submit(s,mode,b.choices.find(c=>c!==b.answer)!,now);
      assert.equal(miss[mode],s[mode]);
      s=restore(JSON.stringify(submit(miss,mode,b.answer,now)));
    }
    if(mode==="guided"){assert.equal(ready(s,s.due!-1),false);assert.equal(ready(s,s.due!),true);}
  }
  assert.equal(s.tomorrow,m.visits.tomorrow.beats.length);assert.equal(s.corrected,true);
});
