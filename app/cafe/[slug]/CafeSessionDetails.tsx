"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { useLocale } from "@/lib/locale-context";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
import { languagePair, type CafePublicSession } from "@/lib/cafe/publicTypes";
import {
  attemptCafeReserve,
  buildCafeReservationLoginHref,
  buildCafeSessionPath,
  parseYoCafeContext,
  reconcileCafeSeatState,
  type CafeSeatState,
} from "@/lib/cafe/reservationClient";
import { getSupabaseClient } from "@/lib/supabase";
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

type ReserveUi =
  | { kind: "idle" }
  | { kind: "signing_in" }
  | { kind: "ready"; expectedVersion: number }
  | { kind: "reserving" }
  | { kind: "confirmed"; version: number }
  | { kind: "error"; message: string; expectedVersion: number };

function reserveUiFromSeat(seat: CafeSeatState): Extract<ReserveUi, { kind: "ready" | "confirmed" }> {
  if (seat.kind === "confirmed") {
    return { kind: "confirmed", version: seat.version };
  }
  return { kind: "ready", expectedVersion: seat.expectedVersion };
}

export function CafeSessionDetails({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const cafeLocale = normalizeCafeLocale(locale);
  const copy = cafeCopy[cafeLocale];
  const [session, setSession] = useState<CafePublicSession | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reserveUi, setReserveUi] = useState<ReserveUi>({ kind: "idle" });
  const [expectedVersion, setExpectedVersion] = useState(0);
  const pendingRequestIdRef = useRef<string | null>(null);
  const yo = parseYoCafeContext(searchParams);
  const cafePath = useMemo(
    () =>
      buildCafeSessionPath({
        slug,
        fromYo: yo.fromYo,
        yoReturn: yo.yoReturn,
        yoExpression: yo.yoExpression,
        yoMission: yo.yoMission,
      }),
    [slug, yo.fromYo, yo.yoReturn, yo.yoExpression, yo.yoMission],
  );
  const loginHref = buildCafeReservationLoginHref(cafePath);

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

  useEffect(() => {
    let active = true;
    if (status !== "ready" || !session) return;

    void (async () => {
      try {
        const token = await getClientAccessToken(getSupabaseClient());
        if (!active) return;
        if (!token) {
          setReserveUi({ kind: "signing_in" });
          return;
        }
        const reconciled = await reconcileCafeSeatState({ slug, accessToken: token });
        if (!active) return;
        if (!reconciled.ok) {
          setExpectedVersion(0);
          setReserveUi({ kind: "ready", expectedVersion: 0 });
          return;
        }
        setExpectedVersion(reconciled.seat.expectedVersion);
        setReserveUi(reserveUiFromSeat(reconciled.seat));
      } catch {
        if (!active) return;
        setExpectedVersion(0);
        setReserveUi({ kind: "ready", expectedVersion: 0 });
      }
    })();

    return () => {
      active = false;
    };
  }, [status, session, slug]);

  const remaining = useMemo(
    () => Math.max(0, Number(session?.remaining_spots) || 0),
    [session?.remaining_spots],
  );

  const yoReturnLink = yo.yoReturn ? (
    <p className={styles.yoReturnRow}>
      <Link className={styles.yoReturnLink} href={yo.yoReturn}>
        {copy.returnToCourse}
      </Link>
    </p>
  ) : null;

  const yoContext = yo.fromYo && (yo.yoExpression || yo.yoReturn) ? (
    <div className={styles.yoContextNote}>
      {yo.yoExpression ? <p>{copy.reviewExpression(yo.yoExpression)}</p> : null}
      {yoReturnLink}
    </div>
  ) : yo.yoReturn ? (
    <div className={styles.yoContextNote}>{yoReturnLink}</div>
  ) : null;

  async function onReserve(versionForAttempt: number) {
    setReserveUi({ kind: "reserving" });
    setExpectedVersion(versionForAttempt);
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) {
        setReserveUi({ kind: "signing_in" });
        return;
      }

      const requestId = pendingRequestIdRef.current ?? crypto.randomUUID();
      pendingRequestIdRef.current = requestId;

      const result = await attemptCafeReserve({
        slug,
        expectedVersion: versionForAttempt,
        requestId,
        accessToken: token,
      });

      setExpectedVersion(result.seat.expectedVersion);

      if (result.ok) {
        pendingRequestIdRef.current = null;
        setReserveUi(reserveUiFromSeat(result.seat));
        return;
      }

      if (!result.reuseRequestId) {
        pendingRequestIdRef.current = null;
      }

      const message =
        result.code === "capacity_full" ? copy.reserveFull
        : result.code === "session_unavailable" || result.code === "not_found"
          ? copy.reserveUnavailable
          : copy.reserveFailed;

      if (result.seat.kind === "confirmed") {
        setReserveUi(reserveUiFromSeat(result.seat));
        return;
      }

      setReserveUi({
        kind: "error",
        message,
        expectedVersion: result.seat.expectedVersion,
      });
    } catch {
      setReserveUi({
        kind: "error",
        message: copy.reserveFailed,
        expectedVersion: versionForAttempt,
      });
    }
  }

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

          {status === "loading" || status === "error" ? yoContext : null}

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

              {reserveUi.kind === "signing_in" ? (
                <Link className={styles.primaryButton} href={loginHref}>
                  {copy.reserveSignIn}
                </Link>
              ) : null}

              {reserveUi.kind === "ready" && remaining > 0 ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => void onReserve(reserveUi.expectedVersion)}
                >
                  {copy.reserveSeat}
                </button>
              ) : null}

              {reserveUi.kind === "ready" && remaining === 0 ? (
                <>
                  <button type="button" className={styles.disabledReservation} disabled>
                    {copy.full}
                  </button>
                  <p className={styles.reservationNote}>{copy.reserveFull}</p>
                </>
              ) : null}

              {reserveUi.kind === "reserving" ? (
                <button type="button" className={styles.disabledReservation} disabled>
                  {copy.reserving}
                </button>
              ) : null}

              {reserveUi.kind === "confirmed" ? (
                <>
                  <p className={styles.reservationNote} role="status">{copy.reserved}</p>
                  {yo.yoReturn ? (
                    <Link className={styles.primaryButton} href={yo.yoReturn}>
                      {copy.returnToCourse}
                    </Link>
                  ) : null}
                </>
              ) : null}

              {reserveUi.kind === "error" ? (
                <>
                  <p className={styles.reservationNote} role="alert">{reserveUi.message}</p>
                  {remaining > 0 ? (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => void onReserve(reserveUi.expectedVersion)}
                    >
                      {copy.reserveSeat}
                    </button>
                  ) : null}
                </>
              ) : null}

              {reserveUi.kind === "idle" ? (
                <button type="button" className={styles.disabledReservation} disabled>
                  {copy.loading}
                </button>
              ) : null}

              {yoContext}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
