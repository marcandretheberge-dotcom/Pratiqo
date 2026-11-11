"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";
import { italianRoadPoint } from "./ItalianAdventurePathGeometry";
import { ItalianMapYoppo } from "./ItalianMapYoppo";

export { companionRoute } from "./ItalianAdventurePathGeometry";

/** Cosmetic position only. Retargeting never writes the learner's progress. */
export function ItalianMapCompanion({ index, locale, active = true }: { index: number; locale: YoLocale; active?: boolean }) {
  const position = useMotionValue(Math.max(0, index));
  const left = useTransform(position, value => `${italianRoadPoint(value)[0] / 480 * 100}%`);
  const top = useTransform(position, value => `${italianRoadPoint(value)[1] / 600 * 100}%`);
  const reduce = useReducedMotion();
  const [animating, setAnimating] = useState(false);
  const walking = animating && active && !reduce;
  const [facing, setFacing] = useState<"left" | "right">("right");
  const lastX = useRef(italianRoadPoint(Math.max(0, index))[0]);

  useMotionValueEvent(position, "animationStart", () => setAnimating(true));
  useMotionValueEvent(position, "animationComplete", () => setAnimating(false));
  useMotionValueEvent(position, "animationCancel", () => setAnimating(false));

  useMotionValueEvent(position, "change", value => {
    const x = italianRoadPoint(value)[0];
    if (Math.abs(x - lastX.current) > .1) setFacing(x > lastX.current ? "right" : "left");
    lastX.current = x;
  });

  useEffect(() => {
    if (!active || index < 0 || index > 3) return;
    const from = position.get();
    if (reduce || Math.abs(from - index) < .001) {
      position.set(index); return;
    }
    // Stopping preserves the actual on-screen point, not the previous destination.
    const travel = animate(position, index, {
      duration: Math.max(.2, Math.abs(index - from) * 2.1), ease: "linear",
    });
    return () => travel.stop();
  }, [index, active, reduce, position]);

  if (index < 0) return null;
  const label = {
    fr: walking ? "Yoppo rejoint la ville choisie" : "Yoppo t'attend",
    en: walking ? "Yoppo is walking to your city" : "Yoppo awaits",
    es: walking ? "Yoppo camina hacia tu ciudad" : "Yoppo te espera",
  }[locale];
  return <motion.div data-yoppo-traveler data-destination-index={index} data-motion={walking ? "walking" : "idle"}
    data-facing={facing} className="yo-map-companion" initial={false} style={{ left, top }} role="img" aria-label={label}>
    <ItalianMapYoppo/>
    <span className="yo-map-avatar-fallback" aria-hidden><CompanionAvatar visualId="travel" state="map" locale={locale} size="sm" compact/></span>
  </motion.div>;
}
