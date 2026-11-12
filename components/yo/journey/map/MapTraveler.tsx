"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";
import { approvedRoad, roadPoint, type MapRoad } from "./roadGeometry";
import { MapYoppo } from "./MapYoppo";
import { travelerStyles } from "./travelerStyles";

/** Cosmetic position only. Retargeting never writes the learner's progress. */
export function MapTraveler({ index, locale, active = true, road = approvedRoad, initialPosition, onPosition }: {
  index: number; locale: YoLocale; active?: boolean; road?: MapRoad; initialPosition?: number;
  onPosition?: (position: number) => void;
}) {
  const position = useMotionValue(Math.max(0, initialPosition ?? index));
  const left = useTransform(position, value => `${roadPoint(value, road)[0] / road.width * 100}%`);
  const top = useTransform(position, value => `${roadPoint(value, road)[1] / road.height * 100}%`);
  const reduce = useReducedMotion();
  const [animating, setAnimating] = useState(false);
  const walking = animating && active && !reduce;
  const [facing, setFacing] = useState<"left" | "right">("right");
  const lastX = useRef(roadPoint(Math.max(0, initialPosition ?? index), road)[0]);

  useMotionValueEvent(position, "animationStart", () => setAnimating(true));
  useMotionValueEvent(position, "animationComplete", () => setAnimating(false));
  useMotionValueEvent(position, "animationCancel", () => setAnimating(false));

  useMotionValueEvent(position, "change", value => {
    const x = roadPoint(value, road)[0];
    if (Math.abs(x - lastX.current) > .1) setFacing(x > lastX.current ? "right" : "left");
    lastX.current = x;
    onPosition?.(value);
  });

  useEffect(() => {
    if (!active || index < 0 || index > road.segments.length) return;
    const from = position.get();
    if (reduce || Math.abs(from - index) < .001) {
      position.set(index); return;
    }
    // Stopping preserves the actual on-screen point, not the previous destination.
    const travel = animate(position, index, {
      duration: Math.max(.2, Math.abs(index - from) * 2.1), ease: "linear",
    });
    return () => travel.stop();
  }, [index, active, reduce, position, road]);

  if (index < 0) return null;
  const label = {
    fr: walking ? "Yoppo rejoint la ville choisie" : "Yoppo t'attend",
    en: walking ? "Yoppo is walking to your city" : "Yoppo awaits",
    es: walking ? "Yoppo camina hacia tu ciudad" : "Yoppo te espera",
  }[locale];
  return <motion.div data-yoppo-traveler data-destination-index={index} data-motion={walking ? "walking" : "idle"}
    data-facing={facing} className="yo-map-companion" initial={false} style={{ left, top }} role="img" aria-label={label}>
    <style>{travelerStyles}</style>
    <MapYoppo/>
    <span className="yo-map-avatar-fallback" aria-hidden><CompanionAvatar visualId="travel" state="map" locale={locale} size="sm" compact/></span>
  </motion.div>;
}
