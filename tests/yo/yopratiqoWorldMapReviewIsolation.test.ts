import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {seedReview} from '../../tools/world-map-review/fixtures';
import {GUIDED_PROGRESS_KEY} from '../../lib/yo/personalized/profile';
import {personalizedItalianCatalog} from '../../lib/yo/personalized/courseData';
import {parseCourseProgress} from '../../lib/yo/italian/course/courseProgress';
import {buildCourseJourney} from '../../lib/yo/courseJourney';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
function origin(url:string,marker=true) {
 const dom=new JSDOM(`<html><head>${marker?'<meta name="world-map-review-only" content="true">':''}</head></html>`,{url});
 for(const key of ['location','document','localStorage','sessionStorage']) Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});
 return dom;
}
for(const url of ['https://www.pratiqo.ca','https://pratiqo.ca','https://unrelated.example','http://preview.vercel.app']) {
 const dom=origin(url);localStorage.setItem('learner-progress','untouched');
 assert.throws(()=>seedReview('progress'),/isolated review origin/);
 assert.equal(localStorage.length,1);assert.equal(localStorage.getItem('learner-progress'),'untouched');dom.window.close();
}
console.log('PASS production and unrelated origins cannot seed demo progress');
const unmarked=origin('https://review.vercel.app',false);
assert.throws(()=>seedReview('progress'),/isolated review origin/);unmarked.window.close();
console.log('PASS hosted preview requires its standalone review marker');
for(const url of ['http://127.0.0.1:55730','https://world-map-review.vercel.app']) {
 const dom=origin(url);
 seedReview('progress');
 let journey=buildCourseJourney(personalizedItalianCatalog,parseCourseProgress(localStorage.getItem(GUIDED_PROGRESS_KEY),personalizedItalianCatalog));
 assert.equal(journey.steps.filter(s=>s.passed).length,2);
 assert.equal(journey.steps[2].unlocked,true);assert.equal(journey.steps[3].unlocked,false);
 seedReview('locked');
 journey=buildCourseJourney(personalizedItalianCatalog,parseCourseProgress(localStorage.getItem(GUIDED_PROGRESS_KEY),personalizedItalianCatalog));
 assert.equal(journey.steps.filter(s=>s.passed).length,0);assert.equal(journey.steps[1].unlocked,false);
 assert.equal(sessionStorage.getItem('world-review-scenario'),'locked');
 seedReview('beginner');assert.equal(sessionStorage.getItem('world-review-scenario'),'beginner');
 dom.window.close();
}
console.log('PASS local/hosted fixtures use real progression rules and preserve locks');
