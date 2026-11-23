"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Award, Check, ChevronRight, Headphones, Map as MapIcon, Medal, MessageCircle, Settings2, Sparkles, Target, Trophy, Volume2, VolumeX, X, Zap } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { GuidedItalianCourse, type ItalianNavigatorContext } from "../italian/guided/GuidedItalianCourse";
import { ItalianTravelNavigator } from "../italian/travel/ItalianTravelNavigator";
import { FeedbackSettings, LearningFeedbackProvider, useLearningFeedback } from "../feedback/LearningFeedback";
import { OnDemandLearningAudio } from "../personalized/LearningAudio";
import type { CourseCatalog, CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import type { WordBankEntry } from "@/lib/yo/personalized/types";
import type { YoLocale } from "@/lib/yo/types";
import { canPlayItalianTrivia } from "@/lib/yo/italian/trivia";
import { t } from "@/lib/yo/italian/course/courseAuthoring";
import { demoRanking, emptyRewards, parseRewards, reconcileRewards, rewardSummary, PREVIEW_PROGRESS_KEY, REWARD_KEY, REWARD_NAMESPACE, type RewardLedger } from "@/lib/yo/rewards/italianPreviewRewards";
import "../italian/travel/illustratedAtlas.css";
import "./italianRewards.css";
import { ConversationPostcard } from "./ConversationPostcard";

type Props = { units: CourseUnit[]; catalog: CourseCatalog; locale: YoLocale; banks: Record<string, WordBankEntry[]>; audioPaths: Record<string, string> };
type Tab = "journey" | "goals" | "ranking" | "speak";
type PreviewContext = {
  locale: YoLocale; unit: CourseUnit; florence: CourseUnit; tab: Tab;
  openUnit: (id: string) => void; observe: (progress: CourseProgress) => void;
};
const NavigatorContext = createContext<PreviewContext | null>(null);

/** Stable component identity preserves the traveler while the XP panel updates. */
function RewardsNavigator(props: ItalianNavigatorContext) {
  const context = useContext(NavigatorContext)!;
  const { observe } = context;
  useEffect(() => observe(props.progress), [props.progress, observe]);
  return <div hidden={context.tab !== "journey"}><ItalianTravelNavigator {...props} illustrated active={props.active && context.tab === "journey"}
    locale={context.locale} unit={context.unit} florence={context.florence}
    storageKey={`${REWARD_NAMESPACE}.travel`} openUnit={context.openUnit}
    triviaAvailable={canPlayItalianTrivia(context.unit, props.progress)}/></div>;
}

export function ItalianRewardsPreview(props: Props) {
  return <OnDemandLearningAudio><LearningFeedbackProvider storageNamespace={REWARD_NAMESPACE} consistent><RewardsApp {...props}/></LearningFeedbackProvider></OnDemandLearningAudio>;
}

function RewardsApp({ units, catalog, locale, banks, audioPaths }: Props) {
  const say = (fr: string, en: string, es: string) => t(fr, en, es)[locale];
  const [unitId, setUnitId] = useState(units[0].id);
  const [tab, setTab] = useState<Tab>("journey");
  const [ledger, setLedger] = useState<RewardLedger>(emptyRewards);
  const [now, setNow] = useState(0), [stored, setStored] = useState(true), [settings, setSettings] = useState(false);
  const [notice, setNotice] = useState<{ xp: number; lesson: boolean; mastery: boolean; key: number } | null>(null);
  const current = useRef(emptyRewards()), initialized = useRef(false), toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const feedback = useLearningFeedback();
  const unit = units.find(u => u.id === unitId) ?? units[0];
  const summary = rewardSummary(ledger, now);
  const finishedGoals = summary.goals.filter(g => g.count >= g.target).length;

  useEffect(() => {
    const restore = () => {
      try {
        const next = parseRewards(localStorage.getItem(REWARD_KEY), units);
        current.current = next; setLedger(next);
        const savedUnit = localStorage.getItem(`${REWARD_NAMESPACE}.unit`);
        if (savedUnit && units.some(u => u.id === savedUnit)) setUnitId(savedUnit);
      } catch { setStored(false); }
      setNow(Date.now());
    };
    restore();
    const tick = setInterval(() => setNow(Date.now()), 30000);
    const sync = (event: StorageEvent) => { if (event.key === REWARD_KEY) restore(); };
    window.addEventListener("storage", sync);
    document.body.classList.add("yo-reward-review");
    return () => { clearInterval(tick); clearTimeout(toastTimer.current); window.removeEventListener("storage", sync); document.body.classList.remove("yo-reward-review"); };
  }, [units]);

  const observe = useCallback((progress: CourseProgress) => {
    let previous = current.current;
    try {
      const disk = parseRewards(localStorage.getItem(REWARD_KEY), units);
      previous = { version: 1, events: [...new Map([...previous.events, ...disk.events].map(e => [e.id, e])).values()] };
    } catch { setStored(false); }
    const next = reconcileRewards(previous, progress, units);
    const added = next.events.filter(e => !previous.events.some(p => p.id === e.id));
    current.current = next;
    if (added.length) {
      try { localStorage.setItem(REWARD_KEY, JSON.stringify(next)); setStored(true); } catch { setStored(false); }
      setLedger(next); setNow(Date.now());
      if (initialized.current) {
        setNotice({ xp: added.reduce((n, e) => n + e.xp, 0), lesson: added.some(e => e.kind === "lesson"), mastery: added.some(e => e.kind === "mastery"), key: Date.now() });
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setNotice(null), 2600);
      }
    }
    initialized.current = true;
  }, [units]);
  const openUnit = useCallback((id: string) => {
    // The map invokes this only for destinations admitted by the canonical journey.
    setUnitId(id);
    try { localStorage.setItem(`${REWARD_NAMESPACE}.unit`, id); } catch { setStored(false); }
  }, []);
  const labels = {
    journey: say("Voyage", "Journey", "Viaje"), goals: say("Objectifs", "Goals", "Objetivos"),
    ranking: say("Classement", "Ranking", "Clasificación"),
    speak: say("Parler", "Speak", "Hablar"),
  };
  const goalNames = [
    say("Réussir 5 activités", "Complete 5 activities", "Completar 5 actividades"),
    say("Réussir 2 écoutes", "Complete 2 listening activities", "Completar 2 actividades de escucha"),
    say("Terminer une leçon", "Finish one lesson", "Terminar una lección"),
  ];
  const goalIcons = [Target, Headphones, Award];
  const goalPanel = <section className="reward-goals" aria-label={labels.goals}>
    <div className="reward-section-heading"><div><p className="reward-eyebrow">{say("Un peu, chaque jour", "A little, every day", "Un poco, cada día")}</p><h2>{say("Tes objectifs du jour", "Your daily goals", "Tus objetivos de hoy")}</h2></div><span className="reward-count">{finishedGoals}/3</span></div>
    {summary.goals.map((goal, i) => { const Icon = goalIcons[i], complete = goal.count >= goal.target; return <div className={`reward-goal ${complete ? "is-complete" : ""}`} key={goal.id}>
      <span className="reward-goal-icon">{complete ? <Check/> : <Icon/>}</span><div><strong>{goalNames[i]}</strong><progress aria-label={goalNames[i]} value={Math.min(goal.count, goal.target)} max={goal.target}/></div><b>{Math.min(goal.count, goal.target)}/{goal.target}</b>
    </div>; })}
    <p className="reward-note">{say("Les nouvelles réussites comptent. Reviens demain à ton rythme.", "New successes count. Come back tomorrow at your own pace.", "Cuentan los nuevos logros. Vuelve mañana a tu ritmo.")}</p>
  </section>;
  const ranking = demoRanking(summary.weekly);
  return <div className="rewards-app" lang={locale} data-italian-rewards-preview>
    <div className="reward-preview-label">{say("PREVIEW PRIVÉE", "PRIVATE PREVIEW", "VISTA PREVIA PRIVADA")} <span>{say("Progression séparée · classement fictif", "Separate progress · fictional ranking", "Progreso separado · clasificación ficticia")}</span></div>
    <header className="reward-header">
      <div className="reward-brand"><span>Yo<span>Pratiqo</span></span><small>{say("Le voyage italien", "The Italian journey", "El viaje italiano")}</small></div>
      <div className="reward-header-actions"><span className="reward-xp" aria-label={`${summary.total} XP`}><Zap size={18} fill="currentColor"/><b data-total-xp>{summary.total}</b><small>XP</small></span>
        <button title={say("Réglages", "Settings", "Ajustes")} aria-label={say("Réglages", "Settings", "Ajustes")} onClick={() => setSettings(true)}><Settings2 size={21}/></button></div>
    </header>
    {(!stored || !feedback.stored) && <p role="status" className="reward-storage">{say("La sauvegarde est indisponible. Tes points restent dans cette session seulement.", "Saving is unavailable. Your points last for this session only.", "No se puede guardar. Tus puntos duran solo esta sesión.")}</p>}
    <div className={`reward-layout tab-${tab}`}>
      <div className="reward-main">
        <NavigatorContext.Provider value={{ unit, florence: units[5], locale, tab, openUnit, observe }}>
          <div className="reward-course" hidden={tab !== "journey"}>
            <GuidedItalianCourse key={unit.id} Navigator={RewardsNavigator} unit={unit} catalog={catalog} locale={locale}
              audioPaths={audioPaths} progressKey={PREVIEW_PROGRESS_KEY} storageNamespace={REWARD_NAMESPACE}
              wordBank={banks[unit.id]} resumeMission={unitId !== units[0].id}
              missionStatus={<div className="reward-mission-status"><span><Zap size={15}/><b>{summary.total} XP</b></span><span>{say("Activités du jour","Today's activities","Actividades de hoy")}<b>{Math.min(5,summary.goals[0].count)}/5</b><i className="reward-punches" aria-hidden="true">{Array.from({length:5},(_,i)=><i key={i} data-filled={i<summary.goals[0].count}/>)}</i></span></div>}/>
          </div>
        </NavigatorContext.Provider>
        {tab === "speak" && <ConversationPostcard key={unit.id} unit={unit} locale={locale} audioPaths={audioPaths}/>}
        {tab === "goals" && <div className="reward-page"><div className="reward-page-title"><Target size={32}/><h1>{labels.goals}</h1></div>{goalPanel}
          <section className="reward-earned"><Medal size={32}/><div><h2>{say("De vraies petites victoires", "Real little victories", "Pequeñas victorias reales")}</h2>
            <p><strong>{summary.today} XP</strong> {say("aujourd’hui", "today", "hoy")} · <strong>{summary.mastered}</strong> {say("défis de module réussis sans aide", "module challenges passed independently", "retos de módulo superados sin ayuda")}</p></div></section>
          <button className="reward-primary" onClick={() => setTab("journey")}>{say("Retour à mon voyage", "Back to my journey", "Volver a mi viaje")}<ChevronRight size={20}/></button>
        </div>}
        {tab === "ranking" && <div className="reward-page">
          <div className="reward-league-heading"><Trophy size={38}/><p className="reward-eyebrow">{say("Cette semaine", "This week", "Esta semana")}</p><h1>{say("Les voyageurs", "The travelers", "Los viajeros")}</h1><p>{say("Chaque petit progrès compte.", "Every little step counts.", "Cada pequeño avance cuenta.")}</p></div>
          <p className="reward-demo-notice">{say("Classement de démonstration. Les quatre autres profils sont fictifs ; seuls tes XP viennent de ta pratique dans cette preview.", "Demo ranking. The other four profiles are fictional; only your XP comes from your practice in this preview.", "Clasificación de demostración. Los otros cuatro perfiles son ficticios; solo tus XP vienen de tu práctica en esta vista previa.")}</p>
          <ol className="reward-ranking">{ranking.map((person, i) => <li key={person.id} className={person.id === "you" ? "is-you" : ""}>
            <span className="reward-rank">{i === 0 ? <Trophy size={21}/> : i + 1}</span>
            <span className="reward-avatar" style={{ background: person.color }}>{person.id === "you" ? <CompanionAvatar visualId="travel" state="idle" size="xs" compact locale={locale}/> : person.name[0]}</span>
            <div><strong>{person.id === "you" ? say("Toi", "You", "Tú") : person.name}</strong><small>{person.id === "you" ? say("Ton voyage italien", "Your Italian journey", "Tu viaje italiano") : say("Profil fictif", "Fictional profile", "Perfil ficticio")}</small></div><b>{person.xp}<small> XP</small></b>
          </li>)}</ol>
          <p className="reward-note">{say("Nouvelle semaine chaque lundi, heure de Toronto. Tes XP cumulés et tes acquis restent à toi.", "A new week every Monday, Toronto time. Your total XP and learning progress stay yours.", "Nueva semana cada lunes, hora de Toronto. Conservas tus XP totales y tu aprendizaje.")}</p>
          <button className="reward-primary" onClick={() => setTab("journey")}>{say("Continuer à apprendre", "Keep learning", "Seguir aprendiendo")}<ChevronRight size={20}/></button>
        </div>}
      </div>
      <aside className="reward-sidebar">{goalPanel}<div className="reward-sidebar-ranking"><Trophy/><div><strong>{summary.weekly} XP</strong><p>{say("cette semaine", "this week", "esta semana")}</p></div><button aria-label={labels.ranking} onClick={() => setTab("ranking")}><ChevronRight/></button></div>
        <p className="reward-note">{say("Pas de course contre la montre. Une bonne pratique vaut mieux qu’un clic de plus.", "No race against the clock. Good practice matters more than another click.", "Sin carreras contra el reloj. Practicar bien vale más que otro clic.")}</p>
      </aside>
    </div>
    <nav className="reward-tabs" aria-label={say("Mon apprentissage", "My learning", "Mi aprendizaje")}>
      {(["journey", "goals", "ranking", "speak"] as const).map((id, i) => { const Icon = [MapIcon, Target, Trophy, MessageCircle][i]; return <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><Icon size={23}/><span>{labels[id]}</span>{id === "goals" && finishedGoals > 0 && <small>{finishedGoals}</small>}</button>; })}
    </nav>
    {notice && <div className="reward-toast" data-tier={notice.mastery ? "mastery" : notice.lesson ? "lesson" : "practice"} key={notice.key} role="status"><CompanionAvatar visualId="travel" state={notice.mastery ? "badge_unlocked" : notice.lesson ? "level_up" : "celebrating"} size="xs" compact locale={locale}/><div><strong>+{notice.xp} XP</strong><p>{notice.mastery ? say("Défi réussi. Une nouvelle étape !", "Challenge passed. A new step!", "Reto superado. ¡Una nueva etapa!") : notice.lesson ? say("Une leçon de plus dans tes bagages !", "One more lesson in your backpack!", "¡Una lección más en tu mochila!") : say("Bravo, tu avances !", "Nice work. You're moving forward!", "¡Bien hecho, sigues avanzando!")}</p></div><Sparkles size={20}/></div>}
    <Dialog.Root open={settings} onOpenChange={setSettings}><Dialog.Portal><Dialog.Overlay className="reward-settings-overlay"/><Dialog.Content className="reward-settings" aria-describedby="reward-rules">
      <Dialog.Title>{say("À ton rythme", "At your own pace", "A tu ritmo")}</Dialog.Title><Dialog.Close className="reward-close" aria-label={say("Fermer", "Close", "Cerrar")}><X/></Dialog.Close>
      <FeedbackSettings locale={locale}/>
      <div id="reward-rules" className="reward-rules"><h3>{say("Comment gagner des XP", "How XP works", "Cómo ganar XP")}</h3><p>{say("5 XP par activité réussie, puis 5 de plus sans aide. 20 XP par leçon terminée. 50 XP pour un défi de module réussi sans aide. Chaque récompense n’est accordée qu’une fois.", "5 XP per completed activity, then 5 more independently. 20 XP per finished lesson. 50 XP for passing a module challenge without help. Each reward is granted only once.", "5 XP por actividad completada y 5 más sin ayuda. 20 XP por lección terminada. 50 XP por superar un reto de módulo sin ayuda. Cada recompensa se concede una sola vez.")}</p><p>{say("Les XP ne remplacent pas les compétences et ne débloquent aucun achat. Les erreurs ne retirent jamais de points.", "XP does not replace skills or unlock purchases. Mistakes never take points away.", "Los XP no sustituyen habilidades ni desbloquean compras. Los errores nunca restan puntos.")}</p></div>
      <button className="reward-mute" onClick={() => feedback.set({ sound: !feedback.sound })}>{feedback.sound ? <Volume2/> : <VolumeX/>}{feedback.sound ? say("Couper les effets", "Mute effects", "Silenciar efectos") : say("Activer les effets", "Enable effects", "Activar efectos")}</button>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
