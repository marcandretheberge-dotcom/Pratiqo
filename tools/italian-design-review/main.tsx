import React from "react";
import { createRoot } from "react-dom/client";
import { GuidedItalianCourse } from "../../components/yo/italian/guided/GuidedItalianCourse";
import { personalizedItalianUnits, personalizedItalianCatalog, moduleBank, moduleVisuals } from "../../lib/yo/personalized/courseData";
import { courseAudioPaths } from "../../lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "../../lib/yo/italian/course/courseSpeech";
import WordBankPage from "../../app/yo/langues/italien/parcours/[unitId]/vocabulaire/page";
import { ItalianAchievementPrintable } from "../../components/yo/italian/guided/ItalianAchievementPrintable";
import { GUIDED_PROGRESS_KEY } from "../../lib/yo/personalized/profile";
import type { LearningProfile } from "../../lib/yo/personalized/profile";
const params = new URLSearchParams(location.search);
const route = location.pathname.match(/parcours\/(u\d+)/)?.[1];
const unitId = route ?? params.get("unit") ?? "u08";
const unit = personalizedItalianUnits.find(u => u.id === unitId) ?? personalizedItalianUnits[0];
const locale = params.get("lang") === "en" ? "en" : params.get("lang") === "es" ? "es" : "fr";
// Review is hosted on its own origin. Placement previews cities without awarding stamps.
const profile: LearningProfile = {version:1,language:"it",experience:"rusty",goal:"travel",weeklyMinutes:60,startUnitId:unit.id,placement:"manual",reviewUnitIds:[],updatedAt:Date.now()};
const root = createRoot(document.getElementById("root")!);
if (location.pathname.endsWith("/vocabulaire")) {
  WordBankPage({params:Promise.resolve({unitId:unit.id}),searchParams:Promise.resolve({lang:locale})}).then(page=>root.render(page));
} else if (location.pathname.endsWith("/bilan")) {
  root.render(<ItalianAchievementPrintable unit={personalizedItalianCatalog.units.find(u=>u.id===unit.id)!} catalog={personalizedItalianCatalog} locale={locale}/>);
} else root.render(<>
  <aside className="review-banner"><span>Aperçu de design · progression locale de démonstration</span><select aria-label="Ville à prévisualiser" value={unit.id} onChange={e => {location.href=`/?unit=${e.target.value}&lang=${locale}`;}}>{personalizedItalianUnits.map(u=><option value={u.id} key={u.id}>{u.number}. {u.title[locale]}</option>)}</select></aside>
  <GuidedItalianCourse unit={unit} catalog={personalizedItalianCatalog} locale={locale} profile={profile} progressKey={GUIDED_PROGRESS_KEY} wordBank={moduleBank(unit)} visualWords={moduleVisuals(unit)} audioPaths={courseAudioPaths([...unitSpeech(unit),...moduleBank(unit).map(w=>w.it)])}/>
</>);
