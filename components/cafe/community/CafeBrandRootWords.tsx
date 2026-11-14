"use client";

import { useEffect, useState } from "react";
import styles from "./community.module.css";

const ROOT_WORDS = ["Pratiquer", "Practicar", "Praticare", "Practice", "Praticar"] as const;

/** Subtle shared-root cue under the entrance film. Never interrupts entry. */
export function CafeBrandRootWords() {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(Boolean(media?.matches));
    sync();
    media?.addEventListener?.("change", sync);
    return () => media?.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROOT_WORDS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const word = ROOT_WORDS[reducedMotion ? 0 : index] ?? ROOT_WORDS[0];
  return <p className={styles.brandRootWords} aria-hidden="true"><span key={word} className={styles.brandRootWord}>{word}</span></p>;
}
