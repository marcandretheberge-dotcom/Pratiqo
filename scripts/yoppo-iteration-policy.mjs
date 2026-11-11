const groups={head:["headCream"],eyes:["eyeLeft","eyeRight"],spikes:["spikes"],ears:["earLeft","earRight"],torso:["torso"],arms:["armLeft","armRight"],feet:["footLeft","footRight"],backpack:["backpack"],mouth:["mouthInk"],"chest-emblem":["chestEmblem"],"palette-edge":[]};
const score=c=>c.rendered ? c.centroidDistancePx/c.tolerance.centroidMaxPx+c.widthRelError/c.tolerance.widthRelMax+c.heightRelError/c.tolerance.heightRelMax : Infinity;
export function reviewIteration(before,after,category) {
  const reasons=[];
  const targets=groups[category];
  if(!targets) throw new Error("Unknown change category");
  if(!before||!after) return {keep:false,reasons:["Missing before/after metrics"]};
  const improved=targets.length ? targets.some(name=>!before.components[name].pass&&(after.components[name].pass||score(after.components[name])<score(before.components[name]))) : after.overlapRgbMae<before.overlapRgbMae;
  if(!improved) reasons.push("No targeted failing component improvement");
  for(const [name,b] of Object.entries(before.components)) {
    const a=after.components[name];
    if(b.pass&&!a.pass) reasons.push(`${name}: previously passing component now fails`);
    if(!targets.includes(name)&&b.rendered) {
      if(!a.rendered) reasons.push(`${name}: disappeared`);
      else {
        if(a.centroidDistancePx-b.centroidDistancePx>2+1e-9) reasons.push(`${name}: centroid worsened by >2px`);
        if(a.widthRelError-b.widthRelError>.02+1e-9) reasons.push(`${name}: width error worsened by >0.02`);
        if(a.heightRelError-b.heightRelError>.02+1e-9) reasons.push(`${name}: height error worsened by >0.02`);
      }
    }
  }
  if(before.silhouetteIoU-after.silhouetteIoU>.005+1e-9) reasons.push("Global IoU regressed by >0.005");
  if(after.overlapRgbMae-before.overlapRgbMae>2+1e-9) reasons.push("Global RGB MAE regressed by >2");
  if(after.groundContactDeltaPx-before.groundContactDeltaPx>2+1e-9) reasons.push("Ground error regressed by >2px");
  if(after.centroidDistancePx-before.centroidDistancePx>2+1e-9) reasons.push("Global centroid regressed by >2px");
  return {keep:reasons.length===0,reasons};
}
