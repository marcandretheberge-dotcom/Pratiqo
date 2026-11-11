import assert from "node:assert/strict";
import { companionRoute } from "../../components/yo/italian/guided/ItalianMapCompanion";
import { italianRoadPoint, ITALIAN_ILLUSTRATED_ROAD_PATH } from "../../components/yo/italian/guided/ItalianAdventurePathGeometry";
import { ItalianMapAmbience } from "../../lib/yo/italian/mapAmbience";
const forward=companionRoute(0,3),reverse=companionRoute(3,0);
assert.deepEqual(forward[0],[120,150]);assert.deepEqual(forward.at(-1),[350,516]);
assert.deepEqual(reverse,[...forward].reverse());
assert.ok(forward.every(([x,y])=>x>=0&&x<=480&&y>=0&&y<=600));
assert.equal(ITALIAN_ILLUSTRATED_ROAD_PATH,"M120 150 C120 210 390 190 350 270 C310 350 110 300 130 396 C150 492 385 440 350 516");
assert.deepEqual(italianRoadPoint(1),[350,270]);
assert.deepEqual(italianRoadPoint(2),[130,396]);
assert.deepEqual(italianRoadPoint(1.5),[217.5,327],"SVG S uses the reflected control, not the old companion's separate curve");
assert.deepEqual(companionRoute(1.63,1)[0],italianRoadPoint(1.63),"retarget begins at the current fractional position");
assert.deepEqual(companionRoute(1,1),[[350,270],[350,270]],"current city is stationary");
let stopped=0,closed=0,level=0;
class Context {
 sampleRate=100;currentTime=0;state="running";destination={};
 createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)}}
 createBufferSource(){return {buffer:null,loop:false,connect(){},start(){},stop(){stopped++},disconnect(){}}}
 createBiquadFilter(){return {type:"lowpass",frequency:{value:0},connect(){}}}
 createGain(){return {gain:{value:0,setTargetAtTime(v:number){level=v}},connect(){}}}
 async resume(){} async close(){closed++}
}
Object.defineProperty(globalThis,"window",{value:{AudioContext:Context},configurable:true});
async function main(){
 const ambience=new ItalianMapAmbience();
 assert.equal(level,0,"nothing plays at construction");
 assert.equal(await ambience.start(),true);
 ambience.setAudible(true);assert.equal(level,.22);
 ambience.setAudible(false);assert.equal(level,0,"lessons/hidden pages can silence it");
 ambience.dispose();assert.equal(stopped,1);assert.equal(closed,1);
 assert.equal(await ambience.start(),false,"disposed audio never restarts");
 console.log("Map route and ambience lifecycle: PASS");
}
void main();
