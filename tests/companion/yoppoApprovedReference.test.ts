import assert from "node:assert/strict";
import fs from "node:fs";
import { measureRenderedComponents, type Pixels } from "../../scripts/yoppo-component-metrics";
import { YOPPO_COMPONENT_TOLERANCES, YOPPO_OVERLAY_ACCEPTANCE } from "../../lib/companion/yoppoRigContract";

const config=JSON.parse(fs.readFileSync("scripts/yoppo-part-labels.json","utf8"));
const palette=(name:string)=>config.colors[name].match(/../g).map((hex:string)=>parseInt(hex,16));
function fixture(x:number,width:number,alpha=255) {
  const render:Pixels={data:new Uint8Array(1000*30*4),info:{width:1000,height:30,channels:4}};
  const labels:Pixels={data:new Uint8Array(1000*30*4),info:{width:1000,height:30,channels:4}};
  for(let y=5;y<15;y++) for(let px=x;px<x+width;px++) {
    const i=(y*1000+px)*4;
    render.data.set([3,22,25,alpha],i);
    labels.data.set([...palette("eyeLeft"),255],i);
  }
  return {render,labels};
}
const initial=fixture(200,40);
const a=measureRenderedComponents(initial.render,initial.labels).components.eyeLeft!;
const shifted=fixture(700,40);
const b=measureRenderedComponents(shifted.render,shifted.labels).components.eyeLeft!;
assert.equal(b.centroid.x-a.centroid.x,500,"a shifted feature must not vanish outside the reference ROI");
const enlarged=fixture(100,800);
const c=measureRenderedComponents(enlarged.render,enlarged.labels).components.eyeLeft!;
assert.equal(c.bounds.width,800,"oversized geometry must not be cropped to the reference");
assert.ok((c.bounds.width-a.bounds.width)/a.bounds.width>YOPPO_COMPONENT_TOLERANCES.eyeLeft.widthRelMax);
const faint=fixture(200,40,119);
assert.equal(measureRenderedComponents(faint.render,faint.labels).components.eyeLeft,null);
assert.equal(measureRenderedComponents(initial.render,initial.labels).components.eyeRight,null,"same-color neighbors must not leak across ownership");
assert.throws(()=>measureRenderedComponents(initial.render,{...initial.labels,info:{width:2,height:2,channels:4}}),/dimensions/);
assert.deepEqual(YOPPO_OVERLAY_ACCEPTANCE,{silhouetteIoUMin:0.80,centroidDistanceMaxPx:24,groundContactDeltaMaxPx:12,overlapRgbMaeMax:65});
assert.deepEqual(Object.values(YOPPO_COMPONENT_TOLERANCES).map(v=>[v.centroidMaxPx,v.widthRelMax,v.heightRelMax]),[
  [10,.08,.08],[12,.12,.12],[10,.12,.12],[10,.12,.12],[8,.08,.08],[8,.08,.08],[12,.10,.10],
  [12,.14,.12],[12,.14,.12],[10,.10,.10],[10,.10,.10],[12,.10,.10],[8,.15,.15],[10,.16,.16],
]);
console.log("Approved reference: independent whole-canvas ownership detects displacement/growth; alpha, separation and all frozen thresholds: PASS");
