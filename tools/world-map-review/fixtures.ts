import { introCourses } from "../../lib/yo/shared/course";
import { freshIntro, introKey } from "../../lib/yo/shared/state";
import { courseSteps } from "../../lib/yo/shared/steps";
import { emptyCourseProgress, recordCourseAssessment } from "../../lib/yo/italian/course/courseProgress";
import { germanCatalog } from "../../lib/yo/german/courseData";
import { portugueseCatalog } from "../../lib/yo/portuguese/courseData";
import { GERMAN_PROGRESS_KEY } from "../../lib/yo/german/courseLogic";
import { PORTUGUESE_PROGRESS_KEY } from "../../lib/yo/portuguese/courseLogic";
import { emptyJapaneseProgress, JAPANESE_PROGRESS_KEY } from "../../lib/yo/japaneseCourseProgress";
import { emptyProgress, MANDARIN_PROGRESS_KEY } from "../../lib/yo/mandarin/progress";
import { japaneseJourneyUnits, mandarinJourneyUnits } from "../../lib/yo/foundationJourneyCatalogs";
import { GUIDED_PROGRESS_KEY } from "../../lib/yo/personalized/profile";
import { personalizedItalianCatalog } from "../../lib/yo/personalized/courseData";

/** Only bundled into the standalone review, never imported by application code. */
export type ReviewScenario = 'beginner' | 'progress' | 'locked';
export function seedReview(scenario: ReviewScenario) {
  const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
  const preview = location.protocol === 'https:' && location.hostname.endsWith('.vercel.app')
    && document.querySelector('meta[name="world-map-review-only"]')?.getAttribute('content') === 'true';
  if (!local && !preview) throw new Error('Review fixtures require the isolated review origin');
  const advanced = scenario === 'progress';
  for(const key of Object.keys(localStorage)) if(key.startsWith('yo.italian.guided.v2.')) localStorage.removeItem(key);
  for (const c of introCourses) {
    const s = freshIntro(c);
    s.profile = { experience: advanced ? 'some' : 'new', goal: 'travel', minutes: 30, entry: 0 };
    if (advanced) {
      s.completed = c.missions.slice(0,2).flatMap(m=>m.practice.map(e=>e.id));
      s.visited = courseSteps(c).filter(x=>x.mission<2).map(x=>x.id);
      s.step = courseSteps(c).findIndex(x=>x.mission===2); s.resume='lesson';
    }
    localStorage.setItem(introKey(c.language), JSON.stringify(s));
  }
  for (const [catalog,key] of [[germanCatalog,GERMAN_PROGRESS_KEY],[portugueseCatalog,PORTUGUESE_PROGRESS_KEY]] as const) {
    let p=emptyCourseProgress();
    if (advanced) for (const u of catalog.units.slice(0,2)) {
      const total=catalog.assessments.find(a=>a.id===u.quizId)!.questionCount;
      p=recordCourseAssessment(p,catalog,u.quizId,total,total,false);
    }
    localStorage.setItem(key,JSON.stringify(p));
  }
  const jp=emptyJapaneseProgress(), zh=emptyProgress();
  if(advanced) {
    for(const u of japaneseJourneyUnits.slice(0,2)) for(const id of u.activityIds) jp.results[id]={passed:true,independent:true,attempts:1,needsReview:false};
    for(const u of mandarinJourneyUnits.slice(0,2)) for(const id of u.activityIds) zh.results[id]={passed:true,independent:true,attempts:1,review:false};
  }
  localStorage.setItem(JAPANESE_PROGRESS_KEY,JSON.stringify(jp));
  localStorage.setItem(MANDARIN_PROGRESS_KEY,JSON.stringify(zh));
  let italian=emptyCourseProgress();
  if(advanced) for(const u of personalizedItalianCatalog.units.slice(0,2)) {
    const total=personalizedItalianCatalog.assessments.find(a=>a.id===u.quizId)!.questionCount;
    italian=recordCourseAssessment(italian,personalizedItalianCatalog,u.quizId,total,total,false);
  }
  localStorage.setItem(GUIDED_PROGRESS_KEY,JSON.stringify(italian));
  for(const key of Object.keys(sessionStorage)) if(key.startsWith('yo.map-view.') || key.startsWith('yo.it.')) sessionStorage.removeItem(key);
  sessionStorage.setItem('world-review-scenario', scenario);
}
