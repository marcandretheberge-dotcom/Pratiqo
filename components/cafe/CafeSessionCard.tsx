import Link from "next/link";
import type { CafeLocale } from "@/lib/cafe/copy";
import { cafeCopy } from "@/lib/cafe/copy";
import { languagePair, type CafePublicSession } from "@/lib/cafe/publicTypes";
import styles from "@/app/cafe/cafe.module.css";

function formatDate(locale: CafeLocale, value: string) {
  return new Intl.DateTimeFormat(
    locale === "fr" ? "fr-CA" : locale === "es" ? "es" : "en-CA",
    { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  ).format(new Date(value));
}

export function CafeSessionCard({ session, locale }: { session: CafePublicSession; locale: CafeLocale }) {
  const copy = cafeCopy[locale];
  const remaining = Math.max(0, Number(session.remaining_spots) || 0);
  return (
    <article className={styles.sessionCard}>
      <div className={styles.sessionPair}>{languagePair(session)}</div>
      <div className={styles.sessionName}>{session.title}</div>
      <div className={styles.sessionMeta}>
        <span>{formatDate(locale, session.starts_at)}</span>
        <span>{copy.duration(session.duration_minutes)}</span>
        {session.level ? <span>{copy.level} {session.level}</span> : null}
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.seatText}>{remaining === 0 ? copy.full : copy.places(remaining)}</span>
        <Link className={styles.sessionLink} href={`/cafe/${encodeURIComponent(session.slug)}`}>
          {copy.details}
        </Link>
      </div>
    </article>
  );
}
