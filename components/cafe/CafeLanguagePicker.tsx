"use client";

import { useMemo, useState } from "react";
import {
  type CafePracticeLanguageCode,
  searchCafePracticeLanguages,
} from "@/lib/cafe/practiceLanguages";
import type { CafeLocale } from "@/lib/cafe/copy";
import { cafeCopy } from "@/lib/cafe/copy";
import styles from "@/app/cafe/cafe.module.css";

type Props = {
  locale: CafeLocale;
  selected: CafePracticeLanguageCode | null;
  onSelect: (code: CafePracticeLanguageCode) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function CafeLanguagePicker({ locale, selected, onSelect, onContinue, onBack }: Props) {
  const copy = cafeCopy[locale];
  const [query, setQuery] = useState("");
  const languages = useMemo(() => searchCafePracticeLanguages(query), [query]);

  return (
    <section className={`${styles.stage} ${styles.fadeIn}`} aria-labelledby="cafe-practice-lang-title">
      <div className={styles.panel}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← {copy.back}
        </button>
        <h2 id="cafe-practice-lang-title" className={styles.choiceHeading} tabIndex={-1}>
          {copy.practiceLanguageTitle}
        </h2>
        <p className={styles.practiceHint}>{copy.practiceLanguageHint}</p>
        <p className={styles.philosophyLine}>{copy.philosophy}</p>
        <label className={styles.searchLabel} htmlFor="cafe-practice-lang-search">
          {copy.practiceLanguageSearch}
        </label>
        <input
          id="cafe-practice-lang-search"
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <ul className={styles.languageList} role="listbox" aria-label={copy.practiceLanguageTitle}>
          {languages.map((lang) => {
            const active = selected === lang.code;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? styles.languageOptionActive : styles.languageOption}
                  onClick={() => onSelect(lang.code)}
                >
                  <span className={styles.languageNative}>{lang.nativeName}</span>
                  <span className={styles.languageCode}>{lang.code}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {languages.length === 0 ? (
          <p className={styles.noticeCard}>{copy.practiceLanguageSearch}</p>
        ) : null}
        <div className={styles.roomActions}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!selected}
            onClick={onContinue}
          >
            {copy.practiceLanguageContinue}
          </button>
        </div>
      </div>
    </section>
  );
}
