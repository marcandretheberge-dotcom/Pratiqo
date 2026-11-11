import assert from "node:assert/strict";
import { reviewIteration } from "../../scripts/yoppo-iteration-policy.mjs";

const part=(pass,centroidDistancePx)=>({pass,centroidDistancePx,widthRelError:0,heightRelError:0,rendered:{},tolerance:{centroidMaxPx:16,widthRelMax:.1,heightRelMax:.1}});
const before={components:{mouthInk:part(false,30),headCream:part(true,10)},silhouetteIoU:.85,overlapRgbMae:30,groundContactDeltaPx:5,centroidDistancePx:10};
const improved=()=>({...structuredClone(before),components:{mouthInk:part(true,8),headCream:part(true,10)}});
assert.equal(reviewIteration(before,improved(),"mouth").keep,true);
assert.equal(reviewIteration(before,before,"mouth").keep,false);
for(const [property,delta] of [["centroidDistancePx",2.001],["widthRelError",.02001],["heightRelError",.02001]]) {
  const after=improved();after.components.headCream[property]+=delta;
  assert.equal(reviewIteration(before,after,"mouth").keep,false,property);
}
for(const [property,delta] of [["silhouetteIoU",-.00501],["overlapRgbMae",2.001],["groundContactDeltaPx",2.001],["centroidDistancePx",2.001]]) {
  const after=improved();after[property]+=delta;
  assert.equal(reviewIteration(before,after,"mouth").keep,false,property);
}
const boundary=improved();boundary.silhouetteIoU-=.005;boundary.overlapRgbMae+=2;boundary.groundContactDeltaPx+=2;boundary.centroidDistancePx+=2;boundary.components.headCream.centroidDistancePx+=2;boundary.components.headCream.widthRelError+=.02;boundary.components.headCream.heightRelError+=.02;
assert.equal(reviewIteration(before,boundary,"mouth").keep,true,"Exact allowed boundaries");
const lost=improved();lost.components.headCream.pass=false;
assert.equal(reviewIteration(before,lost,"mouth").keep,false,"Never regress a passing component");
assert.equal(reviewIteration(before,null,"mouth").keep,false);
assert.throws(()=>reviewIteration(before,before,"unknown"));
console.log("Yoppo iteration keep/revert rules: PASS");
