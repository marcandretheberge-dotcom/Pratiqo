"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ChevronRight, Copy, Globe2, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Trophy, Users, UserRoundPlus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { productLoginHref } from "@/lib/auth/productReturn";
import { RANKING_LANGUAGES, type RankingFriend, type RankingFriendAction, type RankingLanguage, type RankingPeriod, type RankingRow, type RankingScope, type RankingSnapshot } from "@/lib/yo/rankings/contract";
import { rankingCopy, rankingLanguageNames } from "@/lib/yo/rankings/copy";
import { RankingClientError, rankingRequest, readRankingSnapshot, type RankingTransport } from "@/lib/yo/rankings/uiClient";
import type { YoLocale } from "@/lib/yo/types";
import styles from "./rankings.module.css";

type LoadState = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; snapshot: RankingSnapshot };
const count = (value: number, locale: YoLocale) => new Intl.NumberFormat(locale).format(value);
function errorText(error: unknown, locale: YoLocale) {
  const c = rankingCopy[locale];
  if (!(error instanceof RankingClientError)) return c.unavailable;
  return ({ 400: c.invalid, 401: c.unauthorized, 403: c.forbidden, 409: c.conflict, 429: c.rate } as Record<number, string>)[error.status] ?? c.unavailable;
}
const hrefFor = (path: string, locale: YoLocale) => `${path}${locale === "fr" ? "" : `?lang=${locale}`}`;

function Loading({ locale }: { locale: YoLocale }) {
  return <div className={styles.loading} role="status"><span className={styles.loadingDot} aria-hidden />{rankingCopy[locale].loading}</div>;
}

export function YoRankings({ locale }: { locale: YoLocale }) {
  const { user, loading } = useAuth();
  const c = rankingCopy[locale];
  return <main className={styles.page} lang={locale} data-testid="yo-rankings">
    <section className={styles.hero} aria-labelledby="rankings-heading">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><Sparkles size={15} aria-hidden />{c.eyebrow}</p>
        <h1 id="rankings-heading">{c.title}</h1><p className={styles.intro}>{c.intro}</p>
      </div>
      <div className={styles.heroCompanion} aria-hidden><CompanionAvatar state="celebrating" size="lg" locale={locale} compact /></div>
    </section>
    {loading ? <Loading locale={locale} /> : user ? <RankingsAccount key={user.id} userId={user.id} locale={locale} /> : <section className={`${styles.card} ${styles.signIn}`}>
      <div className={styles.circleIcon}><Trophy size={28} aria-hidden /></div>
      <h2>{c.loginTitle}</h2><p>{c.loginBody}</p>
      <Link className={styles.primary} href={productLoginHref(hrefFor("/yo/classement", locale))}>{c.login}<ChevronRight size={18} aria-hidden /></Link>
    </section>}
  </main>;
}

/** Keyed by account in YoRankings: an account change destroys every private view and request. */
export function RankingsAccount({ userId, locale, transport = rankingRequest }: { userId: string; locale: YoLocale; transport?: RankingTransport }) {
  const c = rankingCopy[locale];
  const [scope, setScope] = useState<RankingScope>("everyone");
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const [language, setLanguage] = useState<RankingLanguage | "all">("all");
  const [revision, setRevision] = useState(0);
  const requestKey = `${userId}/${scope}/${period}/${language}/${revision}`;
  const [result, setResult] = useState<{ key: string; state: LoadState }>({ key: "", state: { status: "loading" } });
  const state: LoadState = result.key === requestKey ? result.state : { status: "loading" };
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; mutation.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ scope, period, language });
    void transport(userId, `?${query}`, { signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return;
      const snapshot = readRankingSnapshot(value);
      if (snapshot.scope !== scope || snapshot.period !== period || snapshot.language !== language) throw new RankingClientError(503, "unavailable");
      setResult({ key: requestKey, state: { status: "ready", snapshot } });
    }).catch(error => { if (!controller.signal.aborted) setResult({ key: requestKey, state: { status: "error", error } }); });
    return () => controller.abort();
  }, [userId, scope, period, language, requestKey, transport]);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener("yo:ranking-award", refresh);
    return () => window.removeEventListener("yo:ranking-award", refresh);
  }, []);

  async function mutate(path: string, value: unknown, message: string) {
    if (mutation.current) return;
    const controller = new AbortController(); mutation.current = controller;
    setBusy(true); setNotice(null);
    try {
      await transport(userId, path, { method: "POST", body: JSON.stringify(value), signal: controller.signal });
      if (!live.current || controller.signal.aborted) return;
      setNotice({ error: false, text: message }); setRevision(v => v + 1);
    } catch (error) { if (live.current && !controller.signal.aborted) setNotice({ error: true, text: errorText(error, locale) }); }
    finally { if (mutation.current === controller) mutation.current = null; if (live.current) setBusy(false); }
  }
  const friendAction = (action: RankingFriendAction) => mutate("/friends", action, action.action === "request" ? c.sent : c.updated);

  return <div className={styles.account}>
    {notice ? <p className={notice.error ? styles.error : styles.notice} role={notice.error ? "alert" : "status"}>{notice.error ? null : <Check size={17} aria-hidden />}{notice.text}</p> : null}
    <section className={styles.filters} aria-label={c.rankings}>
      <div role="group" aria-label={c.scope} className={styles.segments}>
        <button type="button" aria-pressed={scope === "everyone"} onClick={() => setScope("everyone")} disabled={busy}><Globe2 size={17} aria-hidden />{c.everyone}</button>
        <button type="button" aria-pressed={scope === "friends"} onClick={() => setScope("friends")} disabled={busy}><Users size={17} aria-hidden />{c.friends}</button>
      </div>
      <div className={styles.selects}>
        <label><span>{c.period}</span><select value={period} onChange={e => setPeriod(e.target.value as RankingPeriod)} disabled={busy}><option value="week">{c.week}</option><option value="all">{c.all}</option></select></label>
        <label><span>{c.language}</span><select value={language} onChange={e => setLanguage(e.target.value as RankingLanguage | "all")} disabled={busy}><option value="all">{c.allLanguages}</option>{RANKING_LANGUAGES.map(l => <option key={l} value={l}>{rankingLanguageNames[locale][l]}</option>)}</select></label>
      </div>
    </section>
    {state.status === "loading" ? <Loading locale={locale} /> : state.status === "error" ? <section className={`${styles.card} ${styles.errorCard}`}>
      <p role="alert">{errorText(state.error, locale)}</p>
      {state.error instanceof RankingClientError && state.error.status === 401
        ? <Link className={styles.primary} href={productLoginHref(hrefFor("/yo/classement", locale))}>{c.login}</Link>
        : <button className={styles.secondary} type="button" onClick={() => setRevision(v => v + 1)}><RefreshCw size={16} aria-hidden />{c.retry}</button>}
    </section> : <>
      <div><p className={styles.smallLabel}>{c.personal}</p><section className={styles.stats} aria-label={c.personal}>
        <div className={styles.stat}><span className={styles.statIcon}><Sparkles size={19} aria-hidden /></span><div><span>{c.total}</span><strong>{count(state.snapshot.profile.totalXp, locale)} <small>XP</small></strong></div></div>
        <div className={styles.stat}><span className={`${styles.statIcon} ${styles.mint}`}><Trophy size={19} aria-hidden /></span><div><span>{c.weekXp}</span><strong>{count(state.snapshot.profile.weekXp, locale)} <small>XP</small></strong></div></div>
        <div className={`${styles.stat} ${styles.position}`}><span className={styles.statIcon}><Users size={19} aria-hidden /></span><div><span>{c.yourPosition}</span><strong>{state.snapshot.me ? `#${count(state.snapshot.me.rank, locale)}` : "—"}</strong><small>{state.snapshot.profile.participating ? (state.snapshot.me ? `${count(state.snapshot.totalParticipants, locale)} ${c.participants}` : c.noPosition) : c.private}</small></div></div>
      </section></div>
      <div className={styles.columns}>
        <div className={styles.boardColumn}>
          <section className={`${styles.card} ${styles.board}`} aria-labelledby="ranking-board-title">
            <div className={styles.cardHeading}><div><p className={styles.smallLabel}>{period === "week" ? c.week : c.all} · {language === "all" ? c.allLanguages : rankingLanguageNames[locale][language]}</p><h2 id="ranking-board-title">{scope === "friends" ? c.friends : c.boardTitle}</h2></div><button type="button" className={styles.iconButton} aria-label={c.refresh} title={c.refresh} onClick={() => setRevision(v => v + 1)} disabled={busy}><RefreshCw size={17} aria-hidden /></button></div>
            {state.snapshot.rows.length ? <RankingRows rows={state.snapshot.rows} locale={locale} busy={busy} onFriendAction={friendAction} /> : <div className={styles.empty}>
              <div className={styles.circleIcon}>{scope === "friends" ? <Users size={27} aria-hidden /> : <Trophy size={27} aria-hidden />}</div>
              <h3>{scope === "friends" ? c.emptyFriendsTitle : c.emptyTitle}</h3><p>{scope === "friends" ? c.emptyFriendsBody : c.emptyBody}</p>
              <Link className={styles.textLink} href={hrefFor("/yo/langues", locale)}>{c.start}<ChevronRight size={16} aria-hidden /></Link>
            </div>}
            {state.snapshot.nearby.some(row => !state.snapshot.rows.some(top => top.id === row.id)) ? <div className={styles.nearby}><h3>{c.nearby}</h3><RankingRows rows={state.snapshot.nearby} locale={locale} busy={busy} onFriendAction={friendAction} /></div> : null}
            {period === "week" ? <p className={styles.boardFoot}>{c.reset}</p> : null}
          </section>
          <details className={`${styles.card} ${styles.rules}`}><summary><Sparkles size={17} aria-hidden />{c.rulesTitle}</summary><p>{c.rules}</p><p>{c.rulesMore}</p></details>
        </div>
        <aside className={styles.sidebar}>
          <ProfileSettings key={`${state.snapshot.profile.id}/${state.snapshot.profile.participating}/${state.snapshot.profile.displayName}`} snapshot={state.snapshot} locale={locale} busy={busy} onSave={(displayName, participating) => mutate("/profile", { displayName, participating }, c.saved)} />
          <FriendPanel snapshot={state.snapshot} locale={locale} busy={busy} onAction={friendAction} />
        </aside>
      </div>
    </>}
  </div>;
}

export function RankingRows({ rows, locale, busy, onFriendAction }: { rows: RankingRow[]; locale: YoLocale; busy: boolean; onFriendAction: (action: RankingFriendAction) => void | Promise<void> }) {
  const c = rankingCopy[locale];
  return <ol className={styles.rows} aria-label={c.rankings}>
    {rows.map(row => <li key={row.id} className={`${styles.row} ${row.isYou ? styles.you : ""}`} data-ranking-self={row.isYou || undefined}>
      <span className={`${styles.rank} ${row.rank <= 3 ? styles.podium : ""}`} aria-label={`${c.rank} ${row.rank}`}>{row.rank === 1 ? <Trophy size={19} aria-hidden /> : row.rank}<span className={styles.srOnly}>{row.rank === 1 ? "1" : ""}</span></span>
      <span className={styles.avatar} aria-hidden>{Array.from(row.name)[0]?.toLocaleUpperCase(locale) ?? "·"}</span>
      <span className={styles.rowName}><strong>{row.name}</strong><span>{row.isYou ? c.you : row.friend ? c.friend : ""}</span></span>
      <strong className={styles.rowXp}>{count(row.xp, locale)} <small>XP</small></strong>
      {!row.isYou ? <details className={styles.rowActions}><summary aria-label={`${c.more}: ${row.name}`} title={`${c.more}: ${row.name}`}><span aria-hidden>···</span></summary><div><button type="button" disabled={busy} onClick={() => void onFriendAction({ action: "block", id: row.id })}>{c.block}</button></div></details> : <span className={styles.selfCheck} aria-hidden><Check size={16} /></span>}
    </li>)}
  </ol>;
}

function ProfileSettings({ snapshot, locale, busy, onSave }: { snapshot: RankingSnapshot; locale: YoLocale; busy: boolean; onSave: (name: string, participating: boolean) => Promise<void> }) {
  const c = rankingCopy[locale], profile = snapshot.profile;
  const [name, setName] = useState(profile.displayName);
  function submit(event: FormEvent) { event.preventDefault(); void onSave(name.trim(), true); }
  const form = <form onSubmit={submit} className={styles.form}>
    <label htmlFor="ranking-nickname">{c.nickname}</label><input id="ranking-nickname" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={24} required autoComplete="off" spellCheck={false} placeholder={c.nicknamePlaceholder} aria-describedby="ranking-nickname-help" disabled={busy} />
    <p id="ranking-nickname-help" className={styles.hint}>{c.nicknameHelp}</p>
    <button className={styles.primary} type="submit" disabled={busy}>{busy ? c.saving : profile.participating ? c.save : c.join}<ChevronRight size={17} aria-hidden /></button>
  </form>;
  return <section className={`${styles.card} ${styles.profile}`}>
    {profile.participating ? <>
      <p className={styles.participating}><ShieldCheck size={17} aria-hidden />{c.visible}</p>
      <h2 className={styles.alias}>{profile.displayName}</h2><p className={styles.body}>{c.sharedHelp}</p>
      <details className={styles.profileEdit}><summary>{c.settings}</summary>{form}</details>
      <button className={styles.leave} type="button" disabled={busy} onClick={() => void onSave(profile.displayName, false)}><LockKeyhole size={15} aria-hidden />{c.leave}</button>
    </> : <>
      <p className={styles.privateLabel}><LockKeyhole size={15} aria-hidden />{c.private}</p><h2>{c.joinTitle}</h2><p className={styles.body}>{c.joinBody}</p>{form}<p className={styles.hint}>{c.privateHelp}</p>
    </>}
  </section>;
}

function FriendPanel({ snapshot, locale, busy, onAction }: { snapshot: RankingSnapshot; locale: YoLocale; busy: boolean; onAction: (action: RankingFriendAction) => Promise<void> }) {
  const c = rankingCopy[locale];
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<"no" | "yes" | "error">("no");
  const friendList = (title: string, values: RankingFriend[], actions: ("accept" | "decline" | "remove" | "block" | "unblock")[], outgoing = false) => values.length ? <section className={styles.friendGroup}>
    <h3>{title}<span>{values.length}</span></h3><ul>{values.map(friend => <li key={friend.id}><strong>{friend.name.trim() || c.hiddenProfile}</strong><div>{actions.map(action => <button key={action} type="button" disabled={busy} className={action === "accept" ? styles.accept : ""} onClick={() => void onAction({ action, id: friend.id })}>{outgoing && action === "remove" ? c.cancel : c[action]}</button>)}</div></li>)}</ul>
  </section> : null;
  async function copy() {
    try { await navigator.clipboard.writeText(snapshot.profile.friendCode); setCopied("yes"); }
    catch { setCopied("error"); }
  }
  return <section className={`${styles.card} ${styles.friends}`} aria-labelledby="ranking-friends-heading">
    <div className={styles.friendsHeading}><Users size={21} aria-hidden /><h2 id="ranking-friends-heading">{c.friendshipTitle}</h2></div>
    {!snapshot.profile.participating ? <p className={styles.body}>{c.joinFriends}</p> : <>
      <p className={styles.body}>{c.friendshipIntro}</p>
      {snapshot.profile.friendCode ? <div className={styles.codeBox}><span>{c.yourCode}</span><div><code>{snapshot.profile.friendCode}</code><button type="button" className={styles.iconButton} aria-label={copied === "yes" ? c.copied : c.copy} onClick={() => void copy()}>{copied === "yes" ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}</button></div>{copied !== "no" ? <small role="status">{copied === "yes" ? c.copied : c.copyFailed}</small> : null}</div> : null}
      <form className={styles.form} onSubmit={event => { event.preventDefault(); void onAction({ action: "request", code: code.trim() }); }}>
        <label htmlFor="ranking-friend-code">{c.code}</label><input id="ranking-friend-code" value={code} onChange={event => setCode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={24} required placeholder={c.codePlaceholder} disabled={busy} />
        <button className={styles.secondary} type="submit" disabled={busy || !code.trim()}><UserRoundPlus size={17} aria-hidden />{c.request}</button>
      </form>
      {friendList(c.incoming, snapshot.friends.incoming, ["accept", "decline", "block"])}
      {friendList(c.outgoing, snapshot.friends.outgoing, ["remove"], true)}
      {friendList(c.accepted, snapshot.friends.accepted, ["remove", "block"])}
      {!snapshot.friends.incoming.length && !snapshot.friends.outgoing.length && !snapshot.friends.accepted.length ? <p className={styles.hint}>{c.noFriends}</p> : null}
    </>}
    {friendList(c.blocked, snapshot.friends.blocked, ["unblock"])}
  </section>;
}
