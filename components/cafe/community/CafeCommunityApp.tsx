"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { CafeCommunityTransport, CafeIdentity } from "@/lib/cafe/communityClient";
import type { CafeCallInvitation, CafeChatMessage, CafeCommunityCommand, CafeCommunityCommandResult, CafeCommunityRoom, CafeCommunityRoomView, CafeMember, CafePerson, CafeReportReason } from "@/lib/cafe/communityTypes";
import { cafeLanguageLabel, cafeLanguageOptions, cafeLocalDate, cafeScheduledIso, cafeViewerTimeZone } from "@/lib/cafe/communityLanguages";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import { cafeText, communityError, type CommunityLocale } from "./copy";
import { LanguagePicker } from "./LanguagePicker";
import { useCafeCommunity } from "./useCafeCommunity";
import styles from "./community.module.css";

type Execute = (command: CafeCommunityCommand) => Promise<CafeCommunityCommandResult>;
type ReportDraft = { target: CafeMember; roomId: string | null; messages: CafeChatMessage[]; selectedIds: string[] };

export function CommunityFrame({ locale, courseReturnHref, children, compact = false }: { locale: CommunityLocale; courseReturnHref?: string | null; children: ReactNode; compact?: boolean }) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const back = resolveCafeRoomCourseReturn(courseReturnHref ?? undefined);
  return <main className={styles.page} lang={locale}>
    <header className={styles.topbar}><div className={styles.topbarInner}>
      {/* Full-document entry resets this private room view and tears down its presence lease. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className={styles.brand} href="/cafe">Café des langues <small>{t("par Pratiqo", "by Pratiqo", "por Pratiqo")}</small></a>
      <nav className={styles.topLinks} aria-label={t("Navigation Café", "Café navigation", "Navegación del Café")}>
        {back && <a href={back}>{t("Retour à mon parcours", "Back to my learning", "Volver a mi curso")}</a>}
        <Link href="/" prefetch={false}>Pratiqo</Link><Link href="/yo" prefetch={false}>YoPratiqo</Link>
      </nav>
    </div></header>
    <div className={`${styles.wrap} ${compact ? styles.activeWrap : ""}`}>{children}</div>
  </main>;
}

function Modal({ title, onClose, children, closeLabel }: { title: string; onClose: () => void; children: ReactNode; closeLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button,input,select,textarea")?.focus();
    return () => { if (before?.isConnected) before.focus(); };
  }, []);
  return <div className={styles.dialogBackdrop}>
    <div ref={ref} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]') ?? []);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className={styles.spread}><h2 id={titleId}>{title}</h2><button type="button" className={styles.quiet} onClick={onClose} aria-label={closeLabel}>×</button></div>
      {children}
    </div>
  </div>;
}

function Member({ member, locale, online }: { member: CafeMember; locale: CommunityLocale; online?: boolean }) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  return <div className={styles.member}>
    <span className={styles.avatar} aria-hidden>{Array.from(member.displayName)[0]?.toLocaleUpperCase(locale)}</span>
    <div className={styles.memberBody}>
      <p className={styles.memberName}>{member.displayName}{online !== undefined && <> · <span className={styles.small}>{online ? t("En ligne", "Online", "En línea") : t("Hors ligne · salon prévu", "Offline · scheduled room", "Sin conexión · sala programada")}</span></>}</p>
      <p className={styles.memberLanguages}>{t("Langue maternelle", "Native", "Lengua materna")} : {member.nativeLanguages.map((code) => cafeLanguageLabel(code, locale)).join(", ")}</p>
      <p className={styles.memberLanguages}>{t("Apprend", "Learning", "Aprende")} : {member.learningLanguages.map((code) => cafeLanguageLabel(code, locale)).join(", ")}</p>
    </div>
  </div>;
}

function ProfileForm({ member, languageHint, locale, busy, onSave, onCancel }: {
  member: CafeMember | null; languageHint?: string | null; locale: CommunityLocale; busy: boolean;
  onSave: Execute; onCancel?: () => void;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const [name, setName] = useState(member?.displayName ?? "");
  const [native, setNative] = useState(member?.nativeLanguages ?? []);
  const [learning, setLearning] = useState(member?.learningLanguages ?? (languageHint ? [languageHint] : []));
  const [adult, setAdult] = useState(Boolean(member));
  const [rules, setRules] = useState(Boolean(member));
  const [error, setError] = useState("");
  return <form className={styles.form} onSubmit={async (event) => {
    event.preventDefault(); setError("");
    const result = await onSave({ action: "profile.save", displayName: name.trim(), nativeLanguages: native, learningLanguages: learning, adultAgreement: adult, rulesAgreement: rules });
    if (!result.ok && result.code !== "superseded") setError(communityError(result.code, locale));
  }}>
    <p className={styles.note}>{t("Choisissez le nom et les langues que les autres membres verront. Toutes les langues sont les bienvenues.", "Choose the name and languages other members will see. All languages are welcome.", "Elige el nombre y los idiomas que verán los demás. Todos los idiomas son bienvenidos.")}</p>
    <label className={styles.field}>{t("Votre nom au Café", "Your Café name", "Tu nombre en el Café")}<input value={name} onChange={(event) => setName(event.target.value)} minLength={1} maxLength={40} required autoComplete="nickname" /></label>
    <div className={styles.twoColumns}>
      <LanguagePicker label={t("Ma ou mes langues maternelles", "My native language(s)", "Mi(s) lengua(s) materna(s)")} value={native} onChange={setNative} locale={locale} disabled={busy} />
      <LanguagePicker label={t("Les langues que j’apprends", "Languages I am learning", "Idiomas que aprendo")} value={learning} onChange={setLearning} locale={locale} disabled={busy} />
    </div>
    <div className={styles.soft}>
      <p className={styles.note}>{t("On commence par écrire. Un appel reste un choix partagé. Les propos sexuels non souhaités, le harcèlement et le spam ne sont pas acceptés. Vous pouvez signaler et bloquer à tout moment.", "Start by writing. A call is a shared choice. Unwanted sexual comments, harassment and spam are not welcome. You can report and block at any time.", "Empezamos escribiendo. Una llamada es una decisión compartida. No se aceptan comentarios sexuales no deseados, acoso ni spam. Puedes denunciar y bloquear en cualquier momento.")}</p>
    </div>
    <label className={styles.check}><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} required />{t("Je confirme avoir 18 ans ou plus.", "I confirm I am 18 or older.", "Confirmo que tengo 18 años o más.")}</label>
    <label className={styles.check}><input type="checkbox" checked={rules} onChange={(event) => setRules(event.target.checked)} required />{t("J’accepte ces règles et je respecte le choix des autres membres.", "I agree to these rules and respect other members’ choices.", "Acepto estas reglas y respeto las decisiones de los demás.")}</label>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.row}>
      <button className={styles.primary} type="submit" disabled={busy || !name.trim() || !native.length || !learning.length || !adult || !rules}>{member ? t("Enregistrer mon profil", "Save my profile", "Guardar mi perfil") : t("Entrer au Café", "Enter the Café", "Entrar al Café")}</button>
      {onCancel && <button className={styles.button} type="button" onClick={onCancel}>{t("Annuler", "Cancel", "Cancelar")}</button>}
    </div>
  </form>;
}

function CreateRoomForm({ locale, mode: initialMode, languages: initialLanguages, execute, onCreated, busy }: {
  locale: CommunityLocale; mode: "now" | "scheduled"; languages: string[]; execute: Execute; onCreated: () => void; busy: boolean;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState("");
  const [languages, setLanguages] = useState(initialLanguages);
  const [start, setStart] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [error, setError] = useState("");
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  return <form className={styles.form} onSubmit={async (event) => {
    event.preventDefault(); setError("");
    const startsAt = mode === "scheduled" ? cafeScheduledIso(start) : null;
    if (mode === "scheduled" && !startsAt) { setError(t("Choisissez une date future valide dans les 90 prochains jours, dans votre fuseau horaire.", "Choose a valid date in the next 90 days, in your time zone.", "Elige una fecha válida en los próximos 90 días, en tu zona horaria.")); return; }
    const fingerprint = JSON.stringify({ title: title.trim(), languages, mode, startsAt, capacity });
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    const result = await execute({ action: "room.create", requestId: request.current.id, title: title.trim(), languages, mode, startsAt, capacity });
    if (result.ok) onCreated();
    else if (result.code !== "superseded") setError(communityError(result.code, locale));
  }}>
    <p className={styles.note}>{t("Donnez envie de vous rejoindre : un sujet, une question ou simplement une pause pour discuter.", "Give people a reason to join: a topic, a question or simply a break to chat.", "Invita a los demás con un tema, una pregunta o una pausa para charlar.")}</p>
    <label className={styles.field}>{t("Nom du salon", "Room name", "Nombre de la sala")}<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("Un café et des nouvelles du jour", "Coffee and a catch-up", "Un café y las novedades del día")} /></label>
    <LanguagePicker label={t("Langues de la conversation", "Conversation languages", "Idiomas de la conversación")} value={languages} onChange={setLanguages} locale={locale} disabled={busy} />
    <div className={styles.twoColumns}>
      <label className={styles.field}>{t("Quand ?", "When?", "¿Cuándo?")}<select value={mode} onChange={(event) => setMode(event.target.value as "now" | "scheduled")}><option value="now">{t("Maintenant", "Now", "Ahora")}</option><option value="scheduled">{t("À une date future", "On a future date", "En una fecha futura")}</option></select></label>
      <label className={styles.field}>{t("Places, vous compris", "Places, including you", "Plazas, contigo incluido")}<select value={capacity} onChange={(event) => setCapacity(Number(event.target.value))}>{[2,3,4,5,6,7,8].map((number) => <option key={number}>{number}</option>)}</select></label>
    </div>
    {mode === "scheduled" && <label className={styles.field}>{t("Date et heure", "Date and time", "Fecha y hora")} · {cafeViewerTimeZone()}<input type="datetime-local" required value={start} onChange={(event) => setStart(event.target.value)} /><span className={styles.note}>{t("Chacun verra l’heure dans son propre fuseau horaire. Vous ouvrirez le salon à l’heure prévue.", "Everyone will see their local time. You open the room at the scheduled time.", "Cada persona verá su hora local. Tú abres la sala a la hora prevista.")}</span></label>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button className={styles.primary} type="submit" disabled={busy || !title.trim() || !languages.length}>{mode === "now" ? t("Ouvrir mon salon et attendre", "Open my room and wait", "Abrir mi sala y esperar") : t("Programmer le salon", "Schedule the room", "Programar la sala")}</button>
  </form>;
}

function RoomCard({ room, me, locale, disabled, execute, serverTime }: { room: CafeCommunityRoom; me: CafeMember; locale: CommunityLocale; disabled: boolean; execute: Execute; serverTime: string }) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const scheduled = room.state === "scheduled";
  const creator = room.creator.id === me.id;
  const startReached = room.startsAt && Date.parse(room.startsAt) <= Date.parse(serverTime);
  const full = room.participants.length >= room.capacity && !room.participants.some((member) => member.id === me.id);
  return <article className={styles.roomCard}>
    <div className={styles.spread}><span className={styles.badge}>{scheduled ? t("À venir", "Scheduled", "Programada") : <><span className={styles.dot} />{room.participants.length <= 1 ? t("En attente de compagnie", "Waiting for company", "Esperando compañía") : t("Conversation en cours", "Chatting now", "Conversación en curso")}</>}</span><span className={styles.small}>{room.participants.length}/{room.capacity} {t("places", "places", "plazas")}</span></div>
    <h3>{room.title}</h3>
    <div className={styles.pills}>{room.languages.map((code) => <span className={styles.badge} key={code}>{cafeLanguageLabel(code, locale)}</span>)}</div>
    <Member member={room.creator} locale={locale} />
    {room.startsAt && <p className={styles.small}>{cafeLocalDate(room.startsAt, locale)} · {cafeViewerTimeZone()}</p>}
    {scheduled && <p className={styles.small}>{room.rsvpCount} {t("personne(s) intéressée(s)", "interested", "persona(s) interesada(s)")}</p>}
    <div className={styles.row}>
      {!scheduled && <button className={styles.primary} disabled={disabled || full} onClick={() => void execute({ action: "room.join", roomId: room.id })}>{full ? t("Complet", "Full", "Completa") : t("Rejoindre le chat", "Join the chat", "Entrar al chat")}</button>}
      {scheduled && creator && <button className={styles.primary} disabled={disabled || !startReached} onClick={() => void execute({ action: "room.join", roomId: room.id })}>{t("Ouvrir mon salon", "Open my room", "Abrir mi sala")}</button>}
      {scheduled && !creator && <button className={styles.button} disabled={disabled} onClick={() => void execute({ action: "room.rsvp", roomId: room.id, attending: !room.myRsvp })}>{room.myRsvp ? t("Retirer ma participation", "Cancel my RSVP", "Cancelar mi participación") : t("Ça m’intéresse", "I’m interested", "Me interesa")}</button>}
      {scheduled && creator && <button className={styles.quiet} disabled={disabled} onClick={() => void execute({ action: "room.end", roomId: room.id })}>{t("Annuler ce salon", "Cancel this room", "Cancelar esta sala")}</button>}
    </div>
  </article>;
}

function CallInvitations({ calls, me, locale, execute, disabled, videoEnabled, courseReturnHref, serverTime }: {
  calls: CafeCallInvitation[]; me: CafeMember; locale: CommunityLocale; execute: Execute; disabled: boolean; videoEnabled: boolean; courseReturnHref?: string | null; serverTime: string;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const current = calls.filter((call) => call.status === "pending" || call.status === "accepted");
  if (!current.length) return null;
  return <section className={styles.calls} aria-label={t("Invitations à un appel", "Call invitations", "Invitaciones a una llamada")}>{current.map((call) => {
    const incoming = call.to.id === me.id;
    const other = incoming ? call.from : call.to;
    const expired = Date.parse(call.status === "accepted" ? call.endsAt ?? call.expiresAt : call.expiresAt) <= Date.parse(serverTime);
    const query = new URLSearchParams({ salon: call.roomId });
    const back = resolveCafeRoomCourseReturn(courseReturnHref ?? undefined);
    if (back) query.set("yoReturn", back);
    return <article className={styles.callCard} key={call.id}>
      <p><strong>{other.displayName}</strong> · {expired ? t("Invitation expirée", "Invitation expired", "Invitación caducada") : call.status === "accepted" ? t("Vous avez tous les deux accepté l’appel.", "You both accepted the call.", "Ambos han aceptado la llamada.") : incoming ? t("vous propose un appel.", "invited you to a call.", "te invita a una llamada.") : t("a reçu votre invitation.", "received your invitation.", "ha recibido tu invitación.")}</p>
      {!expired && <><p className={styles.small}>{t("La caméra et le micro restent éteints ici. Vous les préparerez sur la page de l’appel.", "Your camera and microphone stay off here. You prepare them on the call page.", "La cámara y el micrófono permanecen apagados aquí. Los prepararás en la página de la llamada.")}</p><div className={styles.row}>
        {call.status === "accepted" && videoEnabled && <a className={styles.primary} href={`/cafe/appels/${encodeURIComponent(call.id)}?${query.toString()}`}>{t("Préparer l’appel", "Prepare the call", "Preparar la llamada")}</a>}
        {call.status === "pending" && incoming && <><button className={styles.primary} disabled={disabled || !videoEnabled} onClick={() => void execute({ action: "call.respond", callId: call.id, accept: true })}>{t("Accepter l’invitation", "Accept invitation", "Aceptar invitación")}</button><button className={styles.button} onClick={() => void execute({ action: "call.respond", callId: call.id, accept: false })} disabled={disabled}>{t("Pas maintenant", "Not now", "Ahora no")}</button></>}
        {(call.status === "accepted" || !incoming) && <button className={styles.button} onClick={() => void execute({ action: "call.end", callId: call.id })}>{t("Annuler l’appel", "Cancel the call", "Cancelar la llamada")}</button>}
      </div></>}
    </article>;
  })}</section>;
}

function RoomChat({ room, me, locale, execute, disabled, videoEnabled, onReport, onBlock, calls, serverTime, courseReturnHref }: {
  room: CafeCommunityRoomView; me: CafeMember; locale: CommunityLocale; execute: Execute; disabled: boolean; videoEnabled: boolean;
  onReport: (member: CafeMember, messageId?: string, block?: boolean) => void; onBlock: (member: CafeMember) => void;
  calls: CafeCallInvitation[]; serverTime: string; courseReturnHref?: string | null;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const inviteRequests = useRef(new Map<string, string>());
  const messages = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  useEffect(() => {
    if (messages.current && nearBottom.current) messages.current.scrollTop = messages.current.scrollHeight;
  }, [room.messages]);
  const callBusy = calls.some((call) => call.status === "pending" || call.status === "accepted");
  const invite = async (targetId: string) => {
    const requestId = inviteRequests.current.get(targetId) ?? crypto.randomUUID();
    inviteRequests.current.set(targetId, requestId);
    const result = await execute({ action: "call.invite", roomId: room.id, targetId, requestId });
    if (result.ok) inviteRequests.current.delete(targetId);
  };
  return <>
    <CallInvitations calls={calls} me={me} locale={locale} execute={execute} disabled={disabled} videoEnabled={videoEnabled} serverTime={serverTime} courseReturnHref={courseReturnHref} />
    <div className={styles.chatLayout}>
      <section className={`${styles.panel} ${styles.chatPanel}`} aria-label={t("Conversation écrite", "Text conversation", "Conversación por texto")}>
        <div className={styles.chatHeader}><div className={styles.spread}><div><h2 className={styles.heading}>{room.title}</h2><div className={styles.pills}>{room.languages.map((code) => <span className={styles.badge} key={code}>{cafeLanguageLabel(code, locale)}</span>)}</div></div><button className={styles.button} onClick={() => void execute({ action: room.creator.id === me.id ? "room.end" : "room.leave", roomId: room.id })}>{room.creator.id === me.id ? t("Fermer le salon", "Close the room", "Cerrar la sala") : t("Quitter le salon", "Leave the room", "Salir de la sala")}</button></div></div>
        <div ref={messages} className={styles.messages} role="log" aria-live="polite" aria-relevant="additions" aria-label={t("Messages du salon", "Room messages", "Mensajes de la sala")} onScroll={() => {
          const element = messages.current; if (element) nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}>
          {room.messages.length === 0 && <div className={styles.empty}><h3>{t("La conversation commence ici.", "The conversation starts here.", "La conversación empieza aquí.")}</h3><p className={styles.note}>{room.participants.length <= 1 ? t("Votre salon est visible. Écrivez un premier mot pendant que quelqu’un vous rejoint.", "Your room is visible. Write a first hello while someone joins you.", "Tu sala es visible. Escribe un saludo mientras llega alguien.") : t("Un bonjour suffit pour commencer.", "A hello is enough to get started.", "Un hola basta para empezar.")}</p></div>}
          {room.messages.map((message) => <article key={message.id} className={`${styles.message} ${message.sender.id === me.id ? styles.ownMessage : ""}`}>
            <div className={styles.messageMeta}><strong>{message.sender.displayName}</strong><time dateTime={message.createdAt}>{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time></div>
            <div className={styles.bubble}>{message.body}</div>
            {message.sender.id !== me.id && <div className={styles.messageTools}><button className={styles.quiet} onClick={() => onReport(message.sender, message.id)} aria-label={`${t("Signaler le message de", "Report message from", "Denunciar mensaje de")} ${message.sender.displayName}`}>{t("Signaler", "Report", "Denunciar")}</button><button className={styles.quiet} onClick={() => onReport(message.sender, message.id, true)}>{t("Bloquer et signaler", "Block and report", "Bloquear y denunciar")}</button></div>}
          </article>)}
        </div>
        <form className={styles.composer} onSubmit={async (event) => {
          event.preventDefault(); if (!body.trim() || sending || disabled) return;
          setSending(true); setSendError("");
          const fingerprint = `${room.id}:${body.trim()}`;
          if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
          const result = await execute({ action: "message.send", roomId: room.id, body: body.trim(), requestId: request.current.id });
          setSending(false);
          if (result.ok) { setBody(""); request.current = null; nearBottom.current = true; }
          else if (result.code !== "superseded") setSendError(communityError(result.code, locale));
        }}>
          <label className={styles.field} htmlFor="cafe-message">{t("Votre message", "Your message", "Tu mensaje")}</label>
          <textarea id="cafe-message" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} disabled={sending} placeholder={t("Écrivez un premier bonjour…", "Write a first hello…", "Escribe un saludo…")} />
          {sendError && <p className={styles.error} role="alert">{sendError}</p>}
          <div className={styles.spread}><span className={styles.small}>{body.length}/2000 · {t("Texte d’abord, à votre rythme.", "Text first, at your pace.", "Primero texto, a tu ritmo.")}</span><button className={styles.primary} type="submit" disabled={disabled || sending || !body.trim()}>{sending ? t("Envoi…", "Sending…", "Enviando…") : t("Envoyer", "Send", "Enviar")}</button></div>
        </form>
      </section>
      <aside className={styles.panel}><h2 className={styles.smallHeading}>{t("Dans ce salon", "In this room", "En esta sala")} · {room.participants.length}</h2>
        {room.participants.map((member) => <div key={member.id} className={styles.memberRow}><Member member={member} locale={locale} />
          {member.id !== me.id && <div className={styles.memberActions}>
            {videoEnabled && <button className={styles.button} disabled={disabled || callBusy} onClick={() => void invite(member.id)}>{t("Proposer un appel", "Invite to a call", "Proponer una llamada")}</button>}
            <button className={styles.quiet} onClick={() => onBlock(member)}>{t("Bloquer", "Block", "Bloquear")}</button><button className={styles.quiet} onClick={() => onReport(member)}>{t("Signaler", "Report", "Denunciar")}</button>
            {room.creator.id === me.id && <button className={styles.quiet} disabled={disabled} onClick={() => void execute({ action: "room.remove", roomId: room.id, targetId: member.id })}>{t("Retirer du salon", "Remove from room", "Retirar de la sala")}</button>}
          </div>}
        </div>)}
        <p className={styles.small}>{videoEnabled ? t("Discutez d’abord. Un appel se prépare seulement si vous acceptez tous les deux.", "Get to know each other first. A call is prepared only after you both accept.", "Conózcanse primero. La llamada se prepara solo cuando ambos aceptan.") : t("Les appels sont momentanément indisponibles. Vous pouvez continuer à écrire.", "Calls are temporarily unavailable. You can keep writing.", "Las llamadas no están disponibles por el momento. Pueden seguir escribiendo.")}</p>
      </aside>
    </div>
  </>;
}

function ReportForm({ draft, locale, execute, onClose }: { draft: ReportDraft; locale: CommunityLocale; execute: Execute; onClose: () => void }) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const [reason, setReason] = useState<CafeReportReason>("sexual_harassment");
  const [selected, setSelected] = useState(draft.selectedIds);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  if (saved) return <div className={styles.stack}><p className={styles.success} role="status">{t("Votre signalement a été enregistré pour l’équipe de modération.", "Your report was saved for the moderation team.", "Tu denuncia se guardó para el equipo de moderación.")}</p><button className={styles.primary} onClick={onClose}>{t("Fermer", "Close", "Cerrar")}</button></div>;
  return <form className={styles.form} onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setError("");
    const result = await execute({ action: "report.submit", targetId: draft.target.id, roomId: draft.roomId, reason, messageIds: selected, details });
    setPending(false);
    if (result.ok) setSaved(true);
    else if (result.code !== "superseded") setError(communityError(result.code, locale));
  }}>
    <p className={styles.note}>{t("Personne signalée", "Person reported", "Persona denunciada")} : <strong>{draft.target.displayName}</strong>. {t("Seuls les messages sélectionnés ci-dessous sont joints. Annuler ce formulaire ne retire pas un blocage déjà enregistré.", "Only the messages you select below are attached. Cancelling this form does not undo a saved block.", "Solo se adjuntan los mensajes que selecciones abajo. Cancelar este formulario no deshace un bloqueo guardado.")}</p>
    <label className={styles.field}>{t("Motif", "Reason", "Motivo")}<select value={reason} onChange={(event) => setReason(event.target.value as CafeReportReason)}>
      <option value="sexual_harassment">{t("Propos sexuels non souhaités", "Unwanted sexual comments", "Comentarios sexuales no deseados")}</option><option value="harassment">{t("Harcèlement", "Harassment", "Acoso")}</option><option value="spam">Spam</option><option value="other">{t("Autre", "Other", "Otro")}</option>
    </select></label>
    {draft.messages.length > 0 && <fieldset className={styles.picker}><legend>{t("Messages à joindre (10 maximum)", "Messages to attach (up to 10)", "Mensajes para adjuntar (hasta 10)")}</legend><div className={styles.reportMessages}>{draft.messages.map((message) => <label key={message.id} className={styles.check}><input type="checkbox" checked={selected.includes(message.id)} disabled={!selected.includes(message.id) && selected.length >= 10} onChange={() => setSelected((ids) => ids.includes(message.id) ? ids.filter((id) => id !== message.id) : [...ids, message.id])} /><blockquote>{message.body}</blockquote></label>)}</div></fieldset>}
    <label className={styles.field}>{t("Précisions (facultatif)", "Details (optional)", "Detalles (opcional)")}<textarea value={details} maxLength={2000} onChange={(event) => setDetails(event.target.value)} /></label>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.row}><button className={styles.primary} type="submit" disabled={pending}>{t("Envoyer le signalement", "Submit report", "Enviar denuncia")}</button><button className={styles.button} type="button" onClick={onClose}>{t("Annuler le signalement", "Cancel report", "Cancelar denuncia")}</button></div>
  </form>;
}

/** The production view also accepts an explicit transport for deterministic component tests. */
export function CafeCommunityApp({ identity, locale, transport, initialRoomId = null, languageHint, courseReturnHref, videoEnabled = false }: {
  identity: CafeIdentity; locale: CommunityLocale; transport?: CafeCommunityTransport; initialRoomId?: string | null;
  languageHint?: string | null; courseReturnHref?: string | null; videoEnabled?: boolean;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const community = useCafeCommunity(identity, transport, initialRoomId);
  const { snapshot, execute } = community;
  const [tab, setTab] = useState<"now" | "scheduled" | "people">("now");
  const [filter, setFilter] = useState(languageHint ?? "");
  const [create, setCreate] = useState<"now" | "scheduled" | null>(null);
  const [profile, setProfile] = useState(false);
  const [settings, setSettings] = useState(false);
  const [report, setReport] = useState<ReportDraft | null>(null);
  const [notice, setNotice] = useState("");
  const [failedBlock, setFailedBlock] = useState<CafeMember | null>(null);
  const languageOptions = useMemo(() => cafeLanguageOptions(locale, snapshot?.rooms.flatMap((room) => room.languages) ?? []), [locale, snapshot?.rooms]);
  const blockMember = async (member: CafeMember) => {
    setNotice(t("Blocage en cours…", "Blocking…", "Bloqueando…"));
    const result = await community.block(member);
    if (result.ok) { setFailedBlock(null); setNotice(t("Cette personne est bloquée. Vous pouvez gérer vos blocages dans Mon profil.", "This person is blocked. You can manage blocks in My profile.", "Esta persona está bloqueada. Puedes gestionar los bloqueos en Mi perfil.")); }
    else if (result.code !== "superseded") { setFailedBlock(member); setNotice(t("Cette personne est masquée sur cet écran, mais le blocage n’a pas pu être confirmé. Réessayez.", "This person is hidden on this screen, but the block could not be confirmed. Try again.", "Esta persona está oculta en esta pantalla, pero no se pudo confirmar el bloqueo. Vuelve a intentarlo.")); }
  };
  const beginReport = (member: CafeMember, messageId?: string, block = false) => {
    const messages = snapshot?.room?.messages.filter((message) => message.sender.id === member.id) ?? [];
    setReport({ target: { ...member }, roomId: snapshot?.room?.id ?? null, messages: messages.map((message) => ({ ...message })), selectedIds: messageId ? [messageId] : [] });
    if (block) void blockMember(member);
  };

  return <CommunityFrame locale={locale} courseReturnHref={courseReturnHref} compact={Boolean(snapshot?.room)}>
    <div className={`${styles.intro} ${snapshot?.room ? styles.activeIntro : ""}`}>
      {snapshot?.room ? <h1 className={styles.activeTitle}>{t("Votre conversation au Café", "Your Café conversation", "Tu conversación en el Café")}</h1> : <div><p className={styles.eyebrow}>{t("Des langues, des gens, des conversations", "Languages, people, conversations", "Idiomas, personas, conversaciones")}</p><h1 className={styles.title}>{t("Entrez. Dites bonjour.", "Come in. Say hello.", "Entra. Di hola.")}</h1><p className={styles.subtitle}>{t("Rencontrez des personnes qui apprennent, comme vous. Commencez par le chat, puis choisissez ensemble si vous voulez vous appeler.", "Meet people who are learning, just like you. Start with chat, then decide together if you want to call.", "Conoce a personas que aprenden, como tú. Empiecen por el chat y decidan juntos si quieren llamarse.")}</p></div>}
      {snapshot?.me && <button className={styles.button} onClick={() => setSettings(true)}>{t("Mon profil", "My profile", "Mi perfil")} · {snapshot.me.displayName}</button>}
    </div>
    {community.error && <div className={styles.error} role="alert"><p>{communityError(community.error, locale)}</p><div className={styles.row}><button className={styles.button} onClick={() => void community.refresh()}>{t("Actualiser", "Refresh", "Actualizar")}</button>{community.error === "unauthenticated" && <a className={styles.button} href="/connexion?next=%2Fcafe">{t("Me reconnecter", "Sign in again", "Volver a entrar")}</a>}</div></div>}
    {community.connection === "stale" && snapshot && <p className={styles.notice}>{t("Connexion à rétablir · les informations affichées peuvent dater. L’envoi et les nouvelles invitations sont en pause.", "Connection needs refreshing · displayed information may be old. Sending and new invitations are paused.", "Es necesario restablecer la conexión · los datos pueden estar desactualizados. Se pausan los envíos y las nuevas invitaciones.")}</p>}
    {notice && <div className={failedBlock ? styles.error : styles.notice} role="status">{notice}{failedBlock && <button className={styles.button} onClick={() => void blockMember(failedBlock)}>{t("Réessayer le blocage", "Retry block", "Reintentar bloqueo")}</button>}</div>}
    {!snapshot && <p className={styles.loading} role="status">{community.connection === "loading" ? t("Ouverture du Café…", "Opening the Café…", "Abriendo el Café…") : t("Le Café ne peut pas être chargé pour le moment.", "The Café cannot be loaded right now.", "No se puede cargar el Café en este momento.")}</p>}
    {snapshot && !snapshot.me && <section className={`${styles.panel} ${styles.narrow}`}><h2 className={styles.heading}>{t("Avant d’entrer, présentez-vous.", "Before you enter, introduce yourself.", "Antes de entrar, preséntate.")}</h2><ProfileForm member={null} locale={locale} languageHint={languageHint} busy={community.busy} onSave={execute} /></section>}
    {snapshot?.me && (snapshot.room ? <RoomChat key={snapshot.room.id} room={snapshot.room} me={snapshot.me} locale={locale} execute={execute} disabled={!community.canWrite} videoEnabled={videoEnabled} onReport={beginReport} onBlock={(member) => void blockMember(member)} calls={snapshot.calls} serverTime={snapshot.serverTime} courseReturnHref={courseReturnHref} /> : <>
      <div className={styles.spread}><div className={styles.filters}><div className={styles.tabs} aria-label={t("Explorer le Café", "Explore the Café", "Explorar el Café")}>{(["now", "scheduled", "people"] as const).map((item) => <button key={item} className={styles.tab} aria-pressed={tab === item} onClick={() => setTab(item)}>{item === "now" ? t("Maintenant", "Now", "Ahora") : item === "scheduled" ? t("À venir", "Upcoming", "Próximas") : t("Les gens", "People", "Personas")}</button>)}</div><label className={styles.small}>{t("Langue", "Language", "Idioma")} <select className={styles.filterSelect} value={filter} onChange={(event) => setFilter(event.target.value)} aria-label={t("Filtrer par langue", "Filter by language", "Filtrar por idioma")}><option value="">{t("Toutes les langues", "All languages", "Todos los idiomas")}</option>{languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label></div><div className={styles.row}><button className={styles.primary} disabled={!community.canWrite} onClick={() => setCreate("now")}>{t("Créer un salon", "Create a room", "Crear una sala")}</button><button className={styles.button} disabled={!community.canWrite} onClick={() => setCreate("scheduled")}>{t("Fixer une date", "Pick a date", "Elegir una fecha")}</button></div></div>
      <div className={`${styles.lobby} ${styles.section}`}><section>
        {tab === "people" ? <People people={snapshot.people.filter((person) => !filter || person.nativeLanguages.includes(filter) || person.learningLanguages.includes(filter))} locale={locale} meId={snapshot.me.id} onBlock={(member) => void blockMember(member)} onReport={beginReport} /> : (() => {
          const rooms = snapshot.rooms.filter((room) => (tab === "scheduled" ? room.state === "scheduled" : room.state === "live" || room.state === "waiting") && (!filter || room.languages.includes(filter)));
          return rooms.length ? <div className={styles.grid}>{rooms.map((room) => <RoomCard key={room.id} room={room} me={snapshot.me!} locale={locale} disabled={!community.canWrite} execute={execute} serverTime={snapshot.serverTime} />)}</div> : <div className={styles.empty}><h3>{tab === "scheduled" ? t("Et si vous fixiez le prochain rendez-vous ?", "Make the next get-together happen?", "¿Organizas el próximo encuentro?") : t("Le premier bonjour peut venir de vous.", "The first hello can come from you.", "El primer hola puede ser tuyo.")}</h3><p className={styles.note}>{t("Aucun salon ne correspond pour le moment. Ouvrez le vôtre ou proposez un moment pour revenir ensemble.", "There are no matching rooms right now. Open your own or suggest a time to meet.", "No hay salas que coincidan por ahora. Abre la tuya o propone una hora para encontrarse.")}</p><div className={styles.row}><button className={styles.button} disabled={!community.canWrite} onClick={() => setCreate(tab === "scheduled" ? "scheduled" : "now")}>{tab === "scheduled" ? t("Programmer un salon", "Schedule a room", "Programar una sala") : t("Ouvrir mon salon", "Open my room", "Abrir mi sala")}</button>{filter && <button className={styles.quiet} onClick={() => setFilter("")}>{t("Voir toutes les langues", "See all languages", "Ver todos los idiomas")}</button>}</div></div>;
        })()}
      </section><aside className={styles.panel}><h2 className={styles.smallHeading}>{t("Au Café en ce moment", "At the Café now", "En el Café ahora")}</h2><p className={styles.small}>{t("La présence correspond aux membres actuellement connectés au Café.", "Presence shows members currently connected to the Café.", "La presencia muestra a los miembros conectados al Café.")}</p>{snapshot.people.filter((person) => person.online).length ? snapshot.people.filter((person) => person.online).slice(0,8).map((person) => <div className={styles.memberRow} key={person.id}><Member member={person} locale={locale} /></div>) : <p className={styles.note}>{t("Personne d’autre n’est visible pour le moment.", "No other members are visible right now.", "No hay otros miembros visibles por el momento.")}</p>}<button className={styles.quiet} onClick={() => setTab("people")}>{t("Voir les gens et les créateurs de salons", "See people and room creators", "Ver personas y creadores de salas")}</button><hr className={styles.divider}/><p className={styles.note}>{t("Un petit groupe, un sujet simple, un peu de curiosité. C’est assez pour commencer.", "A small group, a simple topic, a little curiosity. That’s enough to get started.", "Un grupo pequeño, un tema sencillo y algo de curiosidad. Basta para empezar.")}</p></aside></div>
    </>)}
    <p className={styles.footer}>{t("Café réservé aux adultes (18+). Votre profil Café est visible par les membres. Vous pouvez bloquer et signaler depuis un profil ou un message.", "For adults (18+) only. Your Café profile is visible to members. You can block and report from a profile or message.", "Solo para adultos (18+). Tu perfil del Café es visible para los miembros. Puedes bloquear y denunciar desde un perfil o mensaje.")}</p>
    {create && snapshot?.me && <Modal title={t("Votre salon", "Your room", "Tu sala")} closeLabel={t("Fermer la création du salon", "Close room creation", "Cerrar creación de sala")} onClose={() => setCreate(null)}><CreateRoomForm locale={locale} mode={create} languages={filter ? [filter] : snapshot.me.learningLanguages} execute={execute} busy={community.busy} onCreated={() => setCreate(null)} /></Modal>}
    {settings && snapshot?.me && <Modal title={t("Mon profil Café", "My Café profile", "Mi perfil del Café")} closeLabel={t("Fermer mon profil", "Close my profile", "Cerrar mi perfil")} onClose={() => { setSettings(false); setProfile(false); }}>
      {profile ? <ProfileForm member={snapshot.me} locale={locale} busy={community.busy} onCancel={() => setProfile(false)} onSave={async (command) => { const result = await execute(command); if (result.ok) setProfile(false); return result; }} /> : <div className={styles.stack}><Member member={snapshot.me} locale={locale} /><button className={styles.button} onClick={() => setProfile(true)}>{t("Modifier mes langues et mon nom", "Edit my languages and name", "Editar mis idiomas y nombre")}</button><h3 className={styles.smallHeading}>{t("Personnes bloquées", "Blocked people", "Personas bloqueadas")}</h3>{snapshot.blockedMembers.length ? snapshot.blockedMembers.map((member) => <div key={member.id} className={styles.spread}><span>{member.displayName}</span><button className={styles.button} disabled={community.busy} onClick={() => void execute({ action: "member.unblock", targetId: member.id })}>{t("Débloquer", "Unblock", "Desbloquear")}</button></div>) : <p className={styles.note}>{t("Vous n’avez bloqué personne.", "You have not blocked anyone.", "No has bloqueado a nadie.")}</p>}</div>}
    </Modal>}
    {report && <Modal title={t("Signaler un comportement", "Report behaviour", "Denunciar un comportamiento")} closeLabel={t("Fermer le signalement", "Close report", "Cerrar denuncia")} onClose={() => setReport(null)}><ReportForm key={report.target.id} draft={report} locale={locale} execute={execute} onClose={() => setReport(null)} /></Modal>}
  </CommunityFrame>;
}

function People({ people, locale, meId, onBlock, onReport }: { people: CafePerson[]; locale: CommunityLocale; meId: string; onBlock: (member: CafeMember) => void; onReport: (member: CafeMember) => void }) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  if (!people.length) return <div className={styles.empty}><h3>{t("Personne ne correspond pour le moment.", "No matching members right now.", "No hay miembros que coincidan por ahora.")}</h3><p className={styles.note}>{t("Les membres en ligne et les créateurs de salons à venir apparaîtront ici.", "Online members and creators of upcoming rooms will appear here.", "Aquí aparecerán los miembros conectados y los creadores de próximas salas.")}</p></div>;
  return <div className={styles.grid}>{people.map((member) => <article className={styles.roomCard} key={member.id}><Member member={member} locale={locale} online={member.online} />{member.id !== meId && <div className={styles.memberActions}><button className={styles.button} onClick={() => onBlock(member)}>{t("Bloquer", "Block", "Bloquear")}</button><button className={styles.button} onClick={() => onReport(member)}>{t("Signaler", "Report", "Denunciar")}</button></div>}</article>)}</div>;
}
