import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadApprovedReference } from "./yoppo-reference-masks.mjs";

const source = "public/companion/travel/companion-travel-idle.png";
const output = process.argv[2] ?? "/tmp/yoppo-canonical-geometry.json";
const annotatedOutput = process.argv[3] ?? "/tmp/yoppo-canonical-geometry-annotated.png";
const transform = { scale: 1.86, x: 47, y: 78 };
const ROI_EXPAND_STEP = 12;
const ROI_MAX_EXPANSIONS = 3;

const image = sharp(source).toColourspace("srgb").ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
const reference = await loadApprovedReference();

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

function sampleBox(name, spec, box) {
  const { test, minPixels } = spec;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,count=0,sumX=0,sumY=0;
  const edge={left:false,right:false,top:false,bottom:false};

  for(let y=box.y;y<Math.min(info.height,box.y+box.h);y++){
    for(let x=box.x;x<Math.min(info.width,box.x+box.w);x++){
      const p=px(x,y);
      if(!reference.masks[name][y*info.width+x]||!visible(p)||!test(p)) continue;
      count++; sumX+=x; sumY+=y;
      minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
      if(x<=box.x+1) edge.left=true;
      if(x>=box.x+box.w-2) edge.right=true;
      if(y<=box.y+1) edge.top=true;
      if(y>=box.y+box.h-2) edge.bottom=true;
    }
  }
  return {minX,minY,maxX,maxY,count,sumX,sumY,edge,
    insufficientPixels: count<minPixels ? `${name}: only ${count} classified pixels (min ${minPixels})` : null};
}

function expandBox(box, edge) {
  const x=edge.left ? Math.max(0,box.x-ROI_EXPAND_STEP) : box.x;
  const y=edge.top ? Math.max(0,box.y-ROI_EXPAND_STEP) : box.y;
  const right=edge.right ? Math.min(info.width,box.x+box.w+ROI_EXPAND_STEP) : box.x+box.w;
  const bottom=edge.bottom ? Math.min(info.height,box.y+box.h+ROI_EXPAND_STEP) : box.y+box.h;
  return {x,y,w:right-x,h:bottom-y};
}

function measure(name, spec) {
  let box={...spec.box};
  const expansionHistory=[];
  const failures=[];
  let sampled;

  for(let attempt=0;attempt<=ROI_MAX_EXPANSIONS;attempt++){
    sampled=sampleBox(name,spec,box);
    if(sampled.insufficientPixels) {
      failures.push(sampled.insufficientPixels);
      break;
    }
    const touched=Object.entries(sampled.edge).filter(([,v])=>v).map(([k])=>k);
    if(!touched.length) break;
    if(attempt===ROI_MAX_EXPANSIONS) {
      failures.push(`${name}: still touches ROI edge after ${ROI_MAX_EXPANSIONS} deterministic expansions (${touched.join(",")})`);
      break;
    }
    const expanded=expandBox(box,sampled.edge);
    expansionHistory.push({
      reason:"measurement-touched-roi-edge",
      stepPx:ROI_EXPAND_STEP,
      touched,
      before:{...box},
      after:expanded,
      expansionNumber:attempt+1,
    });
    box=expanded;
  }

  const {minX,minY,maxX,maxY,count,sumX,sumY,edge}=sampled;
  if(!count) return {
    valid:false, failures, initialRoi:spec.box, roi:box,
    roiExpansionHistory:expansionHistory, pixelCount:0,
    touchesRoiEdge:edge, sourceBounds:null, sourceCentroid:null,
    artboardBounds:null, artboardCentroid:null,
  };
  const sourceBounds={minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1};
  const centroid={x:sumX/count,y:sumY/count};
  const toArt=(v,axis)=>Number((v*transform.scale+(axis==="x"?transform.x:transform.y)).toFixed(2));

  return {
    valid:failures.length===0,
    failures,
    initialRoi:spec.box,
    roi:box,
    roiExpansionHistory:expansionHistory,
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
const failures=Object.values(measured).flatMap(region=>region.failures);

const annotationColors=["#E63946","#457B9D","#2A9D8F","#F4A261","#8338EC","#FF006E","#3A86FF","#FB5607","#2B9348","#9D4EDD","#BC6C25","#0077B6","#D00000","#6A994E"];
const annotationSvg=`<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text{font-family:Arial,sans-serif;font-size:9px;font-weight:700;paint-order:stroke;stroke:white;stroke-width:2px;stroke-linejoin:round}
  </style>
  ${Object.entries(measured).map(([name,value],index)=>{
    const c=annotationColors[index%annotationColors.length];
    const r=value.roi,b=value.sourceBounds;
    if(!b) return `<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="${c}"/><text x="${r.x}" y="${r.y+10}">${name}: INVALID</text></g>`;
    return `<g>
      <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="4 3"/>
      <rect x="${b.minX}" y="${b.minY}" width="${b.width}" height="${b.height}" fill="none" stroke="${c}" stroke-width="2"/>
      <circle cx="${value.sourceCentroid.x}" cy="${value.sourceCentroid.y}" r="2.5" fill="${c}"/>
      <text x="${Math.max(2,b.minX)}" y="${Math.max(10,b.minY-3)}" fill="${c}">${name}${value.valid ? "" : ": INVALID"}</text>
    </g>`;
  }).join("")}
</svg>`;

const annotated=await sharp(source)
  .toColourspace("srgb")
  .composite([{input:Buffer.from(annotationSvg),top:0,left:0}])
  .png()
  .toBuffer();
fs.mkdirSync(path.dirname(annotatedOutput),{recursive:true});
fs.writeFileSync(annotatedOutput,annotated);

const result={
  schemaVersion:3,
  valid:failures.length===0,
  failures,
  classificationReview:"VISUAL REVIEW PENDING HUMAN REVIEW",
  source,
  sourceSize:{width:info.width,height:info.height},
  transform,
  method:"fixed-roi + user-approved reference ownership + unchanged alpha/color classification; bounds and centroids computed from pixels",
  approvedReference:reference.approval,
  rule:"a feature touching an ROI edge expands deterministically by 12px on each touched side, up to 3 times; ROIs are never shrunk or moved to improve a result",
  roiExpansion:{stepPx:ROI_EXPAND_STEP,maxExpansions:ROI_MAX_EXPANSIONS},
  annotatedOutput,
  regions:measured,
};

fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n");
console.log("YOPPO_GEOMETRY_AUDIT="+JSON.stringify(result));
if(failures.length) {
  console.error("Canonical geometry is invalid; no master render or comparison is permitted:\n"+failures.join("\n"));
  process.exitCode=1;
}
