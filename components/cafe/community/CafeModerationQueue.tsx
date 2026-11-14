"use client";

import { useEffect, useRef, useState } from "react";
import { getCafeReports, reviewCafeReport } from "@/lib/cafe/communityClient";
import type { CafeModerationReport } from "@/lib/cafe/communityTypes";
import { useLocale } from "@/lib/locale-context";
import { cafeLocalDate } from "@/lib/cafe/communityLanguages";
import { useCafeIdentity } from "./useCafeIdentity";
import { CommunityFrame } from "./CafeCommunityApp";
import { cafeText, communityError, communityLocale } from "./copy";
import styles from "./community.module.css";

export function CafeModerationQueue() {
  const { identity } = useCafeIdentity();
  const { locale: rawLocale } = useLocale();
  const locale = communityLocale(rawLocale);
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const [reports, setReports] = useState<CafeModerationReport[] | null>(null);
  const [reportsFor, setReportsFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const epoch = useRef(0);
  useEffect(() => {
    const generation = ++epoch.current;
    if (!identity) return;
    const controller = new AbortController();
    void getCafeReports(identity.accessToken, controller.signal).then((result) => {
      if (generation !== epoch.current || controller.signal.aborted) return;
      setReportsFor(identity.userId); setPending(null);
      if (result.ok) { setReports(result.reports); setError(null); }
      else { setReports(null); setError(result.code); }
    }).catch(() => {
      if (!controller.signal.aborted && generation === epoch.current) { setReports(null); setReportsFor(identity.userId); setError("unavailable"); setPending(null); }
    });
    return () => { epoch.current = generation + 1; controller.abort(); };
  }, [identity, refresh]);
  const visibleReports = identity?.userId === reportsFor ? reports : null;
  return <CommunityFrame locale={locale}>
    <div className={styles.intro}><div><p className={styles.eyebrow}>Pratiqo · Café</p><h1 className={styles.title}>{t("Signalements à examiner", "Reports to review", "Denuncias para revisar")}</h1><p className={styles.subtitle}>{t("Accès réservé à l’équipe autorisée. Chaque signalement contient uniquement les messages sélectionnés par son auteur.", "For the authorised team. Each report contains only the messages selected by the reporter.", "Acceso para el equipo autorizado. Cada denuncia contiene solo los mensajes seleccionados por quien la envía.")}</p></div><button className={styles.button} onClick={() => setRefresh((value) => value + 1)}>{t("Actualiser", "Refresh", "Actualizar")}</button></div>
    {identity === undefined && <p role="status">{t("Vérification de la session…", "Checking your session…", "Comprobando tu sesión…")}</p>}
    {identity === null && <a className={styles.primary} href="/connexion?next=%2Fadmin%2Fcafe%2Fcommunity">{t("Me connecter", "Sign in", "Iniciar sesión")}</a>}
    {error && <p className={styles.error} role="alert">{communityError(error, locale)}</p>}
    {identity && !visibleReports && !error && <p role="status">{t("Chargement…", "Loading…", "Cargando…")}</p>}
    {identity && visibleReports && visibleReports.length === 0 && <p className={styles.notice}>{t("Aucun signalement à afficher.", "There are no reports to display.", "No hay denuncias para mostrar.")}</p>}
    {identity && <div className={styles.stack}>{visibleReports?.map((report) => <article key={report.id} className={styles.panel}>
      <div className={styles.spread}><h2 className={styles.heading}>{report.target.displayName}</h2><span className={styles.badge}>{report.status === "reviewed" ? t("Examiné", "Reviewed", "Revisada") : t("À examiner", "To review", "Por revisar")}</span></div>
      <p className={styles.small}>{cafeLocalDate(report.createdAt, locale)} · {t("Signalé par", "Reported by", "Denunciado por")} {report.reporter.displayName}</p>
      <p>{report.reason === "sexual_harassment" ? t("Propos sexuels non souhaités", "Unwanted sexual comments", "Comentarios sexuales no deseados") : report.reason === "harassment" ? t("Harcèlement", "Harassment", "Acoso") : report.reason === "spam" ? "Spam" : t("Autre", "Other", "Otro")}</p>
      {report.details && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{report.details}</p>}
      {report.messages.map((message) => <blockquote className={styles.soft} key={message.id} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><span className={styles.small}>{cafeLocalDate(message.createdAt, locale)}</span><p>{message.body}</p></blockquote>)}
      {report.status === "open" && <button className={styles.primary} disabled={pending !== null} onClick={async () => {
        const generation = epoch.current; setPending(report.id); setError(null);
        try {
          const result = await reviewCafeReport(identity.accessToken, report.id);
          if (generation !== epoch.current) return;
          if (result.ok) setRefresh((value) => value + 1); else setError(result.code);
        } catch { if (generation === epoch.current) setError("unavailable"); }
        finally { if (generation === epoch.current) setPending(null); }
      }}>{t("Marquer comme examiné", "Mark as reviewed", "Marcar como revisada")}</button>}
    </article>)}</div>}
  </CommunityFrame>;
}
