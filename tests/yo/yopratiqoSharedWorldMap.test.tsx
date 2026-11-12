import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import React from 'react';
import { introCourses } from '@/lib/yo/shared/course';
import { freshIntro } from '@/lib/yo/shared/state';
import { adventureWorld } from '@/lib/yo/adventure';
import { introMap, journeyMap, mapProgressRevision, parseMapBookmark } from '@/lib/yo/worldMap';
import { buildCourseJourney } from '@/lib/yo/courseJourney';
import { emptyCourseProgress } from '@/lib/yo/italian/course/courseProgress';
import { germanCatalog } from '@/lib/yo/german/courseData';
import { portugueseCatalog } from '@/lib/yo/portuguese/courseData';
import { WorldJourneyMap } from '@/components/yo/journey/map/WorldJourneyMap';
import { worldRoads } from '@/components/yo/journey/map/worldRoads';
import { roadPoint, roadRoute } from '@/components/yo/journey/map/roadGeometry';
const require=createRequire(path.join(process.cwd(),'package.json'));
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><body/>',{url:'http://localhost:55730',pretendToBeVisual:true});
for(const key of ['window','document','navigator','HTMLElement','Element','Event','MouseEvent','sessionStorage','localStorage']) Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?dom.window:dom.window[key]});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const {render,cleanup,fireEvent}=require('@testing-library/react') as typeof import('@testing-library/react');
let checks=0;
function test(name:string,run:()=>void){cleanup();sessionStorage.clear();run();checks++;console.log('PASS '+name);}
test('all seven real introductions preserve their mission IDs, order and eligibility',()=>{
 for(const c of introCourses){
  const state=freshIntro(c), before=JSON.stringify(state), m=introMap(c,state,adventureWorld(c.slug));
  assert.deepEqual(m.destinations.slice(0,3).map(d=>d.id),c.missions.map(m=>m.id));
  assert.deepEqual(m.destinations.slice(0,3).map(d=>d.accessible),[true,false,false]);
  assert.equal(JSON.stringify(state),before);
  assert.equal(m.destinations[3].id,'intro-final');assert.equal(m.destinations[3].accessible,true);
  if(c.slug==='espagnol') assert.equal(m.destinations.length,10);else assert.equal(m.destinations.length,4);
 }
});
test('intro placement and completed practice are not invented mastery',()=>{
 const c=introCourses[0],s=freshIntro(c);s.profile={entry:2,experience:'some',goal:'travel',minutes:30};
 let m=introMap(c,s,'english');assert.ok(m.destinations.every(d=>d.accessible));assert.ok(m.destinations.every(d=>d.state==='available'));
 s.completed=c.missions[0].practice.map(e=>e.id);m=introMap(c,s,'english');assert.equal(m.destinations[0].state,'completed');assert.ok(!m.destinations.some(d=>d.state==='mastered'));
});
test('both assessed course adapters preserve the existing unlock engine',()=>{
 for(const catalog of [germanCatalog,portugueseCatalog]){
  const j=buildCourseJourney(catalog,emptyCourseProgress()),m=journeyMap(j,'german','test-course');
  assert.equal(m.destinations.length,catalog.units.length);
  assert.deepEqual(m.destinations.map(d=>d.accessible),j.steps.map(s=>s.unlocked));
 }
});
test('every shared road has reversible samples on the visible cubic, including fractional retargeting',()=>{
 for(const road of Object.values(worldRoads)){
  for(let i=0;i<3;i++) assert.deepEqual(roadPoint(i,road),road.segments[i][0]);
  assert.deepEqual(roadPoint(3,road),road.segments.at(-1)![3]);
  assert.deepEqual(roadRoute(0,3,road).toReversed(),roadRoute(3,0,road));
  assert.deepEqual(roadRoute(1.42,0,road)[0],roadPoint(1.42,road));
 }
});
const c=introCourses[0],state=freshIntro(c);
state.completed=c.missions[0].practice.map(e=>e.id);
const model=introMap(c,state,'english');
test('city selection moves only the visual destination; one Continue opens the selected mission',()=>{
 const before=JSON.stringify(state);let opened='';
 const view=render(<WorldJourneyMap model={model} locale="en" onContinue={id=>opened=id}/>);
 const map=view.container.querySelector('[data-shared-world-map]')!;
 const traveler=view.container.querySelector('[data-yoppo-traveler]')!;
 fireEvent.click(view.container.querySelectorAll('.yo-shared-destinations button')[0]);
 assert.equal(opened,'');assert.equal(map.getAttribute('data-canonical-guide'),model.guideId);
 assert.equal(map.getAttribute('data-selected-destination'),c.missions[0].id);
 assert.equal(traveler,view.container.querySelector('[data-yoppo-traveler]'),'traveler must not remount');
 assert.equal(traveler.getAttribute('data-destination-index'),'0');
 assert.equal(view.getAllByRole('button',{name:'Continue'}).length,1);
 fireEvent.click(view.getByRole('button',{name:'Continue'}));assert.equal(opened,c.missions[0].id);
 fireEvent.click(view.container.querySelectorAll('.yo-shared-destinations button')[2]);
 assert.equal(map.getAttribute('data-selected-destination'),c.missions[0].id);
 assert.equal(JSON.stringify(state),before);assert.equal(localStorage.length,0);
});
test('fractional bookmark survives a mission return and canonical resume change, but not new completion',()=>{
 const bookmark={revision:mapProgressRevision(model),destinationId:model.destinations[0].id,chapter:0,position:.42};
 const resumed={...model,guideId:model.destinations[0].id};
 assert.deepEqual(parseMapBookmark(JSON.stringify(bookmark),resumed),bookmark);
 sessionStorage.setItem('yo.map-view.v1.'+model.id,JSON.stringify(bookmark));
 const view=render(<WorldJourneyMap model={resumed} locale="en" active={false}/>);
 const traveler=view.container.querySelector<HTMLElement>('[data-yoppo-traveler]')!;
 assert.equal(traveler.style.left,`${roadPoint(.42,worldRoads.english)[0]/480*100}%`);
 const completed={...model,destinations:model.destinations.map((d,i)=>i===1?{...d,state:'completed' as const}:d)};
 assert.equal(parseMapBookmark(JSON.stringify(bookmark),completed),null);
 for(const invalid of [{...bookmark,position:Infinity},{...bookmark,chapter:99},{...bookmark,destinationId:model.destinations[2].id}]) assert.equal(parseMapBookmark(JSON.stringify(invalid),model),null);
});
test('a new earned completion advances the visible traveler; browsing never awards it',()=>{
 const view=render(<WorldJourneyMap model={model} locale="en"/>);
 fireEvent.click(view.container.querySelectorAll('.yo-shared-destinations button')[0]);
 const next={...model,guideId:model.destinations[2].id,destinations:model.destinations.map((d,i)=>({...d,accessible:true,state:i<2?'completed' as const:'available' as const}))};
 view.rerender(<WorldJourneyMap model={next} locale="en"/>);
 assert.equal(view.container.querySelector('[data-yoppo-traveler]')!.getAttribute('data-destination-index'),'2');
});
test('course hydration cannot discard a saved traveler position using an empty progress snapshot',()=>{
 const bookmark={revision:mapProgressRevision(model),destinationId:model.destinations[0].id,chapter:0,position:.42};
 sessionStorage.setItem('yo.map-view.v1.'+model.id,JSON.stringify(bookmark));
 const empty=introMap(c,freshIntro(c),'english');
 const view=render(<WorldJourneyMap model={empty} locale="en" ready={false}/>);
 view.rerender(<WorldJourneyMap model={model} locale="en" ready active={false}/>);
 assert.equal(view.container.querySelector<HTMLElement>('[data-yoppo-traveler]')!.style.left,`${roadPoint(.42,worldRoads.english)[0]/480*100}%`);
 assert.equal(view.container.querySelector('[data-shared-world-map]')!.getAttribute('data-selected-destination'),model.destinations[0].id);
});
cleanup();dom.window.close();console.log(`${checks} shared map regression groups passed`);
