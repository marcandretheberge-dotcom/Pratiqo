import assert from "node:assert/strict";

export function inspectCaptureAlpha(image: {data: Uint8Array;info: {width:number;height:number;channels:number}}) {
  const {data,info}=image;
  assert.equal(info.channels,4,"Capture must provide RGBA pixels");
  assert.equal(data.length,info.width*info.height*4,"Capture pixel dimensions mismatch");
  let alphaMin=255,alphaMax=0,transparentPixels=0;
  for(let i=3;i<data.length;i+=4) {
    alphaMin=Math.min(alphaMin,data[i]);alphaMax=Math.max(alphaMax,data[i]);
    if(data[i]===0) transparentPixels++;
  }
  const corners=[0,info.width-1,(info.height-1)*info.width,info.height*info.width-1].map(p=>Array.from(data.slice(p*4,p*4+4)));
  return {width:info.width,height:info.height,alphaMin,alphaMax,transparentPixels,corners};
}

export function requireTransparentRiveCapture(image: Parameters<typeof inspectCaptureAlpha>[0]) {
  const alpha=inspectCaptureAlpha(image);
  assert.ok(alpha.transparentPixels>0&&alpha.corners.every(pixel=>pixel[3]===0),"RIVE/MEASUREMENT BLOCK: capture lacks the required transparent canvas; no comparison is valid");
  assert.ok(alpha.alphaMax>=180,"Rive capture has no opaque artwork");
  return alpha;
}
