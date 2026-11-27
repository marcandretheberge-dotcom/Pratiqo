import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { YoAppHeader } from "../../components/yo/YoAppHeader";
import { CompanionAvatar } from "../../components/companion/CompanionAvatar";
import { RankingsAccount } from "../../components/yo/rankings/YoRankings";
import styles from "../../components/yo/rankings/rankings.module.css";
import { rankingCopy } from "../../lib/yo/rankings/copy";
import { RankingClientError, type RankingTransport } from "../../lib/yo/rankings/uiClient";
import type { RankingSnapshot } from "../../lib/yo/rankings/contract";
import { getYoLocale } from "../../lib/yo/localize";
import type { YoLocale } from "../../lib/yo/types";

if (!["127.0.0.1", "localhost", "[::1]"].includes(location.hostname)) throw new Error("Loopback visual review only");
const query = new URLSearchParams(location.search);
type Scenario = "private" | "empty" | "error";
const scenario = (["private", "empty", "error"].includes(query.get("scenario") ?? "") ? query.get("scenario") : "empty") as Scenario;
const locale = getYoLocale(query.get("lang") ?? undefined);
document.documentElement.lang = locale;

/** Empty-state adapter only. No identities, earned XP, friendships or mutations are generated. */
function createEmptyTransport(initial: Scenario): RankingTransport {
  return async (_owner, path, init) => {
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (initial === "error" || init?.method === "POST") throw new RankingClientError(503, "unavailable");
    const params = new URLSearchParams(path.startsWith("?") ? path.slice(1) : "");
    const snapshot: RankingSnapshot = {
      profile: { id: "", displayName: "", participating: false, friendCode: "", totalXp: 0, weekXp: 0 },
      scope: params.get("scope") === "friends" ? "friends" : "everyone",
      period: params.get("period") === "all" ? "all" : "week",
      language: (params.get("language") ?? "all") as RankingSnapshot["language"],
      weekStartsAt: "2026-11-23T05:00:00.000Z", rows: [], nearby: [], me: null, totalParticipants: 0,
      friends: { incoming: [], outgoing: [], accepted: [], blocked: [] },
    };
    return snapshot;
  };
}

function ProductReview({ language, mode }: { language: YoLocale; mode: Scenario }) {
  const transport = useMemo(() => createEmptyTransport(mode), [mode]);
  const c = rankingCopy[language];
  return <>
    <p className="qa-banner">LOCAL EMPTY-STATE PREVIEW · No profiles, earned XP or friend requests. Account actions are unavailable in this read-only preview.</p>
    <YoAppHeader locale={language} backHref="/yo/langues" backLabel={c.back} title={c.rankings} selectorPath="/yo/classement" surfaceId="rankings" />
    <main className={styles.page} lang={language} data-testid="yo-rankings-review">
      <section className={styles.hero} aria-labelledby="rankings-heading">
        <div className={styles.heroCopy}><p className={styles.eyebrow}><Sparkles size={15} aria-hidden />{c.eyebrow}</p><h1 id="rankings-heading">{c.title}</h1><p className={styles.intro}>{c.intro}</p></div>
        <div className={styles.heroCompanion} aria-hidden><CompanionAvatar state="celebrating" size="lg" locale={language} compact /></div>
      </section>
      <RankingsAccount key={`${language}/${mode}`} userId="" locale={language} transport={transport} />
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
      <p>Empty states only, with no profiles or earned XP. The narrow frame shows responsive CSS in this desktop browser.</p>
      <div><label>Frame width <select value={width} onChange={event => setWidth(event.target.value)}><option value="desktop">Desktop</option><option value="390">390 px</option><option value="320">320 px</option></select></label>
        <label>Language <select value={language} onChange={event => setLanguage(event.target.value as YoLocale)}><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option></select></label>
        <label>Scenario <select value={mode} onChange={event => setMode(event.target.value as Scenario)}><option value="private">Private / explicit opt-in</option><option value="empty">Empty</option><option value="error">Service unavailable (503)</option></select></label>
        <button type="button" onClick={() => setRevision(value => value + 1)}>Reset preview</button>
        <a href={`/?${params}`} target="_blank" rel="noreferrer">Open frame directly</a>
      </div>
    </header>
    <iframe title="Empty ranking review" key={params.toString()} src={`/?${params}`} className="qa-frame" style={{ width: width === "desktop" ? "100%" : `${width}px` }} />
  </div>;
}

// Product destinations never leave the loopback review or trigger account/network work.
document.addEventListener("click", event => {
  if (query.get("embed") !== "1") return;
  const target = event.target instanceof Element ? event.target.closest("a") : null;
  if (target) { event.preventDefault(); target.setAttribute("title", `Navigation disabled in isolated review: ${target.getAttribute("href")}`); }
}, true);
createRoot(document.getElementById("root")!).render(query.get("embed") === "1" ? <ProductReview language={locale} mode={scenario} /> : <ReviewControls />);
