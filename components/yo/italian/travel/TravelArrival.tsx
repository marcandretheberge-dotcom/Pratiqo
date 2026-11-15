"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plane, ArrowRight } from "lucide-react";
import { useMapReducedMotion } from "../../journey/map/useMapReducedMotion";
import { MapYoppo } from "../../journey/map/MapYoppo";
import { useLearningFeedback } from "../../feedback/LearningFeedback";
import type { YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/italian/course/courseAuthoring";

export function TravelArrival({ locale, onArrive }: { locale: YoLocale; onArrive: () => void }) {
  const [flying, setFlying] = useState(false);
  const reduce = useMapReducedMotion(), feedback = useLearningFeedback();
  useEffect(() => {
    if (!flying) return;
    const timer = setTimeout(onArrive, reduce ? 0 : 2800);
    return () => clearTimeout(timer);
  }, [flying, reduce, onArrive]);
  return <Dialog.Root open onOpenChange={open => { if (!open) onArrive(); }}>
    <Dialog.Portal><Dialog.Overlay className="travel-overlay"/><Dialog.Content className="travel-arrival" aria-describedby="arrival-goal">
      <button type="button" className="travel-skip" onClick={onArrive}>{t("Passer", "Skip", "Saltar")[locale]}</button>
      <div className="travel-ticket">YO / ITALIA</div>
      <div className="travel-flight" data-flying={flying} aria-hidden><div className="travel-earth">ITALIA</div><Plane size={64}/><MapYoppo/></div>
      <Dialog.Title>{flying ? t("En route pour l’Italie", "On our way to Italy", "Rumbo a Italia")[locale] : t("L’Italie t’attend", "Italy awaits", "Italia te espera")[locale]}</Dialog.Title>
      <Dialog.Description id="arrival-goal">{t("Un voyage, de vraies conversations. Yoppo vient avec toi.", "A journey into real conversations. Yoppo is coming with you.", "Un viaje hacia conversaciones reales. Yoppo te acompaña.")[locale]}</Dialog.Description>
      {!flying && <button type="button" className="travel-primary" onClick={() => { feedback.step(); setFlying(true); }}>{t("Embarquer", "Board", "Embarcar")[locale]}<ArrowRight size={18}/></button>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
