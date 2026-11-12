import { createContext, useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import { GuidedItalianCourse, type ItalianNavigatorContext } from "../../components/yo/italian/guided/GuidedItalianCourse";
import { ItalianTravelNavigator } from "../../components/yo/italian/travel/ItalianTravelNavigator";
import { LearningFeedbackProvider } from "../../components/yo/feedback/LearningFeedback";
import { OnDemandLearningAudio } from "../../components/yo/personalized/LearningAudio";
import { personalizedItalianUnits as units, personalizedItalianCatalog as catalog, moduleBank, moduleVisuals } from "../../lib/yo/personalized/courseData";
import { emptyCourseProgress, recordCourseAssessment, recordCourseActivity } from "../../lib/yo/italian/course/courseProgress";
import { courseAudioPaths } from "../../lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "../../lib/yo/italian/course/courseSpeech";
import { TOUR_KEY } from "../../lib/yo/italian/course/guidedItalian";
import type { LearningProfile } from "../../lib/yo/personalized/profile";
import type { YoLocale } from "../../lib/yo/types";

const COURSE_KEY = "yo.review.travel.course.v1", UI_KEY = "yo.review.travel.cosmetics.v1";
const query = new URLSearchParams(location.search);
const locale: YoLocale = query.get("lang") === "en" ? "en" : query.get("lang") === "es" ? "es" : "fr";
document.documentElement.lang = locale;
const authorized = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || (location.protocol === "https:" && location.hostname.endsWith(".vercel.app"));
if (!authorized || !document.querySelector('meta[name="italian-travel-review-only"]')) throw new Error("Isolated preview only");
const scenarios = ["beginner", "florence", "checkpoint"] as const;
type Scenario = typeof scenarios[number];
function seed(scenario: Scenario) {
  let progress = emptyCourseProgress();
  if (scenario !== "beginner") for (const unit of units.slice(0, 5)) progress = recordCourseAssessment(progress, catalog, unit.quiz.id, unit.quiz.questions.length, unit.quiz.questions.length, false);
  if (scenario === "checkpoint") for (const lesson of units[5].lessons.slice(0, 2)) for (const activity of lesson.activities) progress = recordCourseActivity(progress, catalog, activity.id, true, false);
  localStorage.setItem(COURSE_KEY, JSON.stringify(progress)); localStorage.removeItem(UI_KEY);
  for (const unit of units) localStorage.removeItem(`yo.italian.guided.v2.${unit.id}`);
  localStorage.setItem(TOUR_KEY, "seen"); sessionStorage.setItem("travel-review-scenario", scenario);
}
const requested = query.get("scenario");
if (!localStorage.getItem(COURSE_KEY) || (requested && requested !== sessionStorage.getItem("travel-review-scenario") && scenarios.includes(requested as Scenario))) seed(scenarios.includes(requested as Scenario) ? requested as Scenario : "florence");
const scenario = sessionStorage.getItem("travel-review-scenario") ?? "florence";
const profile: LearningProfile = { version: 1, language: "it", experience: "rusty", goal: "travel", weeklyMinutes: 60, startUnitId: "u01", placement: "manual", reviewUnitIds: [], updatedAt: 1 };
const PreviewContext = createContext<{ unitId: string; openUnit: (id: string) => void }>({ unitId: "u01", openUnit: () => {} });
function PreviewNavigator(context: ItalianNavigatorContext) {
  const { unitId, openUnit } = useContext(PreviewContext);
  return <ItalianTravelNavigator {...context} unit={units.find(u => u.id === unitId)!} florence={units[5]} locale={locale} storageKey={UI_KEY} openUnit={openUnit}/>;
}
function App() {
  const [unitId, setUnitId] = useState(scenario === "beginner" ? "u01" : "u06");
  const [resume, setResume] = useState(false);
  const unit = units.find(u => u.id === unitId)!;
  const paths = courseAudioPaths([...unitSpeech(unit), ...units[5].lessons[2].vocabulary.map(p => p.it)]);
  return <OnDemandLearningAudio><LearningFeedbackProvider><aside className="review-banner">
    <strong>Preview isolée · aucun acquis réel</strong><label>Scénario <select aria-label="Scénario de démonstration" value={scenario} onChange={e => location.assign("/?lang=" + locale + "&scenario=" + e.target.value)}><option value="beginner">Débutant</option><option value="florence">Arrivée à Florence</option><option value="checkpoint">Checkpoint de Florence acquis</option></select></label>
    <label>Interface <select aria-label="Langue" value={locale} onChange={e => location.assign("/?lang=" + e.target.value)}><option>fr</option><option>en</option><option>es</option></select></label><a href="/evidence/index.html">Captures et vidéo</a>
  </aside>
  <PreviewContext.Provider value={{ unitId, openUnit: id => { setResume(true); setUnitId(id); } }}><GuidedItalianCourse key={unitId} unit={unit} catalog={catalog} locale={locale} profile={profile}
    progressKey={COURSE_KEY} wordBank={moduleBank(unit)} visualWords={moduleVisuals(unit)} audioPaths={paths} resumeMission={resume}
    Navigator={PreviewNavigator}
  /></PreviewContext.Provider></LearningFeedbackProvider></OnDemandLearningAudio>;
}
createRoot(document.getElementById("root")!).render(<App/>);
