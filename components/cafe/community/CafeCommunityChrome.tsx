"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CafeHeroMedia } from "@/components/cafe/CafeHeroMedia";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import { CafePraktikosAnimation } from "./CafePraktikosAnimation";
import { cafeText, type CommunityLocale } from "./copy";
import styles from "./community.module.css";

export function CommunityFrame({ locale, courseReturnHref, children, compact = false, cinematic = false, people = false }: {
  locale: CommunityLocale; courseReturnHref?: string | null; children: ReactNode; compact?: boolean; cinematic?: boolean; people?: boolean;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const back = resolveCafeRoomCourseReturn(courseReturnHref ?? undefined);
  return <main className={`${styles.page} ${cinematic ? styles.cinematic : ""} ${people && !cinematic ? styles.peopleTheme : ""}`} lang={locale} data-cafe-screen={cinematic ? "cinematic" : "standard"}>
    <header className={`${styles.topbar} ${cinematic ? styles.topbarCinematic : ""}`}><div className={styles.topbarInner}>
      {/* Full-document entry resets this private room view and tears down its presence lease. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className={styles.brand} href="/cafe">Café des langues <small>{t("par Pratiqo", "by Pratiqo", "por Pratiqo")}</small></a>
      <nav className={styles.topLinks} aria-label={t("Navigation Café", "Café navigation", "Navegación del Café")}>
        {back && <a href={back}>{t("Retour à mon parcours", "Back to my learning", "Volver a mi curso")}</a>}
        <Link href="/" prefetch={false}>Pratiqo</Link><Link href="/yo" prefetch={false}>YoPratiqo</Link>
      </nav>
    </div></header>
    <div className={`${styles.wrap} ${compact ? styles.activeWrap : ""} ${cinematic ? styles.wrapCinematic : ""}`}>{children}</div>
  </main>;
}

/** Screen 1 — video with its own invitations, Praktikos below, title, Entrer CTA. */
export function CafeEntranceScreen({ locale, heroVideoSrc = null, onEnter, enterHref, enterLabel }: {
  locale: CommunityLocale; heroVideoSrc?: string | null; onEnter?: () => void; enterHref?: string; enterLabel?: string;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const label = enterLabel ?? t("Entrer", "Enter", "Entrar");
  return <section className={styles.screen} data-cafe-step="entrance" aria-labelledby="cafe-entrance-title">
    {/* No overlay: CafeHeroMedia keeps its original in-film invitation captions. */}
    <CafeHeroMedia locale={locale} videoSrc={heroVideoSrc} className={styles.entranceFilm} />
    <CafePraktikosAnimation locale={locale} />
    <h1 id="cafe-entrance-title" className={styles.entranceTitle}>Café des langues</h1>
    {enterHref ? <a className={styles.primary} href={enterHref}>{label}</a> : <button className={styles.primary} type="button" onClick={onEnter}>{label}</button>}
  </section>;
}
