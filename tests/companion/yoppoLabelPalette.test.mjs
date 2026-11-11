import assert from "node:assert/strict";
import fs from "node:fs";
const config=JSON.parse(fs.readFileSync("scripts/yoppo-part-labels.json","utf8"));
const colors=Object.values(config.colors).map(hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
const matches=(a,b)=>a.every((v,c)=>Math.abs(v-b[c])<=2);
// The original diagnostic palette's head/ear midpoint impersonated the left eye.
const oldHead=[230,25,75],oldEar=[255,225,25],oldEye=[245,130,49];
assert.equal(Array.from({length:255},(_,i)=>oldHead.map((v,c)=>Math.round(v*(1-i/255)+oldEar[c]*i/255))).some(p=>matches(p,oldEye)),true);
const toLinear=v=>v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4;
const toSrgb=v=>Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055));
// A separating plane also rejects mixtures of three or more other IDs in encoded space.
for(const [i,p] of colors.entries()) {
  const normal=p.map(v=>v-127);
  const dot=q=>q.reduce((sum,v,c)=>sum+v*normal[c],0);
  const gap=dot(p)-Math.max(...colors.filter((_,j)=>j!==i).map(dot));
  assert.ok(gap>2*normal.reduce((sum,v)=>sum+Math.abs(v),0),`Palette ${i} is not separated from all other IDs`);
}
let mixtures=0;
for(let a=0;a<colors.length;a++) for(let b=a+1;b<colors.length;b++) for(let t=1;t<255;t++) {
  const encoded=colors[a].map((v,c)=>Math.round(v*(1-t/255)+colors[b][c]*t/255));
  const linear=colors[a].map((v,c)=>toSrgb(toLinear(v)*(1-t/255)+toLinear(colors[b][c])*t/255));
  for(let k=0;k<colors.length;k++) if(k!==a&&k!==b) {
    assert.equal(matches(encoded,colors[k]),false,`Encoded blend ${a}/${b} impersonates ${k}`);
    assert.equal(matches(linear,colors[k]),false,`Linear blend ${a}/${b} impersonates ${k}`);
  }
  mixtures+=2;
}
console.log(`Yoppo diagnostic palette: ${mixtures} edge mixtures cannot impersonate a third part: PASS`);
