import fs from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { frozenFiles, hash, manifestPath } from "./check-yoppo-freeze.mjs";
import { YOPPO_OVERLAY_ACCEPTANCE, YOPPO_COMPONENT_TOLERANCES } from "../lib/companion/yoppoRigContract";
const rive=process.env.RIVE_CLI;
if(!rive) throw new Error("Set the local RIVE_CLI executable path");
const version=execFileSync(rive,["--version"],{encoding:"utf8"}).trim();
if(version!=="rive 1.9.2") throw new Error("Rive CLI must be 1.9.2");
if(process.version!=="v22.23.4") throw new Error("Node must be 22.23.4");
const freezeCommit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const files=Object.fromEntries(frozenFiles.map((file:string)=>{
  const current=hash(fs.readFileSync(file));
  if(hash(execFileSync("git",["show",`${freezeCommit}:${file}`]))!==current) throw new Error("Commit methodology before creating its manifest: "+file);
  return [file,current];
}));
fs.writeFileSync(manifestPath,JSON.stringify({
  cycle:4,invalidatedCycle:{freezeCommit:"65eebd83c5a9d83dc93086f6d648ec52c44b9a1d",report:"CYCLE_1_INVALIDATED.md",capturesStillCounted:2},
  supersededBeforeMasterRender:{freezeCommit:"2719e4ffdf44ac1659beb468cbd4d7cd588f27b9",priorManifest:"freeze-cycle-3-superseded.json",reason:"Check actual Linux shared-library loading before network installation; retain signed repositories, fail closed and keep the genuine alpha preflight. No master capture in cycle 3."},
  freezeCommit,createdAtUtc:new Date().toISOString(),branch:"feat/yoppo-rive-pilot-20261110",
  expectedStartingHead:"f5e38c21c290ea8612a524edb56e404f5944e050",resumedHead:"c9e7dd0628f2474abf8a309f31581fdd3e73e47e",
  files,globalThresholds:YOPPO_OVERLAY_ACCEPTANCE,componentThresholds:YOPPO_COMPONENT_TOLERANCES,
  tooling:{rive:version,renderer:"not reported separately",node:process.version,sharp:sharp.versions,os:process.platform},
  imagePolicy:{colorSpace:"sRGB",alpha:"straight; global silhouette >=32, component original colors >=120, global RGB overlap both >=180",resampling:"Lanczos3",transform:{scale:1.86,x:47,y:78},labelPolicy:"actual Rive named-shape label pass; whole-canvas color/alpha classification, no reference clipping; label colors within 2/channel, edge ambiguity reported"},
  approval:"reference-segmentation-approval.json",fullMasterCaptureLimit:15,
  accounting:"Count BOTH normal and diagnostic full-canvas captures against the 15 limit, including CI. Reserve two captures for CI.",
  reviewStatus:"VISUAL REVIEW PENDING HUMAN REVIEW",
},null,2)+"\n");
console.log(`Freeze manifest created for ${freezeCommit}`);
