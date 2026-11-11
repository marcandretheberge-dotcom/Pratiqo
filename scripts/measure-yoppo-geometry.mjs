import fs from "node:fs";
import sharp from "sharp";

const source = "public/companion/travel/companion-travel-idle.png";
const output = process.argv[2] ?? "/tmp/yoppo-canonical-geometry.json";
const transform = { scale: 1.86, x: 47, y: 78 };

const image = sharp(source).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const i = (y * info.width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
};

const visible = p => p.a >= 48;
const cream = p => p.a >= 120 && p.r >= 175 && p.g >= 155 && p.b >= 130 && Math.max(p.r,p.g,p.b)-Math.min(p.r,p.g,p.b) < 105;
const teal = p => p.a >= 120 && p.g >= 85 && p.b >= 75 && p.g > p.r + 28 && p.b > p.r + 20;
const brown = p => p.a >= 120 && p.r >= 65 && p.r > p.g + 18 && p.g >= 25 && p.g < 170 && p.b < 135;
const ink = p => p.a >= 120 && p.r < 90 && p.g < 105 && p.b < 110;
const creamOrTeal = p => cream(p) || teal(p);
const backpack = p => brown(p) || teal(p);

const regions = {
  headCream:   { box:{x:145,y:110,w:230,h:175}, test:cream, minPixels:2500 },
  spikes:      { box:{x:135,y:30,w:270,h:135},  test:teal, minPixels:1200 },
  earLeft:     { box:{x:125,y:90,w:95,h:125},   test:p=>teal(p)||ink(p), minPixels:250 },
  earRight:    { box:{x:320,y:95,w:100,h:130},  test:p=>teal(p)||ink(p), minPixels:250 },
  eyeLeft:     { box:{x:155,y:155,w:90,h:95},   test:p=>teal(p)||ink(p), minPixels:500 },
  eyeRight:    { box:{x:250,y:155,w:95,h:100},  test:p=>teal(p)||ink(p), minPixels:500 },
  torso:       { box:{x:145,y:240,w:225,h:185}, test:creamOrTeal, minPixels:3000 },
  armLeft:     { box:{x:110,y:260,w:105,h:150}, test:creamOrTeal, minPixels:800 },
  armRight:    { box:{x:300,y:255,w:115,h:155}, test:creamOrTeal, minPixels:800 },
  footLeft:    { box:{x:145,y:385,w:120,h:75},  test:teal, minPixels:500 },
  footRight:   { box:{x:240,y:385,w:125,h:75},  test:teal, minPixels:500 },
  backpack:    { box:{x:295,y:205,w:150,h:230}, test:backpack, minPixels:1800 },
  mouthInk:    { box:{x:200,y:210,w:100,h:70},  test:ink, minPixels:100 },
  chestEmblem: { box:{x:195,y:285,w:115,h:90},  test:teal, minPixels:100 },
};

function measure(name, spec) {
  const {box,test,minPixels}=spec;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,count=0,sumX=0,sumY=0;
  const edge={left:false,right:false,top:false,bottom:false};
  for(let y=box.y;y<Math.min(info.height,box.y+box.h);y++){
    for(let x=box.x;x<Math.min(info.width,box.x+box.w);x++){
      const p=px(x,y);
      if(!visible(p)||!test(p)) continue;
      count++; sumX+=x; sumY+=y;
      minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
      if(x<=box.x+1) edge.left=true;
      if(x>=box.x+box.w-2) edge.right=true;
      if(y<=box.y+1) edge.top=true;
      if(y>=box.y+box.h-2) edge.bottom=true;
    }
  }
  if(count<minPixels) throw new Error(`${name}: only ${count} classified pixels (min ${minPixels})`);
  const sourceBounds={minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1};
  const centroid={x:sumX/count,y:sumY/count};
  const toArt=(v,axis)=>Number((v*transform.scale+(axis==="x"?transform.x:transform.y)).toFixed(2));
  return {
    roi:box,
    pixelCount:count,
    touchesRoiEdge:edge,
    sourceBounds,
    sourceCentroid:{x:Number(centroid.x.toFixed(2)),y:Number(centroid.y.toFixed(2))},
    artboardBounds:{
      minX:toArt(minX,"x"),minY:toArt(minY,"y"),
      maxX:toArt(maxX,"x"),maxY:toArt(maxY,"y"),
      width:Number((sourceBounds.width*transform.scale).toFixed(2)),
      height:Number((sourceBounds.height*transform.scale).toFixed(2)),
    },
    artboardCentroid:{x:toArt(centroid.x,"x"),y:toArt(centroid.y,"y")},
  };
}

const measured=Object.fromEntries(Object.entries(regions).map(([name,spec])=>[name,measure(name,spec)]));
const result={
  source,
  sourceSize:{width:info.width,height:info.height},
  transform,
  method:"fixed-roi + alpha/color classification; no geometry value is hand-entered",
  rule:"a feature touching an ROI edge must have its ROI widened before its measurement may drive RML geometry",
  regions:measured,
};
fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n");
console.log("YOPPO_GEOMETRY_AUDIT="+JSON.stringify(result));
