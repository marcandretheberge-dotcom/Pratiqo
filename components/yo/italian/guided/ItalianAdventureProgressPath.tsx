"use client";

import { motion, useReducedMotion } from "motion/react";
import { ITALIAN_ADVENTURE_PALETTES } from "./ItalianAdventureLandscape";
import {
  ITALIAN_PORTRAIT_ROAD_PATH,
  ITALIAN_WIDE_ROAD_PATH,
} from "./ItalianAdventurePathGeometry";

function ProgressStroke({ d, progress, glow, line }: {
  d: string; progress: number; glow: string; line: string;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: .85, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return <>
    <motion.path
      d={d}
      fill="none"
      stroke={glow}
      strokeWidth="13"
      strokeLinecap="round"
      opacity=".22"
      initial={false}
      animate={{ pathLength: progress }}
      transition={transition}
    />
    <motion.path
      d={d}
      fill="none"
      stroke={line}
      strokeWidth="4"
      strokeLinecap="round"
      opacity=".92"
      initial={false}
      animate={{ pathLength: progress }}
      transition={transition}
    />
  </>;
}

/** Illuminates only the route already implied by canonical course progress. */
export function ItalianAdventureProgressPath({ worldId, progress }: {
  worldId: string; progress: number;
}) {
  const p = ITALIAN_ADVENTURE_PALETTES[worldId] ?? ITALIAN_ADVENTURE_PALETTES.discover;
  const safe = Math.max(0, Math.min(1, progress));
  return <div
    aria-hidden="true"
    data-yoppo-path-progress={safe.toFixed(2)}
    className="pointer-events-none absolute inset-0 z-[6]"
  >
    <svg viewBox="0 0 480 840" preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full lg:hidden">
      <ProgressStroke d={ITALIAN_PORTRAIT_ROAD_PATH} progress={safe} glow={p.sun} line="#fff9d2"/>
    </svg>
    <svg viewBox="0 0 960 640" preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 hidden h-full w-full lg:block">
      <ProgressStroke d={ITALIAN_WIDE_ROAD_PATH} progress={safe} glow={p.sun} line="#fff9d2"/>
    </svg>
  </div>;
}
