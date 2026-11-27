import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { YoAppHeader } from "../../components/yo/YoAppHeader";
import { CompanionAvatar } from "../../components/companion/CompanionAvatar";
import { RankingsAccount } from "../../components/yo/rankings/YoRankings";
import styles from "../../components/yo/rankings/rankings.module.css";
import { rankingCopy } from "../../lib/yo/rankings/copy";
import { RankingClientError, type RankingTransport } from "../../lib/yo/rankings/uiClient";
import { RANKING_LANGUAGES, type RankingFriend, type RankingRow, type RankingSnapshot } from "../../lib/yo/rankings/contract";
import { getYoLocale } from "../../lib/yo/localize";
import type { YoLocale } from "../../lib/yo/types";

if (!["127.0.0.1", "localhost", "[::1]"].includes(location.hostname)) throw new Error("Loopback visual review only");
const query = new URLSearchParams(location.search);
type Scenario = "populated" | "private" | "empty" | "error";
const scenario = (["populated", "private", "empty", "error"].includes(query.get("scenario") ?? "") ? query.get("scenario") : "populated") as Scenario;
const locale = getYoLocale(query.get("lang") ?? undefined);
document.documentElement.lang = locale;

/** Fixed, visibly synthetic people. This adapter never calls fetch or writes browser storage. */
function createFixtureTransport(initial: Scenario): RankingTransport {
  const people = Array.from({ length: 32 }, (_, index) => ({
    id: index === 23 ? "qa-self" : `qa-person-${index + 1}`,
    name: index === 23 ? "QA Exploreur" : `QA Profil ${String(index + 1).padStart(2, "0")}`,
    weekly: (32 - index) * 10, total: (32 - index) * 130,
    language: RANKING_LANGUAGES[index % RANKING_LANGUAGES.length],
  }));
  const profile = { id: "qa-self", displayName: "QA Exploreur", participating: initial !== "private", friendCode: "QATEST88", totalXp: 1170, weekXp: 90 };
  const friends: RankingSnapshot["friends"] = {
    incoming: [{ id: "qa-person-7", name: "QA Profil 07" }],
    outgoing: [{ id: "qa-person-12", name: "QA Profil 12" }],
    accepted: [{ id: "qa-person-3", name: "QA Profil 03" }, { id: "qa-person-26", name: "QA Profil 26" }],
    blocked: [{ id: "qa-person-31", name: "QA Profil 31" }],
  };
  const remove = (items: RankingFriend[], id: string) => items.filter(item => item.id !== id);
  return async (owner, path, init) => {
    if (owner !== "qa-account") throw new RankingClientError(401, "unauthorized");
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (initial === "error") throw new RankingClientError(503, "unavailable");
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      if (path === "/profile") {
        profile.displayName = String(body.displayName).trim(); profile.participating = body.participating === true;
      } else if (path === "/friends") {
        if (body.action === "request") {
          if (String(body.code).trim().toUpperCase() !== "QAADD123") throw new RankingClientError(409, "invalid_friend");
          if (!friends.outgoing.some(item => item.id === "qa-person-18")) friends.outgoing.push({ id: "qa-person-18", name: "QA Profil 18" });
        } else {
          const target = people.find(person => person.id === body.id);
          if (!target) throw new RankingClientError(409, "invalid_friend");
          if (body.action === "accept") {
            friends.incoming = remove(friends.incoming, body.id);
            if (!friends.accepted.some(item => item.id === body.id)) friends.accepted.push({ id: target.id, name: target.name });
          } else if (body.action === "decline") friends.incoming = remove(friends.incoming, body.id);
          else if (body.action === "remove") { friends.outgoing = remove(friends.outgoing, body.id); friends.accepted = remove(friends.accepted, body.id); }
          else if (body.action === "block") {
            friends.incoming = remove(friends.incoming, body.id); friends.outgoing = remove(friends.outgoing, body.id); friends.accepted = remove(friends.accepted, body.id);
            if (!friends.blocked.some(item => item.id === body.id)) friends.blocked.push({ id: target.id, name: target.name });
          } else if (body.action === "unblock") friends.blocked = remove(friends.blocked, body.id);
        }
      }
      return { ok: true };
    }
    const params = new URLSearchParams(path.startsWith("?") ? path.slice(1) : "");
    const scope = params.get("scope") === "friends" ? "friends" : "everyone";
    const period = params.get("period") === "all" ? "all" : "week";
    const language = (params.get("language") ?? "all") as RankingSnapshot["language"];
    const accepted = new Set(friends.accepted.map(item => item.id)), blocked = new Set(friends.blocked.map(item => item.id));
    const eligible = initial === "empty" ? [] : people.filter(person =>
      !blocked.has(person.id) && (person.id !== "qa-self" || profile.participating)
      && (scope !== "friends" || accepted.has(person.id) || person.id === "qa-self")
      && (language === "all" || person.language === language));
    const sorted = eligible.map(person => ({ ...person, xp: period === "all" ? person.total : person.weekly })).sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id));
    const rows: RankingRow[] = sorted.map((person, index) => ({
      id: person.id, name: person.id === "qa-self" ? profile.displayName : person.name,
      xp: person.xp, rank: index + 1, isYou: person.id === "qa-self", friend: accepted.has(person.id),
    }));
    const selfIndex = rows.findIndex(person => person.isYou);
    const snapshot: RankingSnapshot = {
      profile: { ...profile, ...(initial === "empty" ? { totalXp: 0, weekXp: 0 } : {}) }, scope, period, language,
      weekStartsAt: "2026-11-23T05:00:00.000Z", rows: rows.slice(0, 20),
      nearby: selfIndex < 0 ? [] : rows.slice(Math.max(0, selfIndex - 2), selfIndex + 3),
      me: selfIndex < 0 ? null : rows[selfIndex], totalParticipants: rows.length, friends: structuredClone(friends),
    };
    return snapshot;
  };
}

function ProductReview({ language, mode }: { language: YoLocale; mode: Scenario }) {
  const transport = useMemo(() => createFixtureTransport(mode), [mode]);
  const c = rankingCopy[language];
  return <>
    <p className="qa-banner">LOCAL VISUAL QA · ALL PEOPLE, XP AND FRIEND REQUESTS BELOW ARE SYNTHETIC · No account, API, messages or storage. Test friend code: QAADD123.</p>
    <YoAppHeader locale={language} backHref="/yo/langues" backLabel={c.back} title={c.rankings} selectorPath="/yo/classement" surfaceId="rankings" />
    <main className={styles.page} lang={language} data-testid="yo-rankings-review">
      <section className={styles.hero} aria-labelledby="rankings-heading">
        <div className={styles.heroCopy}><p className={styles.eyebrow}><Sparkles size={15} aria-hidden />{c.eyebrow}</p><h1 id="rankings-heading">{c.title}</h1><p className={styles.intro}>{c.intro}</p></div>
        <div className={styles.heroCompanion} aria-hidden><CompanionAvatar state="celebrating" size="lg" locale={language} compact /></div>
      </section>
      <RankingsAccount key={`${language}/${mode}`} userId="qa-account" locale={language} transport={transport} />
    </main>
  </>;
}

function ReviewControls() {
  const [width, setWidth] = useState(query.get("width") === "320" ? "320" : query.get("width") === "390" ? "390" : "desktop");
  const [language, setLanguage] = useState(locale);
  const [mode, setMode] = useState(scenario);
  const [revision, setRevision] = useState(0);
  const params = new URLSearchParams({ embed: "1", lang: language, scenario: mode, revision: String(revision) });
  return <div>
    <header className="qa-controls">
      <strong>YoPratiqo rankings · isolated visual review</strong>
      <p>Fictional fixtures only. The narrow frame tests CSS layout in this desktop browser; it is not a physical phone or live-account test.</p>
      <div><label>Frame width <select value={width} onChange={event => setWidth(event.target.value)}><option value="desktop">Desktop</option><option value="390">390 px</option><option value="320">320 px</option></select></label>
        <label>Language <select value={language} onChange={event => setLanguage(event.target.value as YoLocale)}><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option></select></label>
        <label>Scenario <select value={mode} onChange={event => setMode(event.target.value as Scenario)}><option value="populated">Synthetic top 20 + self nearby</option><option value="private">Private / explicit opt-in</option><option value="empty">Empty</option><option value="error">Service unavailable (503)</option></select></label>
        <button type="button" onClick={() => setRevision(value => value + 1)}>Reset fixtures</button>
        <a href={`/?${params}`} target="_blank" rel="noreferrer">Open frame directly</a>
      </div>
    </header>
    <iframe title="Synthetic ranking review" key={params.toString()} src={`/?${params}`} className="qa-frame" style={{ width: width === "desktop" ? "100%" : `${width}px` }} />
  </div>;
}

// Product destinations never leave the loopback review or trigger account/network work.
document.addEventListener("click", event => {
  if (query.get("embed") !== "1") return;
  const target = event.target instanceof Element ? event.target.closest("a") : null;
  if (target) { event.preventDefault(); target.setAttribute("title", `Navigation disabled in isolated review: ${target.getAttribute("href")}`); }
}, true);
createRoot(document.getElementById("root")!).render(query.get("embed") === "1" ? <ProductReview language={locale} mode={scenario} /> : <ReviewControls />);
