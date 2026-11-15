"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { canonicalCafeLanguage } from "@/lib/cafe/communityLanguages";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import { CafeCommunityApp } from "./CafeCommunityApp";
import { CafeEntranceScreen, CommunityFrame } from "./CafeCommunityChrome";
import { cafeText, communityLocale } from "./copy";
import { useCafeIdentity } from "./useCafeIdentity";
import styles from "./community.module.css";

export function CafeCommunity({ videoEnabled, heroVideoSrc = null }: { videoEnabled: boolean; heroVideoSrc?: string | null }) {
  const { locale: rawLocale } = useLocale();
  const locale = communityLocale(rawLocale);
  const query = useSearchParams();
  const { identity, authError } = useCafeIdentity();
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const courseReturnHref = resolveCafeRoomCourseReturn(query.get("yoReturn") ?? undefined);
  const languageHint = canonicalCafeLanguage(query.get("language"));
  const rawRoom = query.get("salon");
  const initialRoomId = rawRoom && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawRoom) ? rawRoom : null;
  const returnQuery = new URLSearchParams();
  if (courseReturnHref) returnQuery.set("yoReturn", courseReturnHref);
  if (languageHint) returnQuery.set("language", languageHint);
  if (initialRoomId) returnQuery.set("salon", initialRoomId);
  const cafeHref = `/cafe${returnQuery.size ? `?${returnQuery.toString()}` : ""}`;
  if (!identity) return <CommunityFrame locale={locale} courseReturnHref={courseReturnHref} cinematic>
    {identity === undefined ? <p className={styles.loading} role="status">{t("Ouverture du Café…", "Opening the Café…", "Abriendo el Café…")}</p> : <>
      <CafeEntranceScreen locale={locale} heroVideoSrc={heroVideoSrc} enterHref={`/connexion?next=${encodeURIComponent(cafeHref)}`} enterLabel={t("Entrer", "Enter", "Entrar")} />
      {authError && <p className={styles.error} role="alert">{t("Impossible de vérifier votre session pour le moment.", "We could not verify your session right now.", "No se pudo comprobar tu sesión por el momento.")}</p>}
    </>}
  </CommunityFrame>;
  return <CafeCommunityApp key={identity.userId} identity={identity} locale={locale} videoEnabled={videoEnabled} initialRoomId={initialRoomId} languageHint={languageHint} courseReturnHref={courseReturnHref} heroVideoSrc={heroVideoSrc} />;
}
