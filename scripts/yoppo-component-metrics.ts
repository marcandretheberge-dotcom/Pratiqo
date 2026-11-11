import fs from "node:fs";
import { YOPPO_COMPONENT_TOLERANCES } from "../lib/companion/yoppoRigContract";

export type ComponentName = keyof typeof YOPPO_COMPONENT_TOLERANCES;
export type Pixels = { data: Uint8Array; info: { width: number; height: number; channels: number } };
type ColorTest = (r: number, g: number, b: number, a: number) => boolean;
const cream: ColorTest = (r,g,b,a) => a>=120 && r>=175 && g>=155 && b>=130 && Math.max(r,g,b)-Math.min(r,g,b)<105;
const teal: ColorTest = (r,g,b,a) => a>=120 && g>=85 && b>=75 && g>r+28 && b>r+20;
const brown: ColorTest = (r,g,b,a) => a>=120 && r>=65 && r>g+18 && g>=25 && g<170 && b<135;
const ink: ColorTest = (r,g,b,a) => a>=120 && r<90 && g<105 && b<110;
const either = (a: ColorTest, b: ColorTest): ColorTest => (...args) => a(...args)||b(...args);
const classifiers: Record<ComponentName, ColorTest> = {
  headCream: cream, spikes: teal, earLeft: either(teal,ink), earRight: either(teal,ink),
  eyeLeft: either(teal,ink), eyeRight: either(teal,ink), torso: either(cream,teal),
  armLeft: either(cream,teal), armRight: either(cream,teal), footLeft: teal, footRight: teal,
  backpack: either(brown,teal), mouthInk: ink, chestEmblem: teal,
};
const config = JSON.parse(fs.readFileSync("scripts/yoppo-part-labels.json", "utf8")) as {
  colors: Record<string,string>; parents: Partial<Record<ComponentName,string[]>>;
};
const palette = Object.entries(config.colors).map(([name, hex]) => ({name, rgb:[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16))}));

export function measureRenderedComponents(render: Pixels, labels: Pixels) {
  if(render.info.channels!==4 || labels.info.channels!==4 || render.info.width!==labels.info.width || render.info.height!==labels.info.height) throw new Error("RGBA render/label dimensions differ");
  const names = Object.keys(classifiers) as ComponentName[];
  const acc = Object.fromEntries(names.map(name=>[name,{count:0,sx:0,sy:0,minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity}])) as Record<ComponentName,{count:number;sx:number;sy:number;minX:number;minY:number;maxX:number;maxY:number}>;
  let unassignedVisiblePixels=0;
  // The whole canvas is scanned. No canonical ROI, bounds, seam or mask clips a render.
  for(let y=0;y<render.info.height;y++) for(let x=0;x<render.info.width;x++) {
    const i=(y*render.info.width+x)*4;
    if(render.data[i+3]<120) continue;
    const owner=labels.data[i+3]>=120 ? palette.find(p=>p.rgb.every((value,channel)=>Math.abs(labels.data[i+channel]-value)<=2))?.name : undefined;
    if(!owner) { unassignedVisiblePixels++; continue; }
    for(const name of names) {
      if(!(config.parents[name]??[name]).includes(owner)) continue;
      if(!classifiers[name](render.data[i],render.data[i+1],render.data[i+2],render.data[i+3])) continue;
      const a=acc[name];a.count++;a.sx+=x;a.sy+=y;
      a.minX=Math.min(a.minX,x);a.minY=Math.min(a.minY,y);a.maxX=Math.max(a.maxX,x);a.maxY=Math.max(a.maxY,y);
    }
  }
  return {unassignedVisiblePixels, components:Object.fromEntries(names.map(name=>{
    const a=acc[name];
    return [name, a.count ? {pixelCount:a.count,bounds:{minX:a.minX,minY:a.minY,maxX:a.maxX,maxY:a.maxY,width:a.maxX-a.minX+1,height:a.maxY-a.minY+1},centroid:{x:a.sx/a.count,y:a.sy/a.count}} : null];
  })) as Record<ComponentName, {pixelCount:number;bounds:{minX:number;minY:number;maxX:number;maxY:number;width:number;height:number};centroid:{x:number;y:number}} | null>};
}
