"use client";

import { useEffect, useState } from "react";
import styles from "@/app/cafe/cafe.module.css";

const ROOT_WORDS = ["Pratiquer", "Practicar", "Praticare", "Practice", "Praticar"] as const;

type Props = {
  /** When true, skip cycling (accessibility / reduced motion). */
  reducedMotion?: boolean;
};

/**
 * Subtle brand cue: related “practice” roots.
 * Must never overpower the entrance video/poster.
 */
export function CafeBrandRootWords({ reducedMotion = false }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROOT_WORDS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const word = ROOT_WORDS[reducedMotion ? 0 : index] ?? ROOT_WORDS[0];

  return (
    <p className={styles.brandRootWords} aria-hidden="true">
      <span key={word} className={styles.brandRootWord}>
        {word}
      </span>
    </p>
  );
}
