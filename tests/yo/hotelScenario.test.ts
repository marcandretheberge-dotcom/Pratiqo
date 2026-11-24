import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import test from "node:test";
import {fresh,restore,ready,submit,line,lines,visits,modes,type State} from "../../lib/yo/scenarios/checkIn";

test("authored reception tasks each have one valid answer and only registered recordings",()=>{
  for(const mode of modes)for(const beat of visits[mode].beats){
    assert.equal(new Set(beat.choices).size,3);assert.equal(beat.choices.filter(v=>v===beat.answer).length,1);
    for(const lang of ["fr","en","es"] as const){assert.ok(beat.task[lang]);assert.ok(beat.hint[lang]);}
    if("clip"in beat.prompt)assert.ok(line(beat.prompt.clip).speechText);
  }
  for(const l of lines)assert.ok(existsSync("public"+l.audioSrc));
  assert.notEqual(visits.tomorrow.guest,visits.guided.guest);
  assert.ok(visits.guided.beats.some(b=>b.answer===line("hotel-repeat").target));
  assert.equal(visits.tomorrow.beats.at(-1)?.answer,"402");
});
test("no premature recall; wrong answers retry, correction persists and completion is idempotent",()=>{
  const now=new Date(2026,10,23,23,55).getTime();let s=fresh();
  assert.equal(submit(s,"tomorrow",visits.tomorrow.beats[0].answer,now),s);
  for(const beat of visits.guided.beats){const before=s;s=submit(s,"guided","not offered",now);assert.equal(s,before);s=restore(JSON.stringify(submit(s,"guided",beat.answer,now)));}
  assert.equal(ready(s,s.due!-1),false);assert.equal(ready(s,s.due!),true);
  const again=submit(s,"guided","204",now);assert.equal(again,s);
  const due=s.due!;s=submit(s,"tomorrow",visits.tomorrow.beats[0].choices[0],due);
  assert.equal(s.tomorrow,0);assert.equal(s.corrected,true);
  for(const beat of visits.tomorrow.beats)s=restore(JSON.stringify(submit(s,"tomorrow",beat.answer,due)));
  assert.equal(s.tomorrow,visits.tomorrow.beats.length);assert.equal(s.corrected,true);assert.equal(s.due,due);
});
test("corrupt data is not treated as completed work",()=>{
  for(const bad of ["{",JSON.stringify({...fresh(),tomorrow:1}),JSON.stringify({...fresh(),guided:99}),JSON.stringify({...fresh(),corrected:true} satisfies State)])assert.deepEqual(restore(bad),fresh());
});
