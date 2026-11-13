"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CafeIdentity } from "@/lib/cafe/communityClient";
import { cafeCommunityCallTransport, type CafeCommunityCallTransport } from "@/lib/cafe/communityCallClient";
import type { CafeMember, CafeReportReason } from "@/lib/cafe/communityTypes";
import { CafeDailyJoinGeneration, clearCafeDailyCallSlot, destroyCafeDailyCall, waitForCafeDailyTeardown, runCafeDailyJoinAttempt, type CafeDailyCallHandle } from "@/lib/cafe/dailyRoomSession";
import styles from "./communityCall.module.css";

type Locale = "fr" | "en" | "es";
type Phase = "loading" | "ready" | "joining" | "connected" | "ended" | "error";
const copy = {
  fr: {
    title: "Un moment pour échanger", loading: "Vérification de votre invitation…", ready: "Votre invitation a été acceptée.",
    intro: "Choisissez ce que vous souhaitez partager. Vous pouvez garder votre caméra et votre micro éteints.",
    camera: "Activer ma caméra", microphone: "Activer mon micro", join: "Rejoindre l’appel", joining: "Connexion…", leave: "Terminer l’appel",
    back: "Retour au salon texte", course: "Retour à mon cours", ended: "L’appel est terminé. Vous pouvez continuer à écrire dans le salon.",
    error: "L’appel est indisponible. Votre caméra et votre micro ont été arrêtés.", login: "Connectez-vous pour retrouver votre invitation.", signIn: "Se connecter",
    block: "Bloquer cette personne", blocked: "Cette personne est bloquée. L’appel est terminé.", blockFailed: "L’appel a été arrêté ici, mais le blocage n’a pas été enregistré. Réessayez.",
    report: "Signaler", reportTitle: "Signaler cette personne", reason: "Motif", details: "Précisions (facultatif)", submit: "Envoyer le signalement", cancel: "Annuler",
    sexual: "Commentaires ou comportement sexuels", harassment: "Harcèlement", spam: "Spam", other: "Autre", reported: "Votre signalement a été reçu.",
    reportFailed: "Le signalement n’a pas été enregistré. Réessayez.", evidence: "Décrivez ce qui s’est passé. Pratiqo n’enregistre pas cet appel.",
    ending: "La fermeture côté serveur est en cours. Votre caméra et votre micro sont arrêtés.", with: "Avec", heading: "Café des langues", until: "Fin au plus tard à",
  },
  en: {
    title: "A moment to connect", loading: "Checking your invitation…", ready: "Your invitation has been accepted.",
    intro: "Choose what you want to share. Your camera and microphone can stay off.",
    camera: "Turn on my camera", microphone: "Turn on my microphone", join: "Join the call", joining: "Connecting…", leave: "End the call",
    back: "Back to text chat", course: "Back to my course", ended: "The call has ended. You can keep writing in the text room.",
    error: "The call is unavailable. Your camera and microphone have been stopped.", login: "Sign in to find your invitation.", signIn: "Sign in",
    block: "Block this person", blocked: "This person is blocked. The call has ended.", blockFailed: "The call stopped here, but the block was not saved. Please try again.",
    report: "Report", reportTitle: "Report this person", reason: "Reason", details: "Details (optional)", submit: "Send report", cancel: "Cancel",
    sexual: "Sexual comments or behaviour", harassment: "Harassment", spam: "Spam", other: "Other", reported: "Your report was received.",
    reportFailed: "The report was not saved. Please try again.", evidence: "Describe what happened. Pratiqo does not record this call.",
    ending: "Server closure is still being confirmed. Your camera and microphone have stopped.", with: "With", heading: "Café des langues", until: "Ends no later than",
  },
  es: {
    title: "Un momento para conversar", loading: "Comprobando tu invitación…", ready: "Tu invitación ha sido aceptada.",
    intro: "Elige lo que quieres compartir. Puedes mantener tu cámara y tu micrófono apagados.",
    camera: "Activar mi cámara", microphone: "Activar mi micrófono", join: "Unirme a la llamada", joining: "Conectando…", leave: "Terminar la llamada",
    back: "Volver al chat", course: "Volver a mi curso", ended: "La llamada ha terminado. Puedes seguir escribiendo en la sala.",
    error: "La llamada no está disponible. Tu cámara y tu micrófono se han detenido.", login: "Inicia sesión para encontrar tu invitación.", signIn: "Iniciar sesión",
    block: "Bloquear a esta persona", blocked: "Esta persona está bloqueada. La llamada ha terminado.", blockFailed: "La llamada se detuvo aquí, pero el bloqueo no se guardó. Inténtalo de nuevo.",
    report: "Denunciar", reportTitle: "Denunciar a esta persona", reason: "Motivo", details: "Detalles (opcional)", submit: "Enviar denuncia", cancel: "Cancelar",
    sexual: "Comentarios o comportamiento sexuales", harassment: "Acoso", spam: "Spam", other: "Otro", reported: "Hemos recibido tu denuncia.",
    reportFailed: "La denuncia no se guardó. Inténtalo de nuevo.", evidence: "Describe lo que pasó. Pratiqo no graba esta llamada.",
    ending: "Se está confirmando el cierre en el servidor. Tu cámara y tu micrófono están detenidos.", with: "Con", heading: "Café des langues", until: "Termina como máximo a las",
  },
};

async function dailyFrame(element: HTMLElement): Promise<CafeDailyCallHandle> {
  const Daily = (await import("@daily-co/daily-js")).default;
  return Daily.createFrame(element, { showLeaveButton: false, showFullscreenButton: false,
    iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px" } }) as unknown as CafeDailyCallHandle;
}

export function CafeCommunityCall({ callId, courseReturnHref, identity, locale = "fr", transport = cafeCommunityCallTransport, createFrame = dailyFrame }: {
  callId: string; courseReturnHref: string | null; identity: CafeIdentity | null | undefined; locale?: Locale;
  transport?: CafeCommunityCallTransport; createFrame?: (element: HTMLElement) => Promise<CafeDailyCallHandle>;
}) {
  const t = copy[locale];
  const [phase, setPhase] = useState<Phase>("loading");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [other, setOther] = useState<CafeMember | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [notice, setNotice] = useState<keyof typeof t | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<CafeReportReason>("sexual_harassment");
  const [details, setDetails] = useState("");
  const [blockPending, setBlockPending] = useState(false);
  const [reportPending, setReportPending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockNotice, setBlockNotice] = useState<"blocked" | "blockFailed" | null>(null);
  const [reportNotice, setReportNotice] = useState<"reported" | "reportFailed" | null>(null);
  const slot = useRef<{ current: CafeDailyCallHandle | null }>({ current: null });
  const gen = useRef(new CafeDailyJoinGeneration());
  const host = useRef<HTMLDivElement>(null);
  const identityRef = useRef(identity);
  useLayoutEffect(() => { identityRef.current = identity; }, [identity]);
  const closed = useRef(false);
  const roomRef = useRef<string | null>(null);
  const generation = useRef(0);
  const stopMedia = useCallback(() => {
    gen.current.invalidate();
    void clearCafeDailyCallSlot(slot.current);
    // Removing the iframe also closes its browsing context immediately, even
    // if the provider's asynchronous destroy fails or takes time to settle.
    host.current?.replaceChildren();
  }, []);

  const end = useCallback(async (message: "ended" | "error" = "ended", keepalive = false) => {
    const revision = generation.current;
    closed.current = true;
    stopMedia();
    setPhase(message);
    const token = identityRef.current?.accessToken;
    if (!token) return;
    try {
      const result = await transport.command(token, { action: "call.end", callId }, undefined, keepalive);
      if (generation.current === revision && (!result.ok || result.cleanupPending)) setNotice("ending");
    } catch { if (generation.current === revision) setNotice("ending"); }
  }, [callId, stopMedia, transport]);

  useEffect(() => {
    const revision = ++generation.current;
    closed.current = false;
    const controller = new AbortController();
    const presenceSessionId = crypto.randomUUID();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastHeartbeat = 0;
    let initial = true;
    const current = () => generation.current === revision && !controller.signal.aborted && !closed.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset private state when the authenticated external session changes.
    setPhase("loading"); setOther(null); setRoomId(null); roomRef.current = null; setNotice(null);
    setCamera(false); setMicrophone(false); setEndsAt(null);
    setBlockPending(false); setReportPending(false); setIsBlocked(false); setBlockNotice(null); setReportNotice(null);
    setReportOpen(false); setDetails("");
    const check = async () => {
      if (!current()) return;
      const token = identityRef.current?.accessToken;
      if (!token) { stopMedia(); return; }
      // A hung status request must not leave media running indefinitely.
      const requestController = new AbortController();
      const abort = () => requestController.abort();
      controller.signal.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(() => requestController.abort(), 5_000);
      try {
        const result = await transport.status(token, callId, requestController.signal);
        if (!current()) return;
        if (!result.ok || Date.parse(result.endsAt) <= Date.now()) throw new Error("unavailable");
        roomRef.current = result.roomId; setRoomId(result.roomId); setEndsAt(result.endsAt);
        if (initial) {
          const snapshot = await transport.snapshot(token, result.roomId, requestController.signal);
          if (!current()) return;
          if (!snapshot.ok || !snapshot.me || snapshot.me.id !== identityRef.current?.userId) throw new Error("unavailable");
          const invitation = snapshot.calls.find((call) => call.id === callId && call.status === "accepted");
          if (!invitation) throw new Error("unavailable");
          setOther(invitation.from.id === snapshot.me.id ? invitation.to : invitation.from);
          initial = false; setPhase("ready");
        }
        if (Date.now() - lastHeartbeat >= 20_000) {
          const heartbeat = await transport.command(token, { action: "presence.heartbeat", presenceSessionId, roomId: result.roomId }, requestController.signal);
          if (!current()) return;
          if (!heartbeat.ok) throw new Error("unavailable");
          lastHeartbeat = Date.now();
        }
      } catch {
        if (current()) void end("error");
      } finally {
        clearTimeout(timeout); controller.signal.removeEventListener("abort", abort);
        if (current()) timer = setTimeout(() => { void check(); }, 2_000);
      }
    };
    const onOffline = () => { if (current()) void end("error"); };
    const onHide = () => {
      if (current()) void end("ended", true);
      const token = identityRef.current?.accessToken;
      if (token) void transport.command(token, { action: "presence.leave", presenceSessionId }, undefined, true).catch(() => undefined);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("pagehide", onHide);
    if (identity?.userId) void check();
    return () => {
      generation.current += 1; controller.abort(); if (timer) clearTimeout(timer); stopMedia();
      window.removeEventListener("offline", onOffline); window.removeEventListener("pagehide", onHide);
    };
    // Token refresh is read through identityRef; changing accounts invalidates all work.
  }, [callId, identity?.userId, transport, stopMedia, end]);

  async function join() {
    const token = identityRef.current?.accessToken;
    if (!token || closed.current || phase !== "ready" || !host.current) return;
    const attempt = gen.current.beginAttempt();
    setPhase("joining");
    try {
      const result = await transport.join(token, callId);
      if (!gen.current.isCurrent(attempt) || closed.current) return;
      if (!result.ok) { void end("error"); return; }
      await clearCafeDailyCallSlot(slot.current);
      await waitForCafeDailyTeardown();
      if (!gen.current.isCurrent(attempt) || closed.current || !host.current) return;
      const frame = await createFrame(host.current);
      if (!gen.current.isCurrent(attempt) || closed.current) {
        // Frame creation can resolve after leave/unmount. Own this instance only.
        await destroyCafeDailyCall(frame); return;
      }
      frame.on?.("left-meeting", () => { if (gen.current.isCurrent(attempt)) void end(); });
      frame.on?.("error", () => { if (gen.current.isCurrent(attempt)) void end("error"); });
      const state = await runCafeDailyJoinAttempt({ attempt, gen: gen.current, slot: slot.current,
        createCall: () => frame,
        join: (call) => call.join({ url: result.roomUrl, token: result.token, startVideoOff: !camera, startAudioOff: !microphone }),
      });
      if (state === "connected" && gen.current.isCurrent(attempt)) setPhase("connected");
      else if (state === "failed") void end("error");
      else if (state === "aborted") await destroyCafeDailyCall(frame);
    } catch { if (gen.current.isCurrent(attempt)) void end("error"); }
  }

  async function block() {
    if (!other || !identityRef.current || blockPending || isBlocked) return;
    const revision = generation.current;
    closed.current = true; stopMedia(); setPhase("ended"); setBlockPending(true); setBlockNotice(null);
    try {
      const result = await transport.command(identityRef.current.accessToken, { action: "member.block", targetId: other.id });
      if (generation.current === revision) {
        setBlockNotice(result.ok ? "blocked" : "blockFailed"); setIsBlocked(result.ok);
        if (result.ok && result.cleanupPending) setNotice("ending");
      }
      if (!result.ok && identityRef.current) void transport.command(identityRef.current.accessToken, { action: "call.end", callId }).catch(() => undefined);
    } catch {
      if (generation.current === revision) setBlockNotice("blockFailed");
      if (identityRef.current) void transport.command(identityRef.current.accessToken, { action: "call.end", callId }).catch(() => undefined);
    }
    finally { if (generation.current === revision) setBlockPending(false); }
  }

  async function report(event: React.FormEvent) {
    event.preventDefault();
    if (!other || !identityRef.current || reportPending) return;
    const revision = generation.current;
    setReportPending(true);
    try {
      const result = await transport.command(identityRef.current.accessToken, {
        action: "report.submit", targetId: other.id, callId, ...(roomId ? { roomId } : {}), reason, messageIds: [], details,
      });
      if (generation.current !== revision) return;
      setReportNotice(result.ok ? "reported" : "reportFailed");
      if (result.ok) { setReportOpen(false); setDetails(""); }
    } catch { if (generation.current === revision) setReportNotice("reportFailed"); }
    finally { if (generation.current === revision) setReportPending(false); }
  }

  const backQuery = new URLSearchParams();
  if (roomId) backQuery.set("salon", roomId);
  if (courseReturnHref) backQuery.set("yoReturn", courseReturnHref);
  const back = `/cafe${backQuery.size ? `?${backQuery}` : ""}`;
  const signIn = `/connexion?next=${encodeURIComponent(`/cafe/appels/${callId}${courseReturnHref ? `?yoReturn=${encodeURIComponent(courseReturnHref)}` : ""}`)}`;
  return <main className={styles.shell} lang={locale} data-cafe-community-call={phase}>
    <header className={styles.header}><a href={back} onClick={() => { void end("ended", true); }}>{t.heading}</a><span>18+</span></header>
    <section className={styles.card}>
      <p className={styles.eyebrow}>{t.heading}</p><h1>{t.title}</h1>
      {other && <p className={styles.person}>{t.with} <strong>{other.displayName}</strong></p>}
      {identity === null ? <p>{t.login} <a href={signIn}>{t.signIn}</a></p> : <>
        {phase === "loading" && <p role="status">{t.loading}</p>}
        {phase === "ready" && <div className={styles.prepare}>
          <h2>{t.ready}</h2><p>{t.intro}</p>
          <label><input type="checkbox" checked={camera} onChange={(event) => setCamera(event.target.checked)} />{t.camera}</label>
          <label><input type="checkbox" checked={microphone} onChange={(event) => setMicrophone(event.target.checked)} />{t.microphone}</label>
          <button className={styles.primary} onClick={() => { void join(); }}>{t.join}</button>
        </div>}
        {phase === "joining" && <p role="status">{t.joining}</p>}
        {phase === "ended" && <p role="status">{t.ended}</p>}
        {phase === "error" && <p role="alert">{t.error}</p>}
        <div ref={host} className={`${styles.frame} ${phase === "connected" || phase === "joining" ? styles.visible : ""}`} />
        {(phase === "ready" || phase === "joining" || phase === "connected") && <button className={styles.end} onClick={() => { void end(); }}>{t.leave}</button>}
        {endsAt && <p className={styles.time}>{t.until} {new Date(endsAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</p>}
      </>}
      {notice && <p role={notice === "blockFailed" || notice === "reportFailed" ? "alert" : "status"}>{t[notice]}</p>}
      {blockNotice && <p role={blockNotice === "blockFailed" ? "alert" : "status"}>{t[blockNotice]}</p>}
      {reportNotice && <p role={reportNotice === "reportFailed" ? "alert" : "status"}>{t[reportNotice]}</p>}
      {other && identity && <div className={styles.safety}>
        <button onClick={() => { void block(); }} disabled={blockPending || isBlocked}>{t.block}</button>
        <button onClick={() => setReportOpen(true)} disabled={reportPending}>{t.report}</button>
      </div>}
      {reportOpen && <form className={styles.report} onSubmit={(event) => { void report(event); }}>
        <h2>{t.reportTitle}</h2><p>{t.evidence}</p>
        <label>{t.reason}<select value={reason} onChange={(event) => setReason(event.target.value as CafeReportReason)}>
          <option value="sexual_harassment">{t.sexual}</option><option value="harassment">{t.harassment}</option><option value="spam">{t.spam}</option><option value="other">{t.other}</option>
        </select></label>
        <label>{t.details}<textarea value={details} maxLength={2000} onChange={(event) => setDetails(event.target.value)} /></label>
        <div className={styles.actions}><button className={styles.primary} disabled={reportPending}>{t.submit}</button><button type="button" onClick={() => setReportOpen(false)}>{t.cancel}</button></div>
      </form>}
      <nav className={styles.links}><a href={back} onClick={() => { void end("ended", true); }}>{t.back}</a>{courseReturnHref && <a href={courseReturnHref} onClick={() => { void end("ended", true); }}>{t.course}</a>}</nav>
    </section>
  </main>;
}
