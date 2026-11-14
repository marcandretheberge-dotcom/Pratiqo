"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CafeSessionCard } from "@/components/cafe/CafeSessionCard";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
import type { CafePublicSession } from "@/lib/cafe/publicTypes";
import {
  getCafePracticeLanguage,
  type CafePracticeLanguageCode,
} from "@/lib/cafe/practiceLanguages";
import type { CafeSocialFlags } from "@/lib/cafe/socialFeatureFlags";
import styles from "@/app/cafe/cafe.module.css";

type Mode = "group" | "pair";

type Props = {
  locale: CafeLocale;
  practiceLanguage: CafePracticeLanguageCode;
  flags: CafeSocialFlags;
  sessions: CafePublicSession[];
  sessionsStatus: "idle" | "loading" | "ready" | "opening" | "error";
  onChangeLanguage: () => void;
  onBack: () => void;
};

/**
 * Live café chrome: members | lounge | tables.
 * Presence/chat wire up behind their flags; empty café stays usable.
 */
export function CafeLiveRoom({
  locale,
  practiceLanguage,
  flags,
  sessions,
  sessionsStatus,
  onChangeLanguage,
  onBack,
}: Props) {
  const copy = cafeCopy[locale];
  const language = getCafePracticeLanguage(practiceLanguage);
  const [mode, setMode] = useState<Mode>("group");
  const sortedSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => {
          const lang = (session.primary_language || "").toLowerCase();
          return (
            lang === practiceLanguage
            || lang.startsWith(`${practiceLanguage}-`)
            || lang.includes(language?.nativeName.toLowerCase() ?? "___")
          );
        })
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [sessions, practiceLanguage, language?.nativeName],
  );

  const onlineCount = 0; // Real presence fills this when CAFE_PRESENCE_ENABLED.

  return (
    <section className={`${styles.liveShell} ${styles.fadeIn}`} aria-labelledby="cafe-live-title">
      <header className={styles.liveHeader}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← {copy.back}
        </button>
        <div className={styles.liveHeaderMain}>
          <p className={styles.eyebrow}>{copy.liveCafeEyebrow}</p>
          <h2 id="cafe-live-title" className={styles.liveTitle} tabIndex={-1}>
            {language?.nativeName ?? practiceLanguage}
          </h2>
          <p className={styles.connectedLine} aria-live="polite">
            {copy.connectedCount(onlineCount)}
          </p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onChangeLanguage}>
          {copy.changePracticeLanguage}
        </button>
      </header>

      <div className={styles.modeSwitch} role="tablist" aria-label={copy.choose}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "group"}
          className={mode === "group" ? styles.modeTabActive : styles.modeTab}
          onClick={() => setMode("group")}
        >
          {copy.modeGroup}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pair"}
          className={mode === "pair" ? styles.modeTabActive : styles.modeTab}
          onClick={() => setMode("pair")}
          disabled={!flags.privateChat}
        >
          {copy.modePair}
        </button>
      </div>

      <div className={styles.liveGrid}>
        <aside className={styles.liveMembers} aria-labelledby="cafe-members-title">
          <h3 id="cafe-members-title" className={styles.liveColumnTitle}>
            {copy.membersTitle}
          </h3>
          {flags.presence ? (
            <p className={styles.noticeCard}>{copy.membersEmpty}</p>
          ) : (
            <p className={styles.noticeCard}>{copy.philosophy}</p>
          )}
        </aside>

        <div className={styles.liveConversation} aria-labelledby="cafe-lounge-title">
          <h3 id="cafe-lounge-title" className={styles.liveColumnTitle}>
            {mode === "group" ? copy.loungeTitle : copy.modePair}
          </h3>
          {mode === "pair" && !flags.privateChat ? (
            <p className={styles.noticeCard}>{copy.pairDisabled}</p>
          ) : null}
          {mode === "pair" && flags.privateChat ? (
            <p className={styles.noticeCard}>{copy.pairEmpty}</p>
          ) : null}
          {mode === "group" ? (
            <>
              <p className={styles.noticeCard}>
                {flags.loungeChat ? copy.loungeEmpty : copy.philosophy}
              </p>
              {flags.loungeChat ? (
                <form
                  className={styles.loungeComposer}
                  onSubmit={(event) => {
                    event.preventDefault();
                    // Wired in the lounge-chat API pass.
                  }}
                >
                  <label className={styles.srOnly} htmlFor="cafe-lounge-input">
                    {copy.loungeComposerPlaceholder}
                  </label>
                  <input
                    id="cafe-lounge-input"
                    className={styles.searchInput}
                    type="text"
                    maxLength={500}
                    placeholder={copy.loungeComposerPlaceholder}
                    disabled
                  />
                  <button type="submit" className={styles.primaryButton} disabled>
                    {copy.loungeSend}
                  </button>
                </form>
              ) : (
                <p className={styles.practiceHint}>{copy.startConversation}</p>
              )}
            </>
          ) : null}
        </div>

        <aside className={styles.liveTables} aria-labelledby="cafe-tables-title">
          <h3 id="cafe-tables-title" className={styles.liveColumnTitle}>
            {copy.tablesTitle}
          </h3>
          {sessionsStatus === "loading" ? <p className={styles.noticeCard}>{copy.loading}</p> : null}
          {sessionsStatus === "error" ? <p className={styles.noticeCard}>{copy.error}</p> : null}
          {sessionsStatus === "opening" || (sessionsStatus === "ready" && sortedSessions.length === 0) ? (
            <p className={styles.noticeCard}>{copy.tablesEmptyLoungeOpen}</p>
          ) : null}
          {sessionsStatus === "ready" && sortedSessions.length > 0 ? (
            <div className={styles.sessionList}>
              {sortedSessions.map((session) => (
                <CafeSessionCard key={session.slug} session={session} locale={locale} />
              ))}
            </div>
          ) : null}
          <Link className={styles.privacyLink} href="/legal/confidentialite">
            {copy.privacy}
          </Link>
        </aside>
      </div>
    </section>
  );
}
