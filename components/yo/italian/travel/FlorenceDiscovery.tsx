"use client";
import { useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowRight } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { LearningAudio } from "../../personalized/LearningAudio";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";
import { useLearningFeedback } from "../../feedback/LearningFeedback";

export function FlorenceDiscovery({ locale, unit, initialQuiz = false, onClose, onContinue, onCultureComplete }: {
  locale: YoLocale; unit: CourseUnit; initialQuiz?: boolean; onClose: () => void; onContinue: () => void; onCultureComplete: () => void;
}) {
  const [quiz, setQuiz] = useState(initialQuiz), [answer, setAnswer] = useState<number | null>(null);
  const feedback = useLearningFeedback();
  const phrases = unit.lessons[2].vocabulary.filter(p => ["Gira a destra.", "Gira a sinistra.", "Attraversa la piazza."].includes(p.it));
  function close() { stopLessonAudio(); onClose(); }
  return <Dialog.Root open onOpenChange={open => { if (!open) close(); }}><Dialog.Portal>
    <Dialog.Overlay className="travel-overlay"/><Dialog.Content className="travel-discovery" aria-describedby="florence-description">
      <button type="button" className="travel-close" aria-label={t("Fermer", "Close", "Cerrar")[locale]} onClick={close}><X/></button>
      <Image src="/images/yo/italian/culture/florence-bridge.webp" width={1200} height={800} alt={t("Le Ponte Vecchio à Florence", "Ponte Vecchio in Florence", "Ponte Vecchio en Florencia")[locale]}/>
      <div className="travel-discovery-copy">
        <p className="travel-eyebrow">FIRENZE · 06</p><Dialog.Title>{t("Un pont, mille rencontres", "A bridge, a thousand encounters", "Un puente, mil encuentros")[locale]}</Dialog.Title>
        <Dialog.Description id="florence-description">{t("Le Ponte Vecchio traverse l’Arno. Le centre historique de Florence est inscrit au patrimoine mondial de l’UNESCO depuis 1982.", "Ponte Vecchio crosses the Arno. Florence’s historic centre has been on UNESCO’s World Heritage List since 1982.", "El Ponte Vecchio cruza el Arno. El centro histórico de Florencia es Patrimonio Mundial de la UNESCO desde 1982.")[locale]}</Dialog.Description>
        <p className="travel-sources"><a href="https://www.visittuscany.com/en/attractions/ponte-vecchio/" target="_blank" rel="noreferrer">Visit Tuscany</a> · <a href="https://whc.unesco.org/en/list/174/" target="_blank" rel="noreferrer">UNESCO</a></p>
        {!quiz ? <>
          <h3>{t("Trouve ton chemin avec Yoppo", "Find your way with Yoppo", "Oriéntate con Yoppo")[locale]}</h3>
          {phrases.map(p => <div className="travel-phrase" key={p.it}><strong lang="it">{p.it}</strong><span>{p.meaning[locale]}</span><LearningAudio text={p.it} locale={locale}/></div>)}
          <button className="travel-primary" type="button" onClick={() => { stopLessonAudio(); setQuiz(true); }}>{t("Un petit détour culturel", "A little cultural detour", "Un pequeño desvío cultural")[locale]}<ArrowRight size={18}/></button>
        </> : <section aria-label={t("Souvenir de Florence", "Florence memory", "Recuerdo de Florencia")[locale]}>
          <h3>{t("Quel fleuve passe sous le Ponte Vecchio ?", "Which river flows beneath Ponte Vecchio?", "¿Qué río pasa bajo el Ponte Vecchio?")[locale]}</h3>
          <div className="travel-choices">{["Arno", "Tevere", "Po"].map((name, i) => <button key={name} type="button" aria-pressed={answer === i} onClick={() => { setAnswer(i); if (i === 0) { feedback.emit("travel:florence:culture"); onCultureComplete(); } }}>{name}</button>)}</div>
          {answer !== null && <p role="status">{answer === 0 ? t("Oui ! Ce souvenir culturel ne remplace pas le bilan de langue.", "Yes! This cultural memory does not replace the language assessment.", "¡Sí! Este recuerdo cultural no sustituye la evaluación lingüística.")[locale] : t("Relis la découverte ci-dessus, puis réessaie.", "Revisit the discovery above, then try again.", "Relee la explicación y vuelve a intentarlo.")[locale]}</p>}
          <button type="button" className="travel-primary" onClick={() => { stopLessonAudio(); onContinue(); }}>{t("Continuer le module complet", "Continue the full module", "Continuar el módulo completo")[locale]}<ArrowRight size={18}/></button>
        </section>}
      </div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
