import React from 'react';
import { createRoot } from 'react-dom/client';
import { seedReview, type ReviewScenario } from './fixtures';
import { introCourses } from '../../lib/yo/shared/course';
import { introAudioPaths } from '../../lib/yo/shared/audio.server';
import { SharedIntro } from '../../components/yo/shared/SharedIntro';
import IntroVocabularyPage from '../../app/yo/langues/[language]/demarrer/vocabulaire/page';
import { CourseExperience } from '../../components/yo/german/CourseExperience';
import { GermanCourseDashboard } from '../../components/yo/german/GermanCourseDashboard';
import GermanUnitPage from '../../app/yo/langues/allemand/parcours/[unitId]/page';
import PortugueseUnitPage from '../../app/yo/langues/portugais-bresil/parcours/[unitId]/page';
import JapaneseHome from '../../app/yo/langues/japonais/parcours/page';
import { JapaneseCoursePlayer } from '../../components/yo/japanese/JapaneseCoursePlayer';
import { japaneseCourseUnits, japaneseCourseSources } from '../../lib/yo/japaneseCourse';
import { japaneseJourneyUnits, japaneseFinalIds } from '../../lib/yo/foundationJourneyCatalogs';
import MandarinHome from '../../app/yo/langues/mandarin/parcours/page';
import MandarinUnitPage from '../../app/yo/langues/mandarin/parcours/[unit]/page';
import { germanCatalog } from '../../lib/yo/german/courseData';
import { portugueseCatalog } from '../../lib/yo/portuguese/courseData';
import { GuidedItalianCourse } from '../../components/yo/italian/guided/GuidedItalianCourse';
import { personalizedItalianUnits, personalizedItalianCatalog, moduleBank, moduleVisuals } from '../../lib/yo/personalized/courseData';
import { GUIDED_PROGRESS_KEY, type LearningProfile } from '../../lib/yo/personalized/profile';
import { courseAudioPaths } from '../../lib/yo/italian/course/courseAudio.server';
import { unitSpeech } from '../../lib/yo/italian/course/courseSpeech';
import { LearningFeedbackProvider } from '../../components/yo/feedback/LearningFeedback';

const query=new URLSearchParams(location.search);
const language=location.pathname.split('/')[3] || query.get('language') || 'allemand';
const unitId=location.pathname.split('/')[5];
const mode=location.pathname.includes('/demarrer')?'intro':query.get('mode') || 'course';
const locale=query.get('lang')==='en'?'en':query.get('lang')==='es'?'es':'fr';
document.documentElement.lang=locale;
const requestedScenario=query.get('scenario');
if(!sessionStorage.getItem('world-review-scenario') || (requestedScenario && requestedScenario!==sessionStorage.getItem('world-review-scenario'))) {
 seedReview(requestedScenario==='progress'?'progress':requestedScenario==='locked'?'locked':'beginner');
}
const scenario=sessionStorage.getItem('world-review-scenario')!;
const languages=[['italien','Italiano'],['allemand','Deutsch'],['portugais-bresil','Português do Brasil'],['japonais','日本語'],['mandarin','中文'],['francais-quebec','Français du Québec'],['anglais','English'],['espagnol','Español']];
function url(slug:string, view=mode, lang=locale) {return `/yo/langues/${slug}/${slug!=='italien'&&(view==='intro'||['anglais','francais-quebec','espagnol'].includes(slug))?'demarrer':'parcours'}?lang=${lang}`;}
function Banner(){return <aside className="review-banner"><span>Revue isolée · données de démonstration uniquement</span>
 <label>Langue <select aria-label="Langue du cours" value={language} onChange={e=>location.assign(url(e.target.value))}>{languages.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
 <label>Parcours <select aria-label="Parcours à comparer" value={mode} onChange={e=>location.assign(url(language,e.target.value))}>{!['anglais','francais-quebec','espagnol'].includes(language)&&<option value="course">Complet existant</option>}{language!=='italien'&&<option value="intro">Premières rencontres</option>}</select></label>
 <label>Interface <select aria-label="Langue de l’interface preview" value={locale} onChange={e=>location.assign(url(language,mode,e.target.value as typeof locale))}><option>fr</option><option>en</option><option>es</option></select></label>
 <label>Scénario <select aria-label="Scénario de démonstration" value={scenario} onChange={e=>{seedReview(e.target.value as ReviewScenario);location.assign(url(language));}}><option value="beginner">Débutant</option><option value="progress">Progression en cours</option><option value="locked">Destination verrouillée</option></select></label>
 <a href={url(language)}>Carte</a><a href="/evidence/index.html">Comparer les huit cartes</a>
 {scenario==='locked'&&<span>Les destinations suivantes restent verrouillées par les règles existantes. Aucun acquis n’est ajouté.</span>}</aside>;}
async function content(){
 if(location.pathname!=='/'&&!/^\/yo\/langues\/[^/]+\/(demarrer(?:\/vocabulaire)?|parcours(?:\/[^/]+)?)\/?$/.test(location.pathname)) {
  return <main className="p-6"><h1 className="text-xl font-bold">Parcours secondaire inchangé</h1><p className="my-4">Cette route ne fait pas partie de l’aperçu isolé. Elle conserve sa navigation existante dans l’application ; aucun compte de production n’est ouvert ici.</p><a className="underline" href={url(language)}>Revenir à la carte en revue</a></main>;
 }
 const searchParams=Promise.resolve(Object.fromEntries(query));
 const c=introCourses.find(c=>c.slug===language);
 if(c&&location.pathname.endsWith('/demarrer/vocabulaire')) return IntroVocabularyPage({params:Promise.resolve({language}),searchParams});
 if(language!=='italien' && (mode==='intro'||['anglais','francais-quebec','espagnol'].includes(language))) return <SharedIntro course={c!} locale={locale} audio={introAudioPaths(c!)}/>;
 if(language==='allemand'||language==='portugais-bresil'){
  const pt=language==='portugais-bresil';
  const page=unitId?await(pt?PortugueseUnitPage:GermanUnitPage)({params:Promise.resolve({unitId}),searchParams}):<GermanCourseDashboard catalog={pt?portugueseCatalog:germanCatalog} locale={locale} audioReady/>;
  return <CourseExperience language={pt?'pt-BR':'de'}>{page}</CourseExperience>;
 }
 if(language==='japonais') return unitId?<JapaneseCoursePlayer unit={japaneseCourseUnits.find(u=>u.slug===unitId)!} locale={locale} sources={japaneseCourseSources} journeyUnits={japaneseJourneyUnits} finalIds={japaneseFinalIds}/>:JapaneseHome({searchParams});
 if(language==='mandarin') return unitId?MandarinUnitPage({params:Promise.resolve({unit:unitId}),searchParams}):MandarinHome({searchParams});
 const unit=personalizedItalianUnits.find(u=>u.id===unitId)??personalizedItalianUnits[scenario==='progress'?2:0];
 const profile:LearningProfile={version:1,language:'it',experience:'rusty',goal:'travel',weeklyMinutes:60,startUnitId:scenario==='progress'?'u03':'u01',placement:'manual',reviewUnitIds:[],updatedAt:Date.now()};
 return <GuidedItalianCourse unit={unit} catalog={personalizedItalianCatalog} locale={locale} profile={profile} progressKey={GUIDED_PROGRESS_KEY} wordBank={moduleBank(unit)} visualWords={moduleVisuals(unit)} audioPaths={courseAudioPaths([...unitSpeech(unit),...moduleBank(unit).map(w=>w.it)])} resumeMission={query.get('mission')==='continue'}/>;
}
const root=createRoot(document.getElementById('root')!);
content().then(page=>root.render(<LearningFeedbackProvider><Banner/>{page}</LearningFeedbackProvider>)).catch(error=>root.render(<><Banner/><h1>Route non disponible dans cette preview locale</h1><pre>{String(error)}</pre></>));
