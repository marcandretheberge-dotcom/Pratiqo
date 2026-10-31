"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Coffee, Compass, Eye, EyeOff, Flag, MapPin, MessageCircle, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { CompanionVisualState } from "@/lib/companion/companionVisuals";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import { activities, cultureSources, grammarTips, moduleCopy, objectives, vocabulary } from "@/lib/yo/italian/italianModuleData";
import type { ItalianActivity, ItalianActivityCategory, ItalianCategory, LocaleText } from "@/lib/yo/italian/italianModuleTypes";
import { scrambleItalianItems } from "@/lib/yo/italian/italianModuleLogic";
import { ItalianGame, italianButton } from "./ItalianGames";
import { ItalianModuleAudio, ITALIAN_MODULE_AUDIO_STOP_EVENT } from "./ItalianModuleAudio";
import { ItalianYoppoCoach, type ItalianYoppoAction } from "./ItalianYoppoCoach";
import { useItalianModuleProgress } from "./useItalianModuleProgress";

const L = (fr: string, en: string, es: string): LocaleText => ({ fr, en, es });
const copy = {
  back: L("Italien", "Italian", "Italiano"), start: L("C’est parti !", "Let’s go!", "¡Vamos!"), next: L("Continuer", "Continue", "Continuar"), previous: L("Précédent", "Previous", "Anterior"),
  journey: L("Ta matinée", "Your morning", "Tu mañana"), welcome: L("Bienvenue à Bologne", "Welcome to Bologna", "Bienvenido a Bolonia"), greetings: L("Faire connaissance", "Meet someone", "Conocerse"), cafe: L("Une pause au café", "A café break", "Una pausa en el café"), city: L("Explorer la ville", "Explore the city", "Explorar la ciudad"), final: L("Ta mission finale", "Your final mission", "Tu misión final"), finish: L("Ton carnet de voyage", "Your travel notebook", "Tu cuaderno de viaje"),
  study: L("Dans ta poche", "In your pocket", "En tu bolsillo"), practice: L("À toi de jouer", "Your turn to play", "Te toca jugar"), step: L("Étape", "Step", "Etapa"), complete: L("défis réussis", "challenges completed", "retos completados"), independent: L("sans aide", "without help", "sin ayuda"), helped: L("avec aide", "with help", "con ayuda"), waiting: L("à explorer", "to explore", "por explorar"),
  translations: L("Afficher les traductions", "Show translations", "Mostrar traducciones"), hideTranslations: L("Masquer les traductions", "Hide translations", "Ocultar traducciones"), vocabulary: L("Mon carnet de mots", "My phrase notebook", "Mi cuaderno de palabras"), close: L("Fermer", "Close", "Cerrar"),
  save: L("Reprise sur cet appareil", "Resume on this device", "Continuar en este dispositivo"), noSave: L("La sauvegarde est indisponible dans ce navigateur. Tu peux continuer cette séance.", "Saving is unavailable in this browser. You can continue this session.", "No se puede guardar en este navegador. Puedes continuar esta sesión."),
  retry: L("Rejouer sans aide", "Replay without help", "Repetir sin ayuda"), skip: L("Passer pour l’instant", "Skip for now", "Saltar por ahora"), review: L("Reprendre mes révisions", "Review my practice", "Repasar mis actividades"), reviewTitle: L("Une nouvelle occasion d’essayer", "Another chance to try", "Otra oportunidad de intentarlo"),
  reset: L("Effacer ma progression", "Reset my progress", "Borrar mi progreso"), confirmReset: L("Confirmer l’effacement", "Confirm reset", "Confirmar borrado"), cancel: L("Annuler", "Cancel", "Cancelar"),
  bonus: L("Le petit défi de Yoppo", "Yoppo’s little challenge", "El pequeño reto de Yoppo"), bonusBody: L("Retrouve le sens de cette expression. Les bonus ne valident pas les défis du parcours ; ils peuvent t’aider pour l’activité en cours.", "Recall what this expression means. Bonuses do not complete course challenges; they can help with your current activity.", "Recuerda el significado de esta expresión. Los extras no completan los retos del módulo; pueden ayudarte con la actividad actual."), another: L("Encore un !", "One more!", "¡Otro más!"), correct: L("Esatto ! Bien joué.", "Esatto! Nicely done.", "¡Esatto! Bien hecho."), again: L("Pas tout à fait. Essaie une autre proposition.", "Not quite. Try another option.", "Todavía no. Prueba otra opción."),
  resources: L("Repères culturels", "Cultural notes", "Referencias culturales"), learned: L("Ce que tu vas pouvoir faire", "What you will be able to do", "Lo que podrás hacer"), mini: L("8 façons de jouer", "8 ways to play", "8 formas de jugar"), words: L("24 expressions utiles", "24 useful expressions", "24 expresiones útiles"),
  small: L("Une petite séance à la fois", "One short session at a time", "Una sesión corta a la vez"), noRush: L("Pas de chrono. Tu peux réessayer autant que tu veux.", "No timer. Try again as often as you like.", "Sin cronómetro. Puedes volver a intentarlo cuantas veces quieras."), incomplete: L("Ton aventure continue", "Your adventure continues", "Tu aventura continúa"),
  summary: L("Les étapes visitées ne comptent pas comme des réussites. Tu peux reprendre chaque défi et améliorer ton résultat.", "Visiting a step does not count as success. You can replay each challenge and improve your result.", "Visitar una etapa no cuenta como un logro. Puedes repetir cada reto y mejorar tu resultado."),
  privacy: L("Seuls tes résultats et ta position dans le module sont gardés sur cet appareil. Tes réponses écrites ne sont pas enregistrées.", "Only your results and place in the module are saved on this device. Your typed answers are not stored.", "Solo se guardan tus resultados y tu posición en el módulo en este dispositivo. Tus respuestas escritas no se almacenan."),
  speaking: L("À voix haute, pour toi : salue Yoppo, commande quelque chose et demande de répéter. Aucune voix n’est enregistrée ni notée automatiquement.", "Aloud, for yourself: greet Yoppo, order something and ask for a repeat. Your voice is neither recorded nor automatically graded.", "En voz alta, para ti: saluda a Yoppo, pide algo y solicita que repita. Tu voz no se graba ni se califica automáticamente."),
  learning: L("Les réussites avec transcription ou correction sont indiquées avec aide. Elles ne valident pas à elles seules la compréhension orale.", "Successes using a transcript or correction are marked as assisted. They do not by themselves demonstrate listening comprehension.", "Los logros con transcripción o corrección se indican con ayuda. Por sí solos no acreditan la comprensión oral."),
  explore: L("Touche un lieu pour commencer l’exploration.", "Tap a place to start exploring.", "Toca un lugar para empezar a explorar."),
};
const categories: ItalianCategory[] = ["greetings", "cafe", "city"];
type Step = { id: string; kind: "welcome" | "finish" } | { id: string; kind: "learn"; category: ItalianCategory } | { id: string; kind: "game"; activity: ItalianActivity };
const steps: Step[] = [
  { id: "welcome", kind: "welcome" },
  ...categories.flatMap((category): Step[] => [{ id: `learn-${category}`, kind: "learn", category }, ...activities.filter((item) => item.category === category).map((activity): Step => ({ id: activity.id, kind: "game", activity }))]),
  ...activities.filter((item) => item.category === "final").map((activity): Step => ({ id: activity.id, kind: "game", activity })),
  { id: "finish", kind: "finish" },
];
const activityIds = activities.map((item) => item.id);
const stepIds = steps.map((step) => step.id);
const icons = { greetings: MessageCircle, cafe: Coffee, city: MapPin, final: Flag };
const kindLabel: Record<ItalianActivity["kind"], LocaleText> = {
  match: L("Les bonnes paires", "Perfect pairs", "Las parejas correctas"), order: L("Mots en chantier", "Sentence builder", "Frases en construcción"), choice: L("Le bon réflexe", "The right response", "La respuesta adecuada"), culture: L("Le détour culturel", "A cultural detour", "Una parada cultural"), listen: L("L’oreille attentive", "Listening detective", "Oído atento"), type: L("De mémoire", "From memory", "De memoria"), cafe: L("Le défi du barista", "The barista challenge", "El reto del barista"), map: L("Yoppo en balade", "Yoppo explores", "Yoppo de paseo"), dialogue: L("À toi la réplique", "Your line", "Tu turno de hablar"),
};

function BolognaScene({ locale }: { locale: YoLocale }) {
  const [spot, setSpot] = useState<string | null>(null);
  const spots = [{ id: "buongiorno", label: "Buongiorno!", x: "24%", y: "48%" }, { id: "caffe", label: "Un caffè.", x: "55%", y: "69%" }, { id: "piazza", label: "La piazza", x: "76%", y: "31%" }];
  const word = vocabulary.find((item) => item.id === spot);
  return <div>
    <div className="relative overflow-hidden rounded-[2rem] bg-[#f8dfbd]" style={{ aspectRatio: "1.95" }}>
      <svg viewBox="0 0 640 328" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="640" height="328" fill="#f8dfbd"/><circle cx="535" cy="73" r="43" fill="#f6b869"/>
        <path d="M0 245 640 226V328H0Z" fill="#e6c49c"/><path d="M280 240 390 236 520 328H169Z" fill="#f5ebd6"/>
        <path d="M406 65h41v176h-41z" fill="#b96446"/><path d="M415 66h10V40h9v26h13l-4-13h-31z" fill="#8b493b"/><path d="M423 92h10v22h-10zm0 47h10v22h-10zm0 49h10v22h-10z" fill="#71473a"/>
        <path d="M463 95h29v144h-29z" fill="#cb825d"/><path d="m460 95 17-16 17 16z" fill="#8b493b"/>
        <path d="M0 115h222v150H0z" fill="#cf7651"/><path d="M0 115 111 78l111 37z" fill="#a9533e"/>
        <path d="M22 160a22 22 0 0 1 44 0v93H22zm65 0a22 22 0 0 1 44 0v93H87zm65 0a22 22 0 0 1 44 0v93h-44z" fill="#8b4a3b"/>
        <path d="M9 177h202v11H9" fill="#e99b6e"/><path d="M226 155h151v98H226z" fill="#f1bd7f"/><path d="M217 155h168l-13-25H232z" fill="#d97d54"/>
        <path d="M243 195h45v58h-45zm65 0h45v58h-45z" fill="#3f6a54"/><path d="M237 187h122v16H237z" fill="#fff0d6"/>
        <path d="M528 151h112v93H528z" fill="#dc9c6b"/><path d="M524 151h116l-30-26h-60z" fill="#b56a4c"/><rect x="554" y="177" width="32" height="36" rx="16" fill="#8c5c48"/>
        <path d="M58 257v43m-19-27h38m486-29v44m-17-24h34" stroke="#41684d" strokeWidth="7" strokeLinecap="round"/><circle cx="59" cy="239" r="27" fill="#66855a"/><circle cx="565" cy="229" r="26" fill="#6c8e61"/>
        <path d="m300 275 10 11m27-16 10 11m25-15 10 11m-104 23 10 11m26-15 10 11" stroke="#cfbca3" strokeWidth="3"/>
      </svg>
      {spots.map((item) => <button type="button" key={item.id} lang="it" aria-pressed={spot === item.id} onClick={() => setSpot(item.id)} style={{ left: item.x, top: item.y }} className={`absolute min-h-11 -translate-x-1/2 rounded-2xl border-2 px-2 text-xs font-bold shadow-lg transition hover:-translate-y-1 sm:px-3 sm:text-sm ${spot === item.id ? "border-[#245a46] bg-[#245a46] text-white" : "border-white bg-[#fffdf5] text-[#593b2c]"}`}><MapPin size={12} className="mr-1 inline" aria-hidden />{item.label}</button>)}
    </div>
    <div className="mt-3 min-h-14 rounded-2xl bg-white/75 p-3">{word ? <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm"><strong lang="it">{word.it}</strong> <span className="text-[#75644c]">— {word.meaning[locale]}</span></p><ItalianModuleAudio text={word.it} locale={locale} /></div> : <p className="py-1 text-center text-xs text-[#75644c]">{copy.explore[locale]}</p>}</div>
  </div>;
}

function VocabularyStudy({ category, locale, onReveal }: { category?: ItalianCategory; locale: YoLocale; onReveal?: () => void }) {
  const [translations, setTranslations] = useState(true);
  const words = category ? vocabulary.filter((item) => item.category === category) : vocabulary;
  const tips = category === "greetings" ? grammarTips.filter((tip) => tip.id === "keep-conversation") : category === "cafe" ? grammarTips.filter((tip) => tip.id !== "keep-conversation") : [];
  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-[#75644c]">{words.length} {locale === "fr" ? "expressions" : locale === "en" ? "expressions" : "expresiones"}</span><button type="button" aria-pressed={translations} onClick={() => { if (!translations) onReveal?.(); setTranslations(!translations); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#e4dac9] bg-white px-3 text-xs font-semibold">{translations ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}{translations ? copy.hideTranslations[locale] : copy.translations[locale]}</button></div>
    <div className="grid gap-3 sm:grid-cols-2">{words.map((word) => <article key={word.id} className="rounded-2xl border border-[#e7dfd0] bg-white p-4"><p lang="it" className="mb-2 text-lg font-semibold text-[#245a46]">{word.it}</p>{translations ? <p className="mb-3 min-h-5 text-sm text-[#655744]">{word.meaning[locale]}</p> : null}<ItalianModuleAudio text={word.it} locale={locale} />{translations && word.note ? <p className="mt-3 text-xs leading-relaxed text-[#786950]">{word.note[locale]}</p> : null}</article>)}</div>
    {tips.map((tip) => <article key={tip.id} className="mt-5 rounded-3xl border border-[#e3c9aa] bg-[#fff1df] p-5"><h3 className="font-serif text-xl text-[#704529]">{tip.title[locale]}</h3><p className="mt-2 text-sm leading-relaxed">{tip.body[locale]}</p>{tip.examples.map((example) => <div key={example.it} className="mt-4 rounded-2xl bg-white/80 p-4"><p lang="it" className="mb-2 font-semibold">{example.it}</p><ItalianModuleAudio text={example.it} locale={locale} />{translations ? <p className="mt-2 text-sm text-[#75644c]">{example.meaning[locale]}</p> : null}</div>)}</article>)}
  </div>;
}

function YoppoBonus({ locale, round, onNext, onClose, onReaction }: { locale: YoLocale; round: number; onNext: () => void; onClose: () => void; onReaction: (correct: boolean) => void }) {
  const word = vocabulary[round % vocabulary.length];
  const [selected, setSelected] = useState<string | null>(null);
  const correct = selected === word.id;
  const choices = scrambleItalianItems([word, vocabulary[(round + 7) % vocabulary.length], vocabulary[(round + 13) % vocabulary.length]], `${round}:bonus`);
  return <section aria-labelledby="italian-bonus-title" className="mb-6 rounded-3xl border-2 border-[#d3a85a] bg-[#fff3d2] p-5">
    <div className="flex items-center justify-between gap-3"><h2 id="italian-bonus-title" className="flex items-center gap-2 font-bold"><Sparkles size={19} aria-hidden />{copy.bonus[locale]}</h2><button type="button" aria-label={copy.close[locale]} onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white"><X size={18} aria-hidden /></button></div>
    <p className="mt-2 text-xs leading-relaxed">{copy.bonusBody[locale]}</p><p lang="it" className="my-4 font-serif text-2xl">{word.it}</p>
    <div className="grid gap-2">{choices.map((item) => <button type="button" key={item.id} disabled={correct} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); onReaction(item.id === word.id); }} className={`min-h-11 rounded-xl border p-3 text-left text-sm ${selected === item.id ? "border-[#245a46] bg-[#e7f0e8]" : "border-[#e3c9aa] bg-white"}`}>{item.meaning[locale]}</button>)}</div>
    {selected ? <p role="status" className="mt-3 text-sm font-semibold">{correct ? copy.correct[locale] : copy.again[locale]}</p> : null}
    {correct ? <button type="button" className={`${italianButton} mt-3`} onClick={onNext}>{copy.another[locale]}</button> : null}
  </section>;
}

export function ItalianAdventure({ locale }: { locale: YoLocale }) {
  const { progress, ready, storageAvailable, visit, attempt, reset } = useItalianModuleProgress(activityIds, stepIds);
  const [index, setIndex] = useState(0);
  const [retryEpoch, setRetryEpoch] = useState(0);
  const [solved, setSolved] = useState(false);
  const [reaction, setReaction] = useState<CompanionVisualState>("map");
  const [notebook, setNotebook] = useState(false);
  const [bonus, setBonus] = useState<number | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const hydrated = useRef(false);
  const assisted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = steps[index];
  const activity = step.kind === "game" ? step.activity : undefined;
  const completed = activities.filter((item) => progress.results[item.id]?.completed).length;
  const independent = activities.filter((item) => progress.results[item.id]?.independent).length;
  const review = activities.filter((item) => !progress.results[item.id]?.independent);
  const title = step.kind === "welcome" ? copy.welcome[locale] : step.kind === "learn" ? copy[step.category][locale] : step.kind === "game" ? step.activity.title[locale] : copy.finish[locale];

  useEffect(() => {
    if (!ready || hydrated.current) return;
    hydrated.current = true;
    const saved = stepIds.indexOf(progress.currentStep);
    if (saved >= 0) setIndex(saved);
  }, [ready, progress.currentStep]);
  useEffect(() => () => { window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT)); }, []);

  function go(next: number) {
    const target = Math.max(0, Math.min(steps.length - 1, next));
    window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));
    assisted.current = false; setSolved(false); setNotebook(false); setBonus(null); setResetConfirm(false); setReaction("map");
    setIndex(target); setRetryEpoch((old) => old + 1); visit(steps[target].id);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
  }
  function replay() {
    window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT));
    assisted.current = false; setSolved(false); setNotebook(false); setBonus(null); setReaction("idle"); setRetryEpoch((old) => old + 1);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  function respond(correct: boolean) {
    if (!activity || solved) return;
    attempt(activity.id, correct, assisted.current);
    if (!correct) assisted.current = true;
    setSolved(correct); setReaction(correct ? "celebrating" : "confused");
  }
  function help() { if (!solved) assisted.current = true; }
  function coachAction(action: ItalianYoppoAction) {
    if (action === "hint" || action === "explain") help();
    if (action === "retry") replay();
    if (action === "review") go(steps.findIndex((item) => item.id === (review[0]?.id ?? "finish")));
    if (action === "challenge") { if (activity) help(); setBonus((old) => old === null ? 0 : old + 1); setNotebook(false); requestAnimationFrame(() => heading.current?.scrollIntoView({ block: "start", behavior: "instant" })); }
  }
  const message = activity ? solved ? L("Esatto ! Tu as fait avancer notre aventure. Tu peux continuer ou rejouer sans aide.", "Esatto! You moved our adventure forward. Continue or replay without help.", "¡Esatto! Has hecho avanzar nuestra aventura. Continúa o repite sin ayuda.") : activity.prompt : moduleCopy.story;
  const defaultHint = L("Choisis une petite étape. Dans le carnet, cache la traduction et essaie de retrouver le sens.", "Choose one small step. In your notebook, hide the translation and try recalling the meaning.", "Elige una etapa corta. En tu cuaderno, oculta la traducción e intenta recordar el significado.");
  const example = vocabulary.find((item) => item.category === (activity?.category === "final" ? "cafe" : activity?.category ?? "greetings"))!;
  const chapter = (category: ItalianActivityCategory) => category === "final" ? steps.findIndex((item) => item.kind === "game" && item.activity.category === "final") : steps.findIndex((item) => item.id === `learn-${category}`);
  const currentCategory = activity?.category ?? (step.kind === "learn" ? step.category : null);

  return <div className="min-h-screen bg-[#f7f3e9] text-[#342e27] selection:bg-[#f6c58e]" data-italian-adventure>
    <header className="border-b border-[#e4dac9] bg-[#fffcf5]/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3"><Link href={buildYoLocaleHref("/yo/langues/italien", locale)} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-semibold hover:bg-[#f0e9dc]"><ArrowLeft size={17} aria-hidden />{copy.back[locale]}</Link><span aria-hidden className="h-6 w-px bg-[#d9cebb]"/><Link href={buildYoLocaleHref("/yo", locale)} className="text-lg font-black tracking-tight text-[#245a46]">Yo<span className="text-[#c26842]">Pratiqo</span></Link></div>
        <nav aria-label={locale === "fr" ? "Langue de l’interface" : locale === "en" ? "Interface language" : "Idioma de la interfaz"} className="flex gap-1">{(["fr", "en", "es"] as const).map((lang) => <Link key={lang} href={buildYoLocaleHref("/yo/langues/italien/module-1", lang)} aria-current={locale === lang ? "page" : undefined} hrefLang={lang} className={`flex h-11 min-w-11 items-center justify-center rounded-xl text-xs font-bold ${locale === lang ? "bg-[#245a46] text-white" : "hover:bg-[#ece4d5]"}`}>{lang.toUpperCase()}</Link>)}</nav>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-6 sm:px-8 lg:pt-9">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#a95936]">ITALIANO · A1 · BOLOGNA</p><p className="mt-1 font-serif text-xl">{moduleCopy.title[locale]}</p></div><div className="min-w-44"><p className="mb-2 text-right text-xs font-semibold text-[#5b654e]">{completed}/{activities.length} {copy.complete[locale]}</p><div role="progressbar" aria-label={copy.complete[locale]} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={activities.length} className="h-2 overflow-hidden rounded-full bg-[#e4dac9]"><div className="h-full rounded-full bg-[#6f8a57] transition-[width] motion-reduce:transition-none" style={{ width: `${completed / activities.length * 100}%` }}/></div></div></div>
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-5">
          <p className="mb-3 hidden text-[10px] font-bold uppercase tracking-[.2em] text-[#80705a] lg:block">{copy.journey[locale]}</p>
          <nav aria-label={copy.journey[locale]} className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            <button type="button" onClick={() => go(0)} aria-current={step.kind === "welcome" ? "step" : undefined} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-semibold ${step.kind === "welcome" ? "bg-[#eadcc5] text-[#614327]" : "hover:bg-white"}`}><Compass size={19} aria-hidden />{copy.welcome[locale]}</button>
            {(["greetings", "cafe", "city", "final"] as const).map((category, number) => { const Icon = icons[category]; const total = activities.filter((item) => item.category === category); const done = total.filter((item) => progress.results[item.id]?.completed).length; return <button key={category} type="button" onClick={() => go(chapter(category))} aria-current={currentCategory === category ? "step" : undefined} className={`flex min-h-14 shrink-0 items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-semibold ${currentCategory === category ? "bg-[#245a46] text-white shadow-md" : "bg-white/60 hover:bg-white"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${currentCategory === category ? "bg-white/15" : "bg-[#eee7d9]"}`}>{done === total.length ? <Check size={17} aria-hidden /> : <Icon size={17} aria-hidden />}</span><span><span className="mb-0.5 block text-[9px] uppercase tracking-widest opacity-60">0{number + 1} · {done}/{total.length}</span>{copy[category][locale]}</span></button>; })}
            <button type="button" onClick={() => go(steps.length - 1)} aria-current={step.kind === "finish" ? "step" : undefined} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-3 text-left text-xs font-semibold ${step.kind === "finish" ? "bg-[#eadcc5]" : "hover:bg-white"}`}><Trophy size={19} aria-hidden />{copy.finish[locale]}</button>
          </nav>
          <div className="mt-6 hidden rounded-3xl border border-[#e4dac9] bg-[#eee7d9]/50 p-4 lg:block"><p className="font-serif text-lg">Piano, piano.</p><p className="mt-2 text-xs leading-relaxed text-[#786950]">{copy.noRush[locale]}</p><p className="mt-4 text-[10px] font-medium text-[#245a46]">● {copy.save[locale]}</p></div>
        </aside>
        <main className="min-w-0" aria-busy={!ready}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold text-[#88755b]">{copy.step[locale]} {index + 1}/{steps.length} {activity ? `· ${kindLabel[activity.kind][locale]}` : ""}</p><button type="button" aria-expanded={notebook} onClick={() => { if (!notebook && activity) help(); setNotebook(!notebook); }} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold shadow-sm"><BookOpen size={16} aria-hidden />{copy.vocabulary[locale]}{notebook ? <X size={13} aria-hidden /> : null}</button></div>
          {!storageAvailable ? <p role="status" className="mb-4 rounded-xl bg-amber-100 p-3 text-xs">{copy.noSave[locale]}</p> : null}
          <h1 ref={heading} tabIndex={-1} className="mb-5 scroll-mt-5 font-serif text-3xl leading-tight outline-none sm:text-4xl">{title}</h1>
          {bonus !== null ? <YoppoBonus key={bonus} locale={locale} round={bonus} onNext={() => setBonus(bonus + 1)} onClose={() => { setBonus(null); setReaction(solved ? "celebrating" : "map"); }} onReaction={(correct) => setReaction(correct ? "celebrating" : "confused")} /> : null}
          {notebook ? <section aria-label={copy.vocabulary[locale]} className="mb-6 rounded-3xl border border-[#e4dac9] bg-[#fffaf0] p-5"><VocabularyStudy locale={locale} onReveal={help} /><button type="button" className="mt-4 min-h-11 rounded-xl px-4 text-sm font-bold underline" onClick={() => setNotebook(false)}>{copy.close[locale]}</button></section> : null}
          {!ready ? <div className="min-h-60 rounded-3xl bg-white/75"/> : step.kind === "welcome" ? <section className="overflow-hidden rounded-[2rem] border border-[#e4dac9] bg-[#fffaf1] p-5 shadow-[0_14px_50px_#583e2510] sm:p-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-[#ad5f39]">{moduleCopy.eyebrow[locale]}</p><p className="mb-3 font-serif text-5xl leading-[.98] tracking-tight text-[#245a46] sm:text-7xl" lang="it">Ciao,<br/><span className="italic text-[#bd6945]">Bologna.</span></p>
            <p className="mb-6 max-w-lg text-base leading-relaxed text-[#78634b]">{moduleCopy.subtitle[locale]}</p><BolognaScene locale={locale}/>
            <p className="mt-6 text-sm leading-relaxed text-[#655744]">{moduleCopy.story[locale]}</p>
            <div className="my-5 flex flex-wrap gap-2">{[moduleCopy.level[locale], copy.mini[locale], copy.words[locale]].map((label) => <span key={label} className="rounded-full border border-[#ded0b8] bg-white px-3 py-1.5 text-[11px] font-semibold">{label}</span>)}</div>
            <h2 className="mt-6 text-sm font-bold">{copy.learned[locale]}</h2><ul className="mt-3 grid gap-3 sm:grid-cols-2">{objectives.map((objective) => <li key={objective.fr} className="flex gap-2 text-sm leading-relaxed text-[#655744]"><CheckCircle2 className="mt-0.5 shrink-0 text-[#648652]" size={17} aria-hidden />{objective[locale]}</li>)}</ul><p className="mt-6 text-xs text-[#88755b]">{moduleCopy.duration[locale]}</p>
            <button type="button" className={`${italianButton} mt-5`} onClick={() => go(1)}>{copy.start[locale]}<ArrowRight size={18} aria-hidden /></button><p className="mt-4 text-[10px] leading-relaxed text-[#88755b]">{moduleCopy.fictionNotice[locale]}</p>
          </section> : step.kind === "learn" ? <section className="rounded-[2rem] border border-[#e4dac9] bg-[#fffaf1] p-5 sm:p-7"><p className="mb-5 text-sm leading-relaxed text-[#75644c]">{moduleCopy.practiceTip[locale]}</p><VocabularyStudy key={step.id} category={step.category} locale={locale}/></section> : step.kind === "game" ? <section key={`${step.id}:${retryEpoch}`} className="rounded-[2rem] border border-[#e4dac9] bg-[#fffdf7] p-5 shadow-[0_10px_35px_#583e2508] sm:p-8" data-italian-activity={step.id}>
            <div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5e3c9] text-[#a45e35]"><Sparkles size={18} aria-hidden /></span><p className="text-base leading-relaxed">{step.activity.prompt[locale]}</p></div>
            <ItalianGame key={`${step.id}:${retryEpoch}`} activity={step.activity} locale={locale} onAttempt={respond} onHelp={help}/>
            {solved ? <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7dfd0] pt-4"><span className="flex items-center gap-2 text-xs font-semibold text-[#245a46]"><CheckCircle2 size={17} aria-hidden />{assisted.current ? copy.helped[locale] : copy.independent[locale]}</span><button type="button" onClick={replay} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold underline"><RotateCcw size={15} aria-hidden />{copy.retry[locale]}</button></div> : null}
          </section> : <section className="rounded-[2rem] border border-[#e4dac9] bg-[#fffaf1] p-5 sm:p-8">
            <div className="flex items-center gap-5"><CompanionAvatar state={completed === activities.length ? "badge_unlocked" : "map"} size="lg" locale={locale} compact/><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#a95936]">IL TUO PASSAPORTO</p><h2 className="mt-2 font-serif text-3xl text-[#245a46]">{completed === activities.length ? moduleCopy.finishTitle[locale] : copy.incomplete[locale]}</h2></div></div>
            <div className="my-6 grid grid-cols-3 gap-2">{[{ n: completed, label: copy.complete }, { n: independent, label: copy.independent }, { n: completed - independent, label: copy.helped }].map((stat) => <div key={stat.label.fr} className="rounded-2xl bg-[#eee7d9] p-3 text-center"><p className="font-serif text-3xl text-[#245a46]">{stat.n}</p><p className="mt-1 text-[10px] font-semibold">{stat.label[locale]}</p></div>)}</div>
            <p className="text-sm leading-relaxed">{completed === activities.length ? moduleCopy.finishBody[locale] : copy.summary[locale]}</p><p className="mt-3 text-xs leading-relaxed text-[#786950]">{copy.learning[locale]}</p>
            <div className="mt-6 grid gap-2">{activities.map((item) => { const result = progress.results[item.id]; return <button key={item.id} type="button" onClick={() => go(steps.findIndex((entry) => entry.id === item.id))} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#e4dac9] bg-white p-3 text-left text-xs"><span className="font-semibold">{item.title[locale]}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${result?.independent ? "bg-[#e7f0e8] text-[#245a46]" : "bg-[#f5e8d0] text-[#7f5b2c]"}`}>{result?.independent ? copy.independent[locale] : result?.completed ? copy.helped[locale] : copy.waiting[locale]}</span></button>; })}</div>
            {review.length ? <button type="button" className={`${italianButton} mt-5`} onClick={() => coachAction("review")}>{copy.review[locale]}<ArrowRight size={17} aria-hidden /></button> : null}
            <div className="mt-6 rounded-2xl bg-[#e7f0e8] p-4 text-sm leading-relaxed">{copy.speaking[locale]}</div>
            <details className="mt-6 text-xs"><summary className="min-h-11 cursor-pointer py-3 font-semibold">{copy.resources[locale]}</summary><ul className="space-y-3">{cultureSources.map((source) => <li key={source.id}><a className="font-semibold underline" href={source.url} target="_blank" rel="noreferrer">{source.publisher} — {source.title}</a><p className="mt-1 leading-relaxed text-[#786950]">{source.supports[locale]}</p></li>)}</ul></details>
            <p className="mt-5 text-[10px] leading-relaxed text-[#88755b]">{copy.privacy[locale]}</p>
            <div className="mt-4 flex flex-wrap gap-2">{resetConfirm ? <><button type="button" className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-xs text-red-900" onClick={() => { reset(); setIndex(0); setRetryEpoch((old) => old + 1); setResetConfirm(false); setSolved(false); setNotebook(false); setBonus(null); setReaction("map"); assisted.current = false; window.dispatchEvent(new Event(ITALIAN_MODULE_AUDIO_STOP_EVENT)); requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); }); }}>{copy.confirmReset[locale]}</button><button type="button" className="min-h-11 px-3 text-xs" onClick={() => setResetConfirm(false)}>{copy.cancel[locale]}</button></> : <button type="button" className="min-h-11 text-xs underline text-[#786950]" onClick={() => setResetConfirm(true)}>{copy.reset[locale]}</button>}</div>
          </section>}
          {ready && step.kind !== "welcome" ? <nav aria-label={copy.journey[locale]} className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => go(index - 1)} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold"><ChevronLeft size={18} aria-hidden />{copy.previous[locale]}</button>{step.kind !== "finish" ? <div className="flex flex-wrap items-center gap-2">{activity && !solved ? <button type="button" onClick={() => go(index + 1)} className="min-h-11 rounded-xl px-3 text-xs text-[#786950] underline">{copy.skip[locale]}</button> : null}<button type="button" className={italianButton} disabled={Boolean(activity && !solved)} onClick={() => go(index + 1)}>{copy.next[locale]}<ChevronRight size={18} aria-hidden /></button></div> : null}</nav> : null}
        </main>
      </div>
    </div>
    {ready ? <ItalianYoppoCoach locale={locale} contextId={`${step.id}:${retryEpoch}`} message={message} hint={activity?.hint ?? defaultHint} hint2={activity?.hint2} explanation={activity?.explanation ?? moduleCopy.practiceTip} visualState={reaction} example={{ it: example.it, meaning: example.meaning }} exampleAudio={<ItalianModuleAudio text={example.it} locale={locale}/>} onAction={coachAction} canRetry={Boolean(activity)} reviewCount={review.length} completedCount={completed} totalCount={activities.length}/> : null}
  </div>;
}
