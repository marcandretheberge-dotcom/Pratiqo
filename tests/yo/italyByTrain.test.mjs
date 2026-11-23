import assert from "node:assert/strict";
import test from "node:test";
import {createRequire} from "node:module";
const requireTs=createRequire(import.meta.url);
const {fresh,submit,trips,answer,eligible,restore}=requireTs("../../lib/yo/train/mission.ts");
const {nextMidnight}=requireTs("../../lib/yo/scenarios/nextDay.ts");
test("one unambiguous train and one changed platform per itinerary",()=>{
  for(const [mode,t] of Object.entries(trips)){
    const matches=t.board.filter(([time,city])=>time===t.time&&city===t.to);
    assert.equal(matches.length,1);assert.equal(matches[0][2],answer(mode,0));
    assert.notEqual(matches[0][3],t.changed);assert.ok(t.platforms.includes(matches[0][3]));
    assert.equal(t.platforms.filter(n=>n===t.changed).length,1);assert.equal(t.phrases.filter(p=>p===answer(mode,1)).length,1);
  }
  assert.equal(new Set(Object.values(trips).map(t=>t.changed)).size,3);
});
test("fresh next-day mission is locked; retries never erase evidence",()=>{
  let m=fresh();const now=new Date(2026,10,23,16).getTime();
  assert.equal(submit(m,"tomorrow",answer("tomorrow",0),now),m);
  for(let i=0;i<3;i++)m=submit(m,"guided",answer("guided",i),now);
  assert.deepEqual(restore(JSON.stringify(m)),m);
  assert.equal(eligible(m,m.due-1),false);assert.equal(eligible(m,m.due),true);
  let n=submit(m,"tomorrow","wrong",m.due);
  for(let i=0;i<3;i++)n=submit(n,"tomorrow",answer("tomorrow",i),m.due);
  assert.deepEqual(n.tomorrow,{step:3,missed:true});assert.equal(n.due,m.due);assert.equal(submit(n,"tomorrow","wrong",m.due),n);
  let first=m;for(let i=0;i<3;i++)first=submit(first,"tomorrow",answer("tomorrow",i),m.due);assert.equal(first.tomorrow.missed,false);
});
test("next day means local midnight, including 23 and 25 hour days",()=>{
  for(const [month,date] of [[2,8],[10,1],[11,31]]){
    const start=new Date(2026,month,date);assert.equal(nextMidnight(start.getTime()),new Date(2026,month,date+1).getTime());
  }
  assert.deepEqual(restore("{"),fresh());assert.deepEqual(restore(JSON.stringify({...fresh(),tomorrow:{step:3,missed:false}})),fresh());
});
