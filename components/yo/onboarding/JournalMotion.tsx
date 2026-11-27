"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import motion from "@/lib/yo/onboarding/journalMotion.json";

export type Gesture = keyof typeof motion.frames;
type Sheets = Map<string, Promise<HTMLImageElement>>;
export const journalPoster = "/companion/travel/journal/yoppo-listen.webp";

function loadSheet(cache: Sheets, gesture: Gesture, sheet: number) {
  const src = `/companion/travel/journal/yoppo-${gesture}-${sheet}.webp`;
  const cached = cache.get(src);
  if (cached) return cached;

  // One gesture occupies at most three sheets. Release older references as the learner advances.
  if (cache.size >= 3) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  const image = new Image();
  image.src = src;
  const ready = image.decode().then(() => image).catch((error) => {
    if (cache.get(src) === ready) cache.delete(src);
    throw error;
  });
  cache.set(src, ready);
  return ready;
}

export function JournalMotion({ gesture, paused, cache }: {
  gesture: Gesture; paused: boolean; cache: RefObject<Sheets>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // The parent keys a performance by the answer. Pausing it preserves the current pose.
  const cursor = useRef({ gesture, frame: 0 });

  useLayoutEffect(() => {
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!surface || !ctx || paused) return;
    const { cell, crop, columns, framesPerSheet, fps } = motion;
    let timer = 0;
    let generation = 0;

    const paint = async (ticket: number) => {
      const pose = cursor.current;
      const sheet = Math.floor(pose.frame / framesPerSheet);
      let image: HTMLImageElement;
      try {
        image = await loadSheet(cache.current, pose.gesture, sheet);
      } catch {
        // Keep the complete first portrait when a sheet cannot be decoded.
        if (ticket === generation) ctx.clearRect(0, 0, motion.stage.width, motion.stage.height);
        return;
      }
      if (ticket !== generation || document.hidden) return;

      const index = pose.frame % framesPerSheet;
      ctx.drawImage(image, (index % columns) * cell.width, Math.floor(index / columns) * cell.height,
        cell.width, cell.height, crop.x, crop.y, crop.width, crop.height);
      surface.dataset.gesture = pose.gesture;
      surface.dataset.frame = String(pose.frame);

      const count = motion.frames[pose.gesture];
      // Warm the next sheet shortly before its boundary, leaving the current pose on screen.
      if (index === framesPerSheet - 8 && pose.frame + 8 < count) {
        void loadSheet(cache.current, pose.gesture, sheet + 1).catch(() => {});
      }
      if (pose.frame === count - 1) {
        pose.gesture = "listen";
        pose.frame = 0;
      } else {
        pose.frame++;
      }
      timer = window.setTimeout(() => { void paint(ticket); }, 1000 / fps);
    };

    function syncVisibility() {
      window.clearTimeout(timer);
      generation++;
      if (!document.hidden) void paint(generation);
    }
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      generation++;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [cache, paused]);

  return <canvas ref={canvas} width={motion.stage.width} height={motion.stage.height}/>;
}
