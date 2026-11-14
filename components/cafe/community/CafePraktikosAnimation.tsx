"use client";

import { useEffect, useState } from "react";
import { buildPraktikosLoop, PRAKTIKOS_STATIC_LINE, type PraktikosCue } from "@/lib/cafe/praktikosSequence";
import styles from "./community.module.css";

const FADE_MS = 450;

/**
 * Fixed-position entrance copy: one cue at a time, opacity crossfade only.
 * Container height is reserved for the longest brand line so layout never shifts.
 */
export function CafePraktikosAnimation() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [sequence] = useState(() => buildPraktikosLoop(Math.floor(Date.now() / 60_000)));
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(Boolean(media?.matches));
    sync();
    media?.addEventListener?.("change", sync);
    return () => media?.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion || sequence.length === 0) return;
    const cue = sequence[index] ?? sequence[0]!;
    let fadeOut: number | undefined;
    const hold = window.setTimeout(() => {
      setVisible(false);
      fadeOut = window.setTimeout(() => {
        setIndex((current) => (current + 1) % sequence.length);
        setVisible(true);
      }, FADE_MS);
    }, cue.holdMs);
    return () => {
      window.clearTimeout(hold);
      if (fadeOut !== undefined) window.clearTimeout(fadeOut);
    };
  }, [index, reducedMotion, sequence]);

  if (reducedMotion) {
    return <div className={styles.praktikos} data-cafe-praktikos="static" aria-live="polite">
      <p className={styles.praktikosText}>{PRAKTIKOS_STATIC_LINE}</p>
    </div>;
  }

  const cue: PraktikosCue = sequence[index] ?? sequence[0]!;
  return <div className={styles.praktikos} data-cafe-praktikos="live" aria-live="polite" aria-atomic="true">
    <div className={`${styles.praktikosCue} ${visible ? styles.praktikosCueVisible : ""}`}>
      <p className={styles.praktikosText}>{cue.text}</p>
      {cue.kind === "word" && <p className={styles.praktikosLang}>{cue.language}</p>}
    </div>
  </div>;
}
