"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
import type { CafePracticeInvitation } from "@/lib/cafe/practiceInvitation";
import styles from "@/app/cafe/cafe.module.css";

function normalizeCafeLocale(value: string): CafeLocale {
  return value === "en" || value === "es" ? value : "fr";
}

function formatWhen(locale: CafeLocale, startsAt: string) {
  return new Intl.DateTimeFormat(
    locale === "fr" ? "fr-CA" : locale === "es" ? "es" : "en-CA",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    },
  ).format(new Date(startsAt));
}

function languageLabel(copy: (typeof cafeCopy)[CafeLocale], code: string) {
  const value = code.trim().toLowerCase();
  if (value.startsWith("fr")) return copy.languageFr;
  if (value.startsWith("es") || value.startsWith("espa")) return copy.languageEs;
  return code;
}

export function CafePracticeInvitationCard({
  invitation,
  caseLabel,
}: {
  invitation: CafePracticeInvitation;
  caseLabel?: string;
}) {
  const { locale } = useLocale();
  const cafeLocale = normalizeCafeLocale(locale);
  const copy = cafeCopy[cafeLocale];

  if (invitation.kind === "continue") {
    return (
      <section className={styles.inviteCard} aria-labelledby={`invite-continue-${caseLabel ?? "default"}`}>
        {caseLabel ? <p className={styles.inviteEyebrow}>{caseLabel}</p> : null}
        <h2 id={`invite-continue-${caseLabel ?? "default"}`} className={styles.inviteTitle}>
          {copy.inviteContinueTitle}
        </h2>
        <p className={styles.inviteBody}>{copy.inviteContinueBody}</p>
        <Link className={styles.primaryButton} href={invitation.courseReturnPath}>
          {copy.inviteResumeCourse}
        </Link>
      </section>
    );
  }

  const { session, mission, participation } = invitation;

  return (
    <section className={styles.inviteCard} aria-labelledby={`invite-open-${caseLabel ?? "default"}`}>
      {caseLabel ? <p className={styles.inviteEyebrow}>{caseLabel}</p> : null}
      <h2 id={`invite-open-${caseLabel ?? "default"}`} className={styles.inviteTitle}>
        {copy.inviteHeadline}
      </h2>
      <p className={styles.inviteBody}>{copy.inviteBody}</p>

      <dl className={styles.inviteDetails}>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>{copy.inviteLanguage}</dt>
          <dd className={styles.detailValue}>{languageLabel(copy, session.primaryLanguage)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>{copy.inviteTheme}</dt>
          <dd className={styles.detailValue}>{session.title}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>{copy.level}</dt>
          <dd className={styles.detailValue}>{session.level ?? mission.level}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>{copy.inviteWhen}</dt>
          <dd className={styles.detailValue}>{formatWhen(cafeLocale, session.startsAt)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>{copy.inviteDuration}</dt>
          <dd className={styles.detailValue}>{copy.duration(session.durationMinutes)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt className={styles.detailLabel}>{copy.inviteSpots}</dt>
          <dd className={styles.detailValue}>{copy.places(session.remainingSpots)}</dd>
        </div>
      </dl>

      <div className={styles.inviteBox}>
        <p className={styles.listenLine}>{copy.inviteParticipation}</p>
        <ul className={styles.inviteList}>
          {participation.listenFirst ? <li>{copy.inviteListenFirst}</li> : null}
          {participation.speakWhenReady ? <li>{copy.inviteSpeakWhenReady}</li> : null}
          {participation.groupTable ? <li>{copy.inviteGroupTable}</li> : null}
          <li>{copy.reviewExpression(mission.reviewExpression)}</li>
        </ul>
      </div>

      <div className={styles.inviteActions}>
        <Link className={styles.primaryButton} href={invitation.reserveHref}>
          {copy.reserveSeat}
        </Link>
        <Link className={styles.secondaryButton} href={invitation.courseReturnPath}>
          {copy.inviteKeepCourse}
        </Link>
      </div>
    </section>
  );
}
