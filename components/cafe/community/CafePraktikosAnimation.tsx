"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPraktikosLoop, PRAKTIKOS_STATIC_LINE, PRAKTIKOS_WORDS_PER_LOOP } from "@/lib/cafe/praktikosSequence";
import type { CommunityLocale } from "./copy";
import styles from "./community.module.css";

const FADE_MS = 450;
const controls = {
  fr: { pause: "Mettre les mots en pause", resume: "Reprendre les mots" },
  en: { pause: "Pause rotating words", resume: "Resume rotating words" },
  es: { pause: "Pausar las palabras", resume: "Reanudar las palabras" },
};

/** Decorative copy only. This component never reads, resets or controls the video. */
export function CafePraktikosAnimation({ locale = "fr" }: { locale?: CommunityLocale }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState({ cycle: 0, index: 0 });
  const [visible, setVisible] = useState(true);
  // Stable server/first-client render. Each completed loop selects six other entries.
  const sequence = useMemo(() => buildPraktikosLoop(position.cycle * PRAKTIKOS_WORDS_PER_LOOP), [position.cycle]);
  const cue = sequence[position.index] ?? sequence[0]!;
  const copy = controls[locale];

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const syncMotion = () => { setReducedMotion(Boolean(media?.matches)); setVisible(true); };
    const syncVisibility = () => { setHidden(document.hidden); setVisible(true); };
    syncMotion(); syncVisibility();
    media?.addEventListener?.("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      media?.removeEventListener?.("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || hidden || paused) return;
    let fadeOut: number | undefined;
    const hold = window.setTimeout(() => {
      setVisible(false);
      fadeOut = window.setTimeout(() => {
        setPosition(current => current.index + 1 === sequence.length
          ? { cycle: current.cycle + 1, index: 0 }
          : { ...current, index: current.index + 1 });
        setVisible(true);
      }, FADE_MS);
    }, cue.holdMs);
    return () => {
      window.clearTimeout(hold);
      if (fadeOut !== undefined) window.clearTimeout(fadeOut);
    };
  }, [cue.holdMs, position, reducedMotion, hidden, paused, sequence.length]);

  return <div className={styles.praktikosOverlay} data-cafe-praktikos={reducedMotion ? "static" : paused ? "paused" : "live"}>
    {/* Do not announce a changing decorative slogan every two seconds. */}
    <span className={styles.srOnly} lang="fr">Une racine. Mille langues. Le plaisir de pratiquer. Pas besoin de parler parfaitement. Viens pratiquer.</span>
    <div className={styles.praktikos} aria-hidden="true" data-cafe-praktikos-slot>
      <div className={`${styles.praktikosCue} ${visible || reducedMotion || paused ? styles.praktikosCueVisible : ""}`}>
        <p className={styles.praktikosText} lang={reducedMotion || cue.kind === "line" ? "fr" : cue.lang} data-cafe-praktikos-text>
          {reducedMotion ? PRAKTIKOS_STATIC_LINE : cue.text}
        </p>
        <p className={styles.praktikosLang} lang={!reducedMotion && cue.kind === "word" ? cue.lang : "fr"}>
          {!reducedMotion && cue.kind === "word" ? cue.language : "\u00a0"}
        </p>
      </div>
    </div>
    {!reducedMotion && <button type="button" className={styles.praktikosControl} aria-label={paused ? copy.resume : copy.pause} onClick={() => { setVisible(true); setPaused(value => !value); }}>
      <span aria-hidden="true">{paused ? "Aa ▷" : "Aa Ⅱ"}</span>
    </button>}
  </div>;
}
