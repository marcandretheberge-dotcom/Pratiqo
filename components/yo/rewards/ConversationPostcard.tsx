"use client";

import { useState } from "react";
import { ArrowUpRight, Coffee, GraduationCap, Repeat2 } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { SITE_URL } from "@/lib/seo/config";
import { italianWorldForUnit } from "@/lib/yo/italian/worlds";
import { getYoPratiqoModuleBySlug } from "@/lib/yo/yopratiqoProductConfig";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import type { CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianAudioProvider } from "../italian/ItalianAudioProvider";
import { LearningAudio } from "../personalized/LearningAudio";

export function ConversationPostcard({ unit, locale, audioPaths }: { unit: CourseUnit; locale: YoLocale; audioPaths: Record<string,string> }) {
  const say = (fr:string,en:string,es:string) => t(fr,en,es)[locale];
  const [index, setIndex] = useState(0);
  const lesson = unit.lessons[0], phrases = lesson.vocabulary, phrase = phrases[index];
  const teacherPath = getYoPratiqoModuleBySlug("italien")?.teacherSearchUrl;
  const world = italianWorldForUnit(unit.id);
  const city = world?.cities.find(c => c.unitId === unit.id)?.name;
  return <section className="reward-page reward-speak">
    <p className="reward-eyebrow">{say("Carnet de conversation","Conversation notebook","Cuaderno de conversación")}</p>
    <h1>{say("À toi de parler","Your turn to speak","Te toca hablar")}</h1>
    <div className="reward-postcard">
      <div className="reward-panorama" style={{backgroundImage: world ? `url(/images/yo/italian/worlds/${world.id}.webp)` : undefined}}>
        <span className="reward-postmark">ITALIA<br/>{city}</span>
        <CompanionAvatar visualId="travel" state="teacher_ready" size="md" compact locale={locale}/>
      </div>
      {phrase && <div className="reward-phrase">
        <div className="reward-section-heading"><span>{lesson.title[locale]}</span><b>{index + 1} / {phrases.length}</b></div>
        <div aria-live="polite"><h2 lang="it">{phrase.it}</h2><p>{phrase.meaning[locale]}</p></div>
        <div className="reward-phrase-actions"><ItalianAudioProvider paths={audioPaths}><LearningAudio key={phrase.it} text={phrase.it} locale={locale}/></ItalianAudioProvider>
          {phrases.length > 1 && <button onClick={()=>setIndex((index+1)%phrases.length)}><Repeat2 size={18}/>{say("Autre phrase","Next phrase","Otra frase")}</button>}
        </div>
      </div>}
    </div>
    <h2>{say("Avec qui pratiquer ?","Who will you practise with?","¿Con quién practicar?")}</h2>
    <div className="reward-meet">
      <a href={SITE_URL + "/cafe"} target="_blank" rel="noopener noreferrer"><Coffee/><span><strong>Café des langues</strong><small>{say("Échange gratuit entre apprenants","Free peer conversation","Intercambio gratuito entre estudiantes")}</small></span><ArrowUpRight/></a>
      {teacherPath && <a href={SITE_URL + teacherPath} target="_blank" rel="noopener noreferrer"><GraduationCap/><span><strong>{say("Chercher un prof d’italien","Find an Italian teacher","Buscar un profesor de italiano")}</strong><small>{say("Cours privé · tarif fixé par le professeur","Private lesson · teacher sets the price","Clase privada · precio fijado por el profesor")}</small></span><ArrowUpRight/></a>}
    </div>
    <p className="reward-note">{say("Ces liens ouvrent Pratiqo dans un autre onglet.","These links open Pratiqo in a new tab.","Estos enlaces abren Pratiqo en otra pestaña.")}</p>
  </section>;
}
