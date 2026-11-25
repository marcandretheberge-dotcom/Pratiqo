"use client";

import { useRef, useState } from "react";
import { Check, Coffee, Flag, MessageCircle, ShieldOff, UserPlus, Users, X } from "lucide-react";
import type { CafeCommunityCommand, CafeCommunityCommandResult, CafeCommunitySnapshot, CafeFriend, CafeMember } from "@/lib/cafe/communityTypes";
import { cafeLanguageLabel, cafeLanguageOptions } from "@/lib/cafe/communityLanguages";
import { CafeAvatar } from "./CafeAvatar";
import { cafeText, communityError, type CommunityLocale } from "./copy";
import styles from "./people.module.css";

export type CafePeopleTab = "people" | "messages" | "rooms";
type Execute = (command: CafeCommunityCommand) => Promise<CafeCommunityCommandResult>;

export function CafePeopleNav({ tab, onChange, incoming, locale }: {
  tab: CafePeopleTab; onChange: (tab: CafePeopleTab) => void; incoming: number; locale: CommunityLocale;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  return <nav className={styles.tabs} aria-label={t("Au Café", "Inside the Café", "En el Café")}>
    <button aria-current={tab === "people" ? "page" : undefined} onClick={() => onChange("people")}><Users size={19} />{t("Personnes", "People", "Personas")}</button>
    <button aria-current={tab === "messages" ? "page" : undefined} onClick={() => onChange("messages")}><MessageCircle size={19} />{t("Messages", "Messages", "Mensajes")}{incoming > 0 && <span className={styles.count}>{incoming}</span>}</button>
    <button aria-current={tab === "rooms" ? "page" : undefined} onClick={() => onChange("rooms")}><Coffee size={19} />{t("Salons", "Rooms", "Salas")}</button>
  </nav>;
}

function Languages({ member, locale }: { member: CafeMember; locale: CommunityLocale }) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  return <dl className={styles.languages}>
    <div><dt>{t("Langue maternelle", "Native language", "Lengua materna")}</dt><dd>{member.nativeLanguages.map(code => cafeLanguageLabel(code, locale)).join(", ")}</dd></div>
    <div><dt>{t("Apprend", "Learning", "Aprende")}</dt><dd>{member.learningLanguages.map(code => cafeLanguageLabel(code, locale)).join(", ")}</dd></div>
  </dl>;
}

function Invite({ member, execute, disabled, locale, onClose }: { member: CafeMember; execute: Execute; disabled: boolean; locale: CommunityLocale; onClose: () => void }) {
  const [body, setBody] = useState(""), [error, setError] = useState("");
  const nonce = useRef<{ body: string; id: string } | null>(null);
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  return <form className={styles.invite} onSubmit={async event => {
    event.preventDefault(); setError("");
    if (nonce.current?.body !== body.trim()) nonce.current = { body: body.trim(), id: crypto.randomUUID() };
    const result = await execute({ action: "friend.request", targetId: member.id, introduction: body.trim(), requestId: nonce.current.id });
    if (result.ok) onClose(); else setError(communityError(result.code, locale));
  }}>
    <label>{t("Un mot pour faire connaissance", "A note to say hello", "Un mensaje para conocerse")}
      <textarea autoFocus maxLength={300} required value={body} onChange={event => setBody(event.target.value)} placeholder={t("Bonjour ! J’apprends le français. Et toi ?", "Hi! I’m learning French. How about you?", "¡Hola! Estoy aprendiendo francés. ¿Y tú?")} />
    </label>
    <p className={styles.note}>{t("La conversation privée s’ouvre après acceptation.", "Private messaging opens after acceptance.", "El chat privado se abre tras aceptar.")}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.actions}><button className={styles.primary} disabled={disabled || !body.trim()} type="submit"><UserPlus size={17} />{t("Envoyer l’invitation", "Send request", "Enviar invitación")}</button><button className={styles.iconButton} type="button" title={t("Annuler", "Cancel", "Cancelar")} aria-label={t("Annuler", "Cancel", "Cancelar")} onClick={onClose}><X size={18} /></button></div>
  </form>;
}

function ConnectionActions({ friend, execute, disabled, locale }: { friend: CafeFriend; execute: Execute; disabled: boolean; locale: CommunityLocale }) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  return <div className={styles.actions}>
    {friend.status === "accepted" ? <button className={styles.primary} disabled={disabled} onClick={() => void execute({ action: "room.join", roomId: friend.id })}><MessageCircle size={18} />{t("Écrire", "Message", "Escribir")}</button>
      : friend.direction === "incoming" ? <>
        <button className={styles.primary} disabled={disabled} onClick={() => void execute({ action: "friend.respond", friendshipId: friend.id, accept: true })}><Check size={18} />{t("Accepter", "Accept", "Aceptar")}</button>
        <button className={styles.secondary} disabled={disabled} onClick={() => void execute({ action: "friend.respond", friendshipId: friend.id, accept: false })}>{t("Refuser", "Decline", "Rechazar")}</button>
      </> : <><span className={styles.note}>{t("Invitation envoyée", "Request sent", "Invitación enviada")}</span><button className={styles.secondary} disabled={disabled} onClick={() => void execute({ action: "friend.remove", friendshipId: friend.id })}>{t("Annuler", "Cancel", "Cancelar")}</button></>}
  </div>;
}

export function CafePeople({ snapshot, tab, locale, execute, disabled, onBlock, onReport, languageHint }: {
  snapshot: CafeCommunitySnapshot; tab: "people" | "messages"; locale: CommunityLocale; execute: Execute; disabled: boolean;
  onBlock: (member: CafeMember) => void; onReport: (member: CafeMember) => void; languageHint?: string | null;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const [language, setLanguage] = useState(languageHint ?? "");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [match, setMatch] = useState<"either" | "native" | "learning">("either");
  const [inviting, setInviting] = useState<string | null>(null);
  const friends = snapshot.friends ?? [];
  const representedLanguages = new Set([...snapshot.people.flatMap(person => [...person.nativeLanguages, ...person.learningLanguages]), language].filter(Boolean));
  const languageOptions = cafeLanguageOptions(locale, [...representedLanguages]).filter(option => representedLanguages.has(option.code));
  const people = snapshot.people.filter(person => (!onlineOnly || person.online) && (!language ||
    (match !== "learning" && person.nativeLanguages.includes(language)) || (match !== "native" && person.learningLanguages.includes(language))));
  const visibleFriends = [...friends].sort((a, b) => Number(b.status === "pending" && b.direction === "incoming") - Number(a.status === "pending" && a.direction === "incoming") || b.updatedAt.localeCompare(a.updatedAt));
  return <section className={styles.content} aria-label={tab === "people" ? t("Rencontrer", "Meet people", "Conocer personas") : t("Mes conversations", "My conversations", "Mis conversaciones")}>
    {tab === "people" ? <>
      <div className={styles.heading}><h2>{t("Partenaires de langues", "Language partners", "Compañeros de idiomas")}</h2></div>
      <div className={styles.filters}>
        <label>{t("Langue", "Language", "Idioma")}<select value={language} onChange={event => setLanguage(event.target.value)}><option value="">{t("Toutes les langues", "All languages", "Todos los idiomas")}</option>{languageOptions.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
        <label>{t("La personne", "The person", "La persona")}<select value={match} onChange={event => setMatch(event.target.value as typeof match)}><option value="either">{t("Parle ou apprend", "Speaks or learns", "Habla o aprende")}</option><option value="native">{t("Langue maternelle", "Native language", "Lengua materna")}</option><option value="learning">{t("Apprend", "Is learning", "Aprende")}</option></select></label>
        <label className={styles.check}><input type="checkbox" checked={onlineOnly} onChange={event => setOnlineOnly(event.target.checked)} />{t("En ligne maintenant", "Online now", "En línea ahora")}</label>
      </div>
      <div className={styles.grid}>{people.map(person => {
        const friend = friends.find(item => item.member.id === person.id);
        return <article className={styles.person} key={person.id}>
          <div className={styles.personTop}><CafeAvatar member={person} large /><span className={person.online ? styles.online : styles.offline}>{person.online ? t("En ligne", "Online", "En línea") : t("Hors ligne", "Offline", "Sin conexión")}</span></div>
          <h3>{person.displayName}</h3><Languages member={person} locale={locale} />
          {friend?.status === "pending" && friend.direction === "incoming" && <p className={styles.introduction}>{friend.introduction}</p>}
          {friend ? <ConnectionActions friend={friend} execute={execute} disabled={disabled} locale={locale} />
            : inviting === person.id ? <Invite member={person} execute={execute} disabled={disabled} locale={locale} onClose={() => setInviting(null)} />
            : <button className={styles.primary} disabled={disabled} onClick={() => setInviting(person.id)}><UserPlus size={18} />{t("Faire connaissance", "Say hello", "Conocernos")}</button>}
          <div className={styles.safety}>
            <button title={t("Signaler", "Report", "Denunciar")} aria-label={t(`Signaler ${person.displayName}`, `Report ${person.displayName}`, `Denunciar a ${person.displayName}`)} onClick={() => onReport(person)}><Flag size={16} /></button>
            <button title={t("Bloquer", "Block", "Bloquear")} aria-label={t(`Bloquer ${person.displayName}`, `Block ${person.displayName}`, `Bloquear a ${person.displayName}`)} onClick={() => onBlock(person)}><ShieldOff size={16} /></button>
          </div>
        </article>;
      })}</div>
      {!people.length && <div className={styles.empty}><Users size={32} /><h3>{t("Personne ne correspond pour le moment.", "No matches right now.", "No hay coincidencias por ahora.")}</h3><button className={styles.secondary} onClick={() => { setLanguage(""); setOnlineOnly(false); setMatch("either"); }}>{t("Voir toutes les personnes", "See everyone", "Ver todas las personas")}</button></div>}
    </> : <>
      <div className={styles.heading}><h2>{t("Vos liens, vos conversations", "Your connections, your conversations", "Tus contactos, tus conversaciones")}</h2></div>
      <div className={styles.connections}>{visibleFriends.map(friend => <article className={styles.connection} key={friend.id}>
        <CafeAvatar member={friend.member} /><div className={styles.connectionBody}><h3>{friend.member.displayName}<span className={friend.member.online ? styles.online : styles.offline}>{friend.member.online ? t("En ligne", "Online", "En línea") : t("Hors ligne", "Offline", "Sin conexión")}</span></h3>
          {friend.status === "pending" && <p className={styles.note}>{friend.direction === "incoming" ? t("Souhaite faire connaissance", "Wants to connect", "Quiere conocerte") : t("En attente de réponse", "Awaiting a reply", "Esperando respuesta")}</p>}
          <p className={styles.introduction}>{friend.introduction}</p>
          <ConnectionActions friend={friend} execute={execute} disabled={disabled} locale={locale} />
          <div className={styles.actions}>
            {friend.status === "accepted" && <button className={styles.textButton} disabled={disabled} onClick={() => void execute({ action: "friend.remove", friendshipId: friend.id })}>{t("Retirer le contact", "Remove connection", "Eliminar contacto")}</button>}
            <button className={styles.textButton} onClick={() => onReport(friend.member)}>{t("Signaler", "Report", "Denunciar")}</button>
            <button className={styles.textButton} onClick={() => onBlock(friend.member)}>{t("Bloquer", "Block", "Bloquear")}</button>
          </div>
        </div>
      </article>)}</div>
      {!friends.length && <div className={styles.empty}><MessageCircle size={32} /><h3>{t("Votre prochaine conversation commence par un bonjour.", "Your next conversation starts with hello.", "Tu próxima conversación empieza con un hola.")}</h3></div>}
    </>}
  </section>;
}
