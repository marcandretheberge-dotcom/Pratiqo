"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
import { languagePair, type CafePublicSession } from "@/lib/cafe/publicTypes";
import styles from "../cafe.module.css";

function normalizeCafeLocale(value: string): CafeLocale {
  return value === "en" || value === "es" ? value : "fr";
}

function formatDate(locale: CafeLocale, value: string) {
  return new Intl.DateTimeFormat(
    locale === "fr" ? "fr-CA" : locale === "es" ? "es" : "en-CA",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

export function CafeSessionDetails({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const cafeLocale = normalizeCafeLocale(locale);
  const copy = cafeCopy[cafeLocale];
  const [session, setSession] = useState<CafePublicSession | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    void fetch(`/api/cafe/sessions?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("session unavailable");
        return response.json() as Promise<{ sessions?: CafePublicSession[] }>;
      })
      .then((body) => {
        if (!active) return;
        const first = Array.isArray(body.sessions) ? body.sessions[0] ?? null : null;
        setSession(first);
        setStatus(first ? "ready" : "error");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (status === "ready") headingRef.current?.focus();
  }, [status]);

  const remaining = useMemo(
    () => Math.max(0, Number(session?.remaining_spots) || 0),
    [session?.remaining_spots],
  );

  return (
    <main className={styles.shell} lang={cafeLocale}>
      <div className={styles.sessionPage}>
        <div className={styles.sessionInner}>
          <Link className={styles.backButton} href="/cafe">
            ← {copy.sessionBack}
          </Link>

          <div role="status" aria-live="polite" aria-atomic="true">
            {status === "loading" ? <div className={styles.noticeCard}>{copy.loading}</div> : null}
            {status === "error" ? <div className={styles.noticeCard}>{copy.unavailable}</div> : null}
          </div>

          {status === "ready" && session ? (
            <section className={styles.sessionHero} aria-labelledby="session-title">
              <h1 id="session-title" ref={headingRef} tabIndex={-1} className={styles.sessionTitle}>{languagePair(session)}</h1>
              <p className={styles.subtitle}>{session.title}</p>

              <div className={styles.sessionBox}>
                <p className={styles.listenLine}>{copy.listen}</p>
                <div className={styles.sessionDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{formatDate(cafeLocale, session.starts_at)}</span>
                    <span className={styles.detailValue}>{copy.duration(session.duration_minutes)}</span>
                  </div>
                  {session.level ? (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>{copy.level}</span>
                      <span className={styles.detailValue}>{session.level}</span>
                    </div>
                  ) : null}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{copy.availability}</span>
                    <span className={styles.detailValue}>{remaining === 0 ? copy.full : copy.places(remaining)}</span>
                  </div>
                </div>
              </div>

              <button type="button" className={styles.disabledReservation} disabled>
                {copy.reservationSoon}
              </button>
              <p className={styles.reservationNote}>{copy.reservationNote}</p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
