"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { canonicalCafeLanguage } from "@/lib/cafe/communityLanguages";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import { CafeCommunityApp, CommunityFrame } from "./CafeCommunityApp";
import { cafeText, communityLocale } from "./copy";
import { useCafeIdentity } from "./useCafeIdentity";
import styles from "./community.module.css";

export function CafeCommunity({ videoEnabled }: { videoEnabled: boolean }) {
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
  if (!identity) return <CommunityFrame locale={locale} courseReturnHref={courseReturnHref}>
    {identity === undefined ? <p className={styles.loading} role="status">{t("Ouverture du Café…", "Opening the Café…", "Abriendo el Café…")}</p> : <section className={`${styles.panel} ${styles.narrow}`}>
      <p className={styles.eyebrow}>{t("Toutes les langues sont les bienvenues", "All languages are welcome", "Todos los idiomas son bienvenidos")}</p>
      <h1 className={styles.title}>{t("Entrez. Dites bonjour.", "Come in. Say hello.", "Entra. Di hola.")}</h1>
      <p className={styles.subtitle}>{t("Rencontrez des personnes qui apprennent, comme vous. Entrez dans un salon, créez le vôtre ou fixez une date. Commencez par écrire et choisissez ensemble si vous voulez vous appeler.", "Meet people who are learning, just like you. Join a room, create your own or pick a date. Start by writing and decide together if you want to call.", "Conoce a personas que aprenden, como tú. Entra en una sala, crea la tuya o elige una fecha. Empiecen escribiendo y decidan juntos si quieren llamarse.")}</p>
      {authError && <p className={styles.error} role="alert">{t("Impossible de vérifier votre session pour le moment.", "We could not verify your session right now.", "No se pudo comprobar tu sesión por el momento.")}</p>}
      <div className={`${styles.row} ${styles.section}`}><a className={styles.primary} href={`/connexion?next=${encodeURIComponent(cafeHref)}`}>{t("Me connecter pour entrer", "Sign in to enter", "Iniciar sesión para entrar")}</a></div>
      <p className={styles.footer}>{t("Réservé aux adultes (18+). Chat d’abord. Appels sur invitation acceptée. Blocage et signalement accessibles dans le Café.", "For adults (18+). Text first. Calls by accepted invitation. Block and report controls are available in the Café.", "Para adultos (18+). Primero texto. Llamadas por invitación aceptada. Puedes bloquear y denunciar en el Café.")}</p>
    </section>}
  </CommunityFrame>;
  return <CafeCommunityApp key={identity.userId} identity={identity} locale={locale} videoEnabled={videoEnabled} initialRoomId={initialRoomId} languageHint={languageHint} courseReturnHref={courseReturnHref} />;
}
