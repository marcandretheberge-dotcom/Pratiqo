import { ArrowRight, Check, Flag } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import type { CourseAssessment } from "@/lib/yo/italian/course/courseTypes";
import { courseOutline } from "./CourseShared";

/** An optional recall stop; completing it never replaces the unit mission. */
export function CourseMidpointCard({ assessment, locale, passed, onBegin }: {
  assessment: CourseAssessment; locale: YoLocale; passed: boolean; onBegin: () => void;
}) {
  return <section aria-label={t("Halte de mi-parcours", "Midpoint stop", "Parada de mitad de camino")[locale]} data-midpoint-card className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
    <p className="flex items-center gap-2 text-xs font-bold text-emerald-800">
      {passed ? <Check size={16} aria-hidden /> : <Flag size={16} aria-hidden />}
      {passed ? t("Halte réussie", "Recap passed", "Repaso superado")[locale] : t("La halte est ouverte", "Your midpoint stop is open", "La parada está abierta")[locale]}
    </p>
    <h2 className="mt-2 font-serif text-xl">{assessment.title[locale]}</h2>
    <p className="mt-2 text-sm leading-6">{passed
      ? t("Tu as retrouvé au moins quatre réponses sur cinq sans aide. Tu peux rejouer cette halte ou poursuivre les leçons.", "You recalled at least four answers out of five independently. Replay this stop or continue the lessons.", "Has recordado al menos cuatro respuestas de cinco sin ayuda. Puedes repetir la parada o seguir con las lecciones.")[locale]
      : t("Cinq petites questions pour retrouver les salutations et les sons des deux premières leçons. Cette révision est facultative; tu peux la reprendre à ton rythme.", "Five short questions to recall greetings and sounds from the first two lessons. This recap is optional; return to it at your own pace.", "Cinco preguntas breves para recordar los saludos y sonidos de las dos primeras lecciones. Este repaso es opcional; puedes volver a tu ritmo.")[locale]}</p>
    <button type="button" onClick={onBegin} className={`${courseOutline} mt-3 bg-white`}>
      {passed ? t("Rejouer la halte", "Replay the recap", "Repetir el repaso")[locale] : t("Faire la halte", "Take the recap", "Hacer el repaso")[locale]}<ArrowRight size={16} aria-hidden />
    </button>
  </section>;
}
