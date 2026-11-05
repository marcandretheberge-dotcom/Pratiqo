import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { ItalianCourseUnit } from "@/components/yo/italian/course/ItalianCourseUnit";
import { ItalianRecallCards } from "@/components/yo/italian/course/ItalianStudyJourney";
import { ItalianCourseDashboard } from "@/components/yo/italian/course/ItalianCourseDashboard";
import { CourseAssessmentPlayer } from "@/components/yo/italian/course/CourseAssessmentPlayer";
import { ItalianCourseAssessment } from "@/components/yo/italian/course/ItalianCourseAssessment";
import { italianCultureFinal } from "@/lib/yo/italian/course/courseCulture";
import { ItalianAudioProvider } from "@/components/yo/italian/ItalianAudioProvider";
import { italianCourseUnits, italianCourseCatalog, courseSources } from "@/lib/yo/italian/course/courseData";
import { ITALIAN_COURSE_PROGRESS_KEY, emptyCourseProgress, recordCourseAssessment, resetCourseProgress, type CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import type { ItalianChoiceActivity, ItalianMatchActivity } from "@/lib/yo/italian/italianModuleTypes";
import type { CourseQuestion } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";

const originalSupabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL="https://audio.example.test";
const require=createRequire(path.join(process.cwd(),"package.json"));
const {JSDOM}=require("jsdom");
const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://example.test/yo/langues/italien/parcours/u01",pretendToBeVisual:true});
let starts=0;const frames:Array<FrameRequestCallback>=[];
class FakeAudio extends dom.window.EventTarget {src:string;preload="none";playbackRate=1;preservesPitch=true;currentTime=0;constructor(src:string){super();this.src=src;starts++;}play(){this.dispatchEvent(new dom.window.Event("playing"));return Promise.resolve();}pause(){}removeAttribute(){this.src="";}load(){}}
Object.defineProperty(dom.window,"Audio",{configurable:true,value:FakeAudio});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const bindings={window:dom.window,self:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Element:dom.window.Element,Event:dom.window.Event,MouseEvent:dom.window.MouseEvent,MutationObserver:dom.window.MutationObserver,requestAnimationFrame:(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;},cancelAnimationFrame:()=>{},IS_REACT_ACT_ENVIRONMENT:true};
for(const [key,value]of Object.entries(bindings))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
const {render,cleanup,fireEvent,within,act}=require("@testing-library/react") as typeof import("@testing-library/react");
type View=ReturnType<typeof render>;
type AssessmentEvent=Parameters<React.ComponentProps<typeof CourseAssessmentPlayer>["onComplete"]>;
const cases:Array<[string,()=>void]>=[];const test=(name:string,run:()=>void)=>cases.push([name,run]);
const unit=italianCourseUnits[0],lesson=unit.lessons[0],match=lesson.activities.find(a=>a.kind==="match") as ItalianMatchActivity;
function flush(){const pending=frames.splice(0);act(()=>{pending.forEach(f=>f(0));});}
function click(node:HTMLElement){fireEvent.click(node);flush();}
const saved=():CourseProgress=>JSON.parse(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY)??"{}");
function mount(locale:YoLocale="fr",extra:Record<string,unknown>={}){return render(React.createElement(ItalianCourseUnit,{unit,locale,catalog:italianCourseCatalog,sources:courseSources,audioPaths:{},...extra}));}
function play(view:View){click(view.getByRole("button",{name:"Jouer et pratiquer"}));}
function pairs(view:View){const left=within(view.getByRole("group",{name:"Expressions italiennes"})),right=within(view.getByRole("group",{name:"Leur sens"}));for(const p of match.pairs){click(left.getByRole("button",{name:p.it}));click(right.getByRole("button",{name:p.meaning.fr}));}}
function answerQuestion(view:View,q:CourseQuestion,correct=true){
 if(q.kind==="type"){fireEvent.change(view.getByRole("textbox",{name:"Ta réponse en italien"}),{target:{value:correct?q.model:"xyz"}});}else{
  if(q.kind==="listen")click(view.getByRole("button",{name:"Lire la transcription (avec aide)"}));
  const o=q.options.find(o=>(o.id===q.correctId)===correct)!;click(within(view.getByRole("group",{name:"Choisis une réponse"})).getByRole("button",{name:o.it??o.label!.fr}));
 }
 click(view.getByRole("button",{name:"Vérifier"}));
}
for(const locale of ["fr","en","es"] as const)test(`${locale}: course and unit render with complete localized navigation and no autoplay`,()=>{
 const view=mount(locale);assert.equal(view.getByRole("heading",{level:1}).textContent,unit.title[locale]);assert.ok(view.getByRole("link",{name:locale.toUpperCase()}));assert.equal(starts,0);assert.equal(view.queryAllByRole("checkbox").length,0);
 click(view.getByRole("button",{name:{fr:"2. La scène",en:"2. The scene",es:"2. La escena"}[locale]}));assert.ok(view.getByText(lesson.reading.it));
 click(view.getByRole("button",{name:{fr:"4. La langue",en:"4. Language",es:"4. La lengua"}[locale]}));assert.ok(view.getByText(lesson.grammar.body[locale]));
 click(view.getByRole("button",{name:{fr:"6. À toi",en:"6. Your turn",es:"6. Tu turno"}[locale]}));assert.equal(view.getAllByRole("checkbox").length,lesson.speaking.checklist.length);
 cleanup();const dashboard=render(React.createElement(ItalianCourseDashboard,{locale,catalog:italianCourseCatalog,sources:courseSources}));assert.equal(dashboard.getAllByRole("link").filter(link=>(link.getAttribute("href")??"").includes("/parcours/u")).length,2);assert.equal(dashboard.container.querySelectorAll('[data-unlocked="false"]').length,italianCourseCatalog.units.length-1);assert.equal(starts,0);
});
test("phrase translations can be hidden in the optional notebook without removing Italian audio",()=>{const view=mount();play(view);click(view.getByRole("button",{name:"Carnet de mots"}));const notebook=within(view.getByRole("heading",{name:"Carnet de mots"}).closest("section")!);assert.ok(notebook.getByText(lesson.vocabulary[0].meaning.fr));click(notebook.getByRole("button",{name:"Masquer les traductions"}));assert.equal(notebook.queryByText(lesson.vocabulary[0].meaning.fr),null);assert.ok(notebook.getByRole("button",{name:`Écouter : ${lesson.vocabulary[0].it}`}));});
test("independent pair completion persists and replays do not duplicate completed activities",()=>{const view=mount();play(view);pairs(view);assert.equal(saved().activities[match.id].independent,true);assert.equal(Object.values(saved().activities).filter(v=>v.completed).length,1);click(view.getByRole("button",{name:"Rejouer sans aide"}));pairs(view);assert.equal(Object.values(saved().activities).filter(v=>v.completed).length,1);assert.equal(saved().activities[match.id].attempts,2);});
test("wrong answer then recovery records assistance; fresh replay can earn independence",()=>{const view=mount();play(view);const left=within(view.getByRole("group",{name:"Expressions italiennes"})),right=within(view.getByRole("group",{name:"Leur sens"}));click(left.getByRole("button",{name:match.pairs[0].it}));click(right.getByRole("button",{name:match.pairs[1].meaning.fr}));click(right.getByRole("button",{name:match.pairs[0].meaning.fr}));for(const p of match.pairs.slice(1)){click(left.getByRole("button",{name:p.it}));click(right.getByRole("button",{name:p.meaning.fr}));}assert.equal(saved().activities[match.id].independent,false);click(view.getByRole("button",{name:"Rejouer sans aide"}));pairs(view);assert.equal(saved().activities[match.id].independent,true);});
test("opening the notebook during practice marks assistance",()=>{const view=mount();play(view);click(view.getByRole("button",{name:"Carnet de mots"}));click(view.getByRole("button",{name:"Fermer"}));pairs(view);assert.equal(saved().activities[match.id].independent,false);});
test("help after completion does not change an independent result",()=>{const view=mount();play(view);pairs(view);const before=JSON.stringify(saved().activities[match.id]);click(view.getByRole("button",{name:"Carnet de mots"}));assert.equal(JSON.stringify(saved().activities[match.id]),before);});
test("skipping and selecting a lesson do not create successful results",()=>{const view=mount();play(view);click(view.getByRole("button",{name:"Passer pour l’instant"}));assert.deepEqual(saved().activities,{});click(view.getByRole("button",{name:new RegExp(unit.lessons[1].title.fr.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"))}));assert.deepEqual(saved().activities,{});assert.equal(saved().resume?.lessonId,unit.lessons[1].id);});
test("a practice deep link selects the intended lesson and game",()=>{const l=unit.lessons[1],a=l.activities[2];const view=mount("fr",{initialLessonId:l.id,initialActivityId:a.id});assert.ok(view.getByText(a.prompt.fr));assert.equal(saved().resume?.activityId,a.id);});
test("invalid deep links fall back safely to the first study lesson",()=>{const view=mount("fr",{initialLessonId:"missing",initialActivityId:"bad"});assert.ok(view.getByText(lesson.goal.fr));assert.equal(saved().resume?.lessonId,lesson.id);assert.equal(saved().resume?.activityId,undefined);});
test("bonus completion does not create a course result",()=>{const view=mount();play(view);click(view.getByRole("button",{name:"Ouvrir Yoppo"}));click(view.getByRole("button",{name:/^Défie-moi !/}));assert.ok(view.getByRole("heading",{name:"Le défi surprise de Yoppo"}));click(within(view.getByRole("heading",{name:"Le défi surprise de Yoppo"}).closest("section")!).getByRole("button",{name:lesson.vocabulary[0].meaning.fr}));assert.deepEqual(saved().activities,{});});
test("production drafts are not stored; self-reported completion is separate from scores",()=>{const view=mount();click(view.getByRole("button",{name:"Mon atelier"}));fireEvent.change(view.getByRole("textbox",{name:"Ton brouillon en italien"}),{target:{value:"Bozza privata di prova"}});for(const criterion of unit.production.rubric)click(view.getByRole("checkbox",{name:criterion.fr}));click(view.getByRole("checkbox",{name:"J’ai réalisé la production et relu les critères"}));assert.equal(saved().productions[unit.production.id],true);assert.deepEqual(saved().activities,{});assert.deepEqual(saved().assessments,{});assert.equal(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY)!.includes("Bozza privata"),false);});
test("assessment records only one response per question and submits only the complete run",()=>{const events:AssessmentEvent[]=[];const assessment={...unit.quiz,questions:unit.quiz.questions.filter(q=>q.kind!=="listen").slice(0,3)};assert.equal(assessment.questions.length,3);const view=render(React.createElement(CourseAssessmentPlayer,{assessment,locale:"fr",onComplete:(...args:AssessmentEvent)=>events.push(args)}));click(view.getByRole("button",{name:"Commencer le bilan"}));for(const [i,q]of assessment.questions.entries()){answerQuestion(view,q,i!==0);assert.equal(events.length,0);assert.equal(view.queryByRole("button",{name:"Vérifier"}),null);click(view.getByRole("button",{name:i===2?"Voir mon résultat":"Question suivante"}));}assert.deepEqual(events,[[assessment.id,2,3,false]]);assert.ok(view.getByText("67 %"));click(view.getByRole("button",{name:"Refaire le bilan"}));assert.equal(events.length,1);assert.ok(view.getByText(assessment.questions[0].prompt.fr));});
test("a transcript makes the whole checkpoint assisted, even after it is closed",()=>{const q=unit.quiz.questions.find(q=>q.kind==="listen") as ItalianChoiceActivity;assert.ok(q);const assessment={...unit.quiz,questions:[q]},events:AssessmentEvent[]=[];const view=render(React.createElement(CourseAssessmentPlayer,{assessment,locale:"fr",onComplete:(...args:AssessmentEvent)=>events.push(args)}));click(view.getByRole("button",{name:"Commencer le bilan"}));click(view.getByRole("button",{name:"Lire la transcription (avec aide)"}));click(view.getByRole("button",{name:"Lire la transcription (avec aide)"}));const option=q.options.find(o=>o.id===q.correctId)!;click(view.getByRole("button",{name:option.it??option.label!.fr}));click(view.getByRole("button",{name:"Vérifier"}));click(view.getByRole("button",{name:"Voir mon résultat"}));assert.deepEqual(events,[[assessment.id,1,1,true]]);assert.ok(view.getByText("Une révision te fera progresser"));});
test("playing a recorded assessment clip unlocks answers without assistance",()=>{const q=unit.quiz.questions.find(q=>q.kind==="listen") as ItalianChoiceActivity,events:AssessmentEvent[]=[];const assessment={...unit.quiz,questions:[q]};const view=render(React.createElement(ItalianAudioProvider,{paths:{[q.stimulus!]:"yo/it/italian-course-a1/v1/italian-standard/sentence/test.mp3"}} as React.ComponentProps<typeof ItalianAudioProvider>,React.createElement(CourseAssessmentPlayer,{assessment,locale:"fr",onComplete:(...args:AssessmentEvent)=>events.push(args)})));click(view.getByRole("button",{name:"Commencer le bilan"}));click(view.getByRole("button",{name:"Écouter : le message de l’exercice"}));const option=q.options.find(o=>o.id===q.correctId)!;click(view.getByRole("button",{name:option.it??option.label!.fr}));click(view.getByRole("button",{name:"Vérifier"}));click(view.getByRole("button",{name:"Voir mon résultat"}));assert.deepEqual(events,[[assessment.id,1,1,false]]);assert.ok(view.getByText("Objectif du bilan atteint"));});

test("rapid double-next cannot skip a question or save an incomplete assessment",()=>{const events:AssessmentEvent[]=[];const assessment={...unit.quiz,questions:unit.quiz.questions.filter(q=>q.kind!=="listen").slice(0,3)};const view=render(React.createElement(CourseAssessmentPlayer,{assessment,locale:"fr",onComplete:(...args:AssessmentEvent)=>events.push(args)}));click(view.getByRole("button",{name:"Commencer le bilan"}));answerQuestion(view,assessment.questions[0]);const next=view.getByRole("button",{name:"Question suivante"});act(()=>{fireEvent.click(next);fireEvent.click(next);});flush();assert.ok(view.getByText(assessment.questions[1].prompt.fr));assert.equal(events.length,0);answerQuestion(view,assessment.questions[1]);click(view.getByRole("button",{name:"Question suivante"}));answerQuestion(view,assessment.questions[2]);click(view.getByRole("button",{name:"Voir mon résultat"}));assert.deepEqual(events,[[assessment.id,3,3,false]]);});
test("a cross-tab reset cancels an assessment already in progress",()=>{const view=mount();click(view.getByRole("button",{name:"Bilan de l’unité"}));click(view.getByRole("button",{name:"Commencer le bilan"}));answerQuestion(view,unit.quiz.questions[0]);const fresh=resetCourseProgress(saved());const value=JSON.stringify(fresh);window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY,value);act(()=>window.dispatchEvent(new dom.window.StorageEvent("storage",{key:ITALIAN_COURSE_PROGRESS_KEY,newValue:value})));flush();assert.ok(view.getByRole("button",{name:"Commencer le bilan"}));assert.deepEqual(saved().assessments,{});});

test("recall cards require reveal, repeat forgotten words and never record scored success",()=>{
 const view=render(React.createElement(ItalianRecallCards,{phrases:lesson.vocabulary.slice(0,2),locale:"fr"}));
 assert.equal(view.queryByRole("button",{name:"Retrouvé"}),null);
 click(view.getByRole("button",{name:"Vérifier le sens"}));
 assert.ok(view.getByText(lesson.vocabulary[0].meaning.fr));
 click(view.getByRole("button",{name:"À revoir"}));
 assert.ok(view.getByText(lesson.vocabulary[1].it));
 click(view.getByRole("button",{name:"Vérifier le sens"}));click(view.getByRole("button",{name:"Retrouvé"}));
 assert.ok(view.getByText(lesson.vocabulary[0].it));
 click(view.getByRole("button",{name:"Vérifier le sens"}));click(view.getByRole("button",{name:"Retrouvé"}));
 assert.ok(view.getByText("Tu as retrouvé toutes les expressions de cette série."));
 assert.equal(window.localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),null);
});
test("reverse recall hides Italian and its audio label until revealed",()=>{
 const view=render(React.createElement(ItalianRecallCards,{phrases:lesson.vocabulary.slice(0,2),locale:"fr"}));
 click(view.getByRole("button",{name:"Retrouver l’italien"}));
 assert.ok(view.getByText(lesson.vocabulary[0].meaning.fr));
 assert.equal(view.queryByText(lesson.vocabulary[0].it),null);
 assert.equal(view.queryByRole("button",{name:`Écouter : ${lesson.vocabulary[0].it}`}),null);
 click(view.getByRole("button",{name:"Vérifier le sens"}));assert.ok(view.getByText(lesson.vocabulary[0].it));
});
test("study visits and oral self-checks do not award scored results",()=>{
 const view=mount();click(view.getByRole("button",{name:"6. À toi"}));
 for(const box of view.getAllByRole("checkbox"))click(box);
 assert.deepEqual(saved().activities,{});
 click(view.getByRole("button",{name:"Passer aux jeux"}));assert.ok(view.getByRole("group",{name:"Expressions italiennes"}));
});
test("dictation cannot be submitted before listening; transcript completion stays assisted",()=>{
 const a=lesson.activities.find(a=>a.kind==="type"&&a.listeningText)!;
 assert.equal(a.kind,"type");if(a.kind!=="type")return;
 const view=mount("fr",{initialLessonId:lesson.id,initialActivityId:a.id});
 fireEvent.change(view.getByRole("textbox",{name:"Ta réponse en italien"}),{target:{value:a.model}});
 assert.equal((view.getByRole("button",{name:"Vérifier"}) as HTMLButtonElement).disabled,true);
 fireEvent.submit(view.getByRole("textbox").closest("form")!);assert.deepEqual(saved().activities,{});
 click(view.getByRole("button",{name:"Lire la transcription (avec aide)"}));
 click(view.getByRole("button",{name:"Lire la transcription (avec aide)"}));
 click(view.getByRole("button",{name:"Vérifier"}));
 assert.equal(saved().activities[a.id].completed,true);assert.equal(saved().activities[a.id].independent,false);
});
test("recorded dictation can be completed independently without exposing its answer in the audio label",()=>{
 const a=lesson.activities.find(a=>a.kind==="type"&&a.listeningText)!;if(a.kind!=="type")throw Error("missing dictation");
 const view=mount("fr",{initialLessonId:lesson.id,initialActivityId:a.id,audioPaths:{[a.listeningText!]:"yo/it/italian-course-a1/v1/italian-standard/sentence/test.mp3"}});
 assert.equal(view.queryByText(a.model),null);
 click(view.getByRole("button",{name:"Écouter : le message de l’exercice"}));
 fireEvent.change(view.getByRole("textbox",{name:"Ta réponse en italien"}),{target:{value:a.model}});
 click(view.getByRole("button",{name:"Vérifier"}));assert.equal(saved().activities[a.id].independent,true);
});
test("each lesson has exactly one dictation using its already recorded listening stimulus",()=>{
 for(const item of italianCourseUnits.flatMap(u=>u.lessons)){
  const dictations=item.activities.filter(a=>a.kind==="type"&&a.listeningText);
  assert.equal(dictations.length,1,item.id);
  assert.ok(item.activities.some(a=>a.kind==="listen"&&a.stimulus===(dictations[0] as {listeningText:string}).listeningText));
 }
});
function completeUnitCheckpoints() {
 let progress=emptyCourseProgress();
 for(const unit of italianCourseCatalog.units){
  const a=italianCourseCatalog.assessments.find(a=>a.id===unit.quizId)!;
  progress=recordCourseAssessment(progress,italianCourseCatalog,a.id,a.questionCount,a.questionCount,false);
 }
 window.localStorage.setItem(ITALIAN_COURSE_PROGRESS_KEY,JSON.stringify(progress));
}
for (const locale of ["fr", "en", "es"] as const) test(`${locale}: photo stops are taught in lessons and final quiz is discoverable`, () => {
 completeUnitCheckpoints();
 for (const item of italianCourseUnits.filter(u => u.cultureStop)) {
  const view = mount(locale, { unit: item });
  assert.ok(view.getByText(item.cultureStop!.body[locale]));
  const photo = view.getByRole("img", { name: item.cultureStop!.photo.alt[locale] });
  assert.equal(photo.getAttribute("width"), "960");
  assert.ok(view.getByText(item.cultureStop!.photo.caption[locale]));
  cleanup();
 }
 const dashboard = render(React.createElement(ItalianCourseDashboard, { locale, catalog: italianCourseCatalog, sources: courseSources }));
 assert.ok(dashboard.getByRole("link", { name: new RegExp(italianCultureFinal.title[locale]) }).getAttribute("href")?.includes("it1-culture-finale"));
});

test("culture finale hides place captions until answered, explains errors, persists and replays", () => {
 completeUnitCheckpoints();
 const view = render(React.createElement(ItalianCourseAssessment, { assessment: italianCultureFinal, locale: "fr", catalog: italianCourseCatalog, audioPaths: {} }));
 click(view.getByRole("button", { name: "Commencer le bilan" }));
 for (const [i, question] of italianCultureFinal.questions.entries()) {
  if (question.photo) {
   const image = view.getByRole("img", { name: question.photo.alt.fr });
   assert.ok(image.closest("figure")!.parentElement!.classList.contains("md:grid-cols-2"));
   assert.equal(view.queryByText(question.photo.caption.fr), null);
  }
  answerQuestion(view, question, i !== 0);
  assert.ok(view.getByText(question.explanation.fr));
  if (question.photo) assert.ok(view.getByText(question.photo.caption.fr));
  assert.equal(view.queryByRole("button", { name: "Vérifier" }), null);
  click(view.getByRole("button", { name: i === 9 ? "Voir mon résultat" : "Question suivante" }));
 }
 assert.equal(saved().assessments[italianCultureFinal.id].bestIndependent, 90);
 assert.equal(saved().assessments[italianCultureFinal.id].attempts, 1);
 assert.equal(saved().assessments["it1-final"], undefined);
 click(view.getByRole("button", { name: "Refaire le bilan" }));
 assert.equal(view.queryByText(italianCultureFinal.questions[0].photo!.caption.fr), null);
 assert.equal(saved().assessments[italianCultureFinal.id].attempts, 1);
});

test("opening a photo source counts as assistance and Yoppo review returns to the taught unit", () => {
 const question = italianCultureFinal.questions[1], events: AssessmentEvent[] = [];
 const view = render(React.createElement(CourseAssessmentPlayer, { assessment: { ...italianCultureFinal, questions: [question] }, locale: "fr", onComplete: (...args: AssessmentEvent) => events.push(args) }));
 click(view.getByRole("button", { name: "Commencer le bilan" }));
 click(view.getByRole("link", { name: "Source de la photo" }));
 click(view.getByRole("button", { name: "Ouvrir Yoppo" }));
 click(view.getByRole("button", { name: /^Mes révisions/ }));
 assert.ok(view.getByRole("link", { name: "Unité 6" }).getAttribute("href")?.includes("u06"));
 assert.equal(view.queryByRole("link", { name: /^Unité 1$/ }), null);
 answerQuestion(view, question);
 click(view.getByRole("button", { name: "Voir mon résultat" }));
 assert.deepEqual(events, [[italianCultureFinal.id, 1, 1, true]]);
});

test("finishing the language final offers the cultural finale with the same locale", () => {
 const assessment = { ...unit.quiz, id: "it1-final", questions: unit.quiz.questions.filter(q => q.kind === "choice").slice(0, 1) };
 const view = render(React.createElement(CourseAssessmentPlayer, { assessment, locale: "fr", onComplete: () => {} }));
 assert.equal(view.queryByRole("link", { name: italianCultureFinal.title.fr }), null);
 click(view.getByRole("button", { name: "Commencer le bilan" }));
 answerQuestion(view, assessment.questions[0]);
 click(view.getByRole("button", { name: "Voir mon résultat" }));
 assert.equal(view.getByRole("link", { name: italianCultureFinal.title.fr }).getAttribute("href"), "/yo/langues/italien/parcours/bilans/it1-culture-finale");
});

test("mobile lesson rails stay inside an explicit shrinkable grid",()=>{
 const view=mount();
 const aside=view.container.querySelector("aside")!;
 assert.ok(aside.classList.contains("min-w-0"));
 assert.ok(aside.parentElement!.classList.contains("grid-cols-1"));
 assert.ok(aside.parentElement!.classList.contains("min-w-0"));
 const selector=view.getByRole("combobox",{name:"leçons"});
 assert.ok(selector.classList.contains("lg:hidden"));
 fireEvent.change(selector,{target:{value:"1"}});flush();
 assert.equal(saved().resume?.lessonId,unit.lessons[1].id);
 const lessonNav=view.getByRole("navigation",{name:/^Leçon$/});
 assert.ok(lessonNav.classList.contains("flex-wrap"));
});
let failed=0;for(const[name,run]of cases){cleanup();window.localStorage.clear();frames.length=0;starts=0;try{run();console.log(`✓ ${name}`);}catch(error){failed++;console.error(`✗ ${name}`,error);}}cleanup();dom.window.close();if(originalSupabaseUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=originalSupabaseUrl;console.log(`${cases.length-failed}/${cases.length} Italian course player tests passed`);if(failed)process.exitCode=1;
