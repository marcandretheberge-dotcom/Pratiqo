import assert from "node:assert/strict";
import {test} from "node:test";
import {freshWallet,balance,order,fulfill,win,redeem,stage,covered,owned,quote,reverse,cheapest,untilYear} from "../../lib/yo/passPilot/wallet";
import {personalizedItalianUnits as units} from "../../lib/yo/personalized/courseData";
import {buildItalianTrivia} from "../../lib/yo/italian/trivia";
import {passedRound} from "../../lib/yo/passPilot/assessment";
import {railBeat} from "../../lib/yo/passPilot/rail";
const now=Date.UTC(2026,10,23);
test("twelve actual cities, one free module, eleven authored later checkpoints, one pilot boundary",()=>{
 assert.equal(units.length,12);assert.equal(units.slice(1).filter(u=>buildItalianTrivia(u).length===5).length,11);assert.ok(stage.includes(units[1].id));
 assert.ok(units[0].lessons.length===3&&units[0].quiz.questions.length===5&&buildItalianTrivia(units[0]).length===5);
});
test("halfway evidence is scored from actual selections (not a cosmetic medal)",()=>{
 const answers=buildItalianTrivia(units[1]).map(q=>({answer:q.correctOptionId,assisted:false}));
 assert.ok(passedRound("parma",answers));assert.equal(passedRound("parma",true),false);
 answers[1].assisted=true;assert.equal(passedRound("parma",answers),false);
});
test("access, mastery and wallet are independent in both orders",()=>{
 const w=freshWallet();assert.equal(balance(w),5);assert.throws(()=>redeem(w,stage,now));order(w,"italy","full",now);fulfill(w,"full",now);
 assert.ok(covered(w,now));assert.throws(()=>redeem(w,stage,now));win(w,stage);redeem(w,stage,now);assert.equal(balance(w),5);
 assert.equal(covered(w,untilYear(now,1)),false);
});
test("free grants, repeats, another language and other accounts do not generate upgrade credit",()=>{
 const w=freshWallet();for(let i=0;i<5;i++){const s="ja:"+i;win(w,s);redeem(w,s,now);redeem(w,s,now);}
 assert.equal(balance(w),0);assert.equal(balance(freshWallet()),5);assert.equal(quote(w,now).amount,1999);assert.equal(cheapest(w,1,now).amount,349);
});
function empty(){const w=freshWallet();w.units.forEach((u,i)=>u.used={stage:"free:"+i,at:now});return w;}
test("299/300 cent source allocations, credit only redeemed Italian units once; free and unused passes preserved",()=>{
 const w=empty();order(w,"explorer","pack",now);fulfill(w,"pack",now);fulfill(w,"pack",now);
 assert.deepEqual(w.units.slice(-3).map(u=>u.value),[300,300,299]);
 for(const s of ["it:1","it:2","it:3"]){win(w,s);redeem(w,s,now);}
 assert.equal(quote(w,now).amount,1100);order(w,"italy","full",now);fulfill(w,"full",now);assert.equal(quote(w,now).amount,1999);
 const mix=empty();order(mix,"explorer","p",now);fulfill(mix,"p",now);
 for(const s of ["it:a","es:a"]){win(mix,s);redeem(mix,s,now);}
 assert.equal(balance(mix),1);assert.equal(quote(mix,now).amount,1700);assert.equal(quote(mix,untilYear(now,1)+1).amount,1999);
});
test("a refund preserves learning but invalidates balance, access and unused upgrade value",()=>{
 const w=empty();order(w,"single","buy",now);fulfill(w,"buy",now);win(w,stage);redeem(w,stage,now);reverse(w,"buy");fulfill(w,"buy",now);
 assert.equal(owned(w,stage),false);assert.equal(quote(w,now).amount,1999);assert.ok(w.wins.includes(stage));assert.equal(balance(w),0);
});
test("one pending quote; duplicate client command cannot buy twice",()=>{
 const w=empty();const o=order(w,"single","one",now);assert.equal(order(w,"single","two",now),o);
 assert.throws(()=>order(w,"italy","other",now));fulfill(w,o.id,now);order(w,"single","one",now);assert.equal(w.orders.length,1);
 assert.equal(cheapest(w,1,now).amount,0);assert.equal(cheapest(w,11,now).amount,1999);assert.equal(cheapest(empty(),3,now).amount,899);
});
test("rail listening, recovery and transfer progress with interest but no changed criteria",()=>{
 for(const interest of ["travel","history","art"] as const)for(const attempt of [0,1]){
  const run={interest,step:0,attempt,mistakes:0};assert.match(railBeat(run)!.prompt,/Parme/);
  run.step=2;const b=railBeat(run)!;assert.equal(b.audio,"platform");assert.equal(b.options[b.answer],"Binario tre");
  run.step=4;assert.equal(railBeat(run),null);
 }
});
