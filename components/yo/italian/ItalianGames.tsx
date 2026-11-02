"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2, ChevronRight, Coffee, CornerDownLeft, MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import type { ItalianActivity, ItalianCafeActivity, ItalianChoiceActivity, ItalianDialogueActivity, ItalianMapActivity, ItalianMapDirection, ItalianMatchActivity, ItalianOrderActivity, ItalianTypeActivity } from "@/lib/yo/italian/italianModuleTypes";
import { checkItalianCafe, checkItalianMap, checkItalianOrder, italianCafeTotal, italianMapPosition, matchesItalianAnswer, scrambleItalianItems } from "@/lib/yo/italian/italianModuleLogic";
import { ItalianModuleAudio } from "./ItalianModuleAudio";
import { useCourseLanguage } from "./ItalianAudioProvider";
import { matchesPortugueseAnswer } from "@/lib/yo/portuguese/courseLogic";
import { matchesGermanAnswer } from "@/lib/yo/german/courseLogic";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";

const C = {
  fr: { check: "Vérifier", correct: "Ecco ! Tu y es.", retry: "Presque. Ajuste et réessaie.", choose: "Choisis une réponse", associate: "Choisis un mot italien, puis son sens.", pair: "Paire trouvée", wrongPair: "Ces deux cartes ne vont pas ensemble. Essaie une autre association.", left: "Expressions italiennes", right: "Leur sens", sentence: "Ta phrase", pool: "Mots disponibles", empty: "Touche les mots pour construire ta phrase.", undo: "Annuler", clear: "Tout remettre", answer: "Ta réponse en italien", model: "Voir un modèle", accent: "Utilise ces touches pour écrire les accents, puis compare avec le modèle.", listen: "le message de l’exercice", transcript: "Lire la transcription (avec aide)", listened: "Audio démarré", beforeListen: "Écoute le message ou choisis la version écrite pour répondre.", written: "Version écrite : cette réussite sera enregistrée avec aide.", cart: "Ta commande", menu: "La carte du bar", fictional: "Prix inventés pour ce jeu.", total: "Total", budget: "Budget", add: "Ajouter", remove: "Retirer", basketHint: "Choisis les produits et les quantités demandés, puis vérifie.", steps: "Déplacements", map: "Plan fictif pour apprendre : ce n’est pas un itinéraire réel.", start: "Départ", destination: "Piazza", you: "Yoppo est ici", boundary: "Tu arrives au bord du plan. Choisis une autre direction.", up: "En haut", down: "En bas", east: "À droite", west: "À gauche", route: "Ton trajet", turn: "Tour", nextTurn: "Poursuivre la conversation", finished: "Conversation réussie", option: "Réponse", listenLine: "Écouter la réplique", matched: "paires trouvées", counter: "quantité" },
  en: { check: "Check", correct: "Ecco! You got it.", retry: "Almost. Adjust and try again.", choose: "Choose an answer", associate: "Choose an Italian phrase, then its meaning.", pair: "Pair found", wrongPair: "These cards do not match. Try a different pair.", left: "Italian phrases", right: "Their meanings", sentence: "Your sentence", pool: "Available words", empty: "Tap the words to build your sentence.", undo: "Undo", clear: "Reset", answer: "Your answer in Italian", model: "Show a model", accent: "Use these keys to write accents, then compare with the model.", listen: "the exercise message", transcript: "Read the transcript (with help)", listened: "Audio started", beforeListen: "Listen to the message or choose the written version to answer.", written: "Written version: this success will be recorded with help.", cart: "Your order", menu: "The café menu", fictional: "Prices invented for this game.", total: "Total", budget: "Budget", add: "Add", remove: "Remove", basketHint: "Choose the requested items and quantities, then check.", steps: "Moves", map: "A fictional learning map, not a real walking route.", start: "Start", destination: "Piazza", you: "Yoppo is here", boundary: "You reached the edge of the map. Choose another direction.", up: "Up", down: "Down", east: "Right", west: "Left", route: "Your route", turn: "Turn", nextTurn: "Continue the conversation", finished: "Conversation completed", option: "Answer", listenLine: "Listen to the line", matched: "pairs found", counter: "quantity" },
  es: { check: "Comprobar", correct: "¡Ecco! Lo lograste.", retry: "Casi. Ajusta e inténtalo de nuevo.", choose: "Elige una respuesta", associate: "Elige una expresión italiana y después su significado.", pair: "Pareja encontrada", wrongPair: "Estas tarjetas no van juntas. Prueba otra pareja.", left: "Expresiones italianas", right: "Sus significados", sentence: "Tu frase", pool: "Palabras disponibles", empty: "Toca las palabras para construir tu frase.", undo: "Deshacer", clear: "Reiniciar", answer: "Tu respuesta en italiano", model: "Ver un modelo", accent: "Usa estas teclas para escribir los acentos y compara con el modelo.", listen: "el mensaje del ejercicio", transcript: "Leer la transcripción (con ayuda)", listened: "Audio iniciado", beforeListen: "Escucha el mensaje o elige la versión escrita para responder.", written: "Versión escrita: este logro se guardará con ayuda.", cart: "Tu pedido", menu: "La carta del bar", fictional: "Precios inventados para este juego.", total: "Total", budget: "Presupuesto", add: "Añadir", remove: "Quitar", basketHint: "Elige los productos y las cantidades indicados y comprueba.", steps: "Movimientos", map: "Plano ficticio para aprender; no es un itinerario real.", start: "Inicio", destination: "Piazza", you: "Yoppo está aquí", boundary: "Llegaste al borde del plano. Elige otra dirección.", up: "Arriba", down: "Abajo", east: "Derecha", west: "Izquierda", route: "Tu recorrido", turn: "Turno", nextTurn: "Continuar la conversación", finished: "Conversación completada", option: "Respuesta", listenLine: "Escuchar la intervención", matched: "parejas encontradas", counter: "cantidad" },
};


const germanCopy = {
  fr: { correct: "Genau ! Tu y es.", associate: "Choisis une expression allemande, puis son sens.", left: "Expressions allemandes", answer: "Ta réponse en allemand", destination: "Place" },
  en: { correct: "Genau! You got it.", associate: "Choose a German phrase, then its meaning.", left: "German phrases", answer: "Your answer in German", destination: "Square" },
  es: { correct: "¡Genau! Lo lograste.", associate: "Elige una expresión alemana y después su significado.", left: "Expresiones alemanas", answer: "Tu respuesta en alemán", destination: "Plaza" },
};
const portugueseCopy = {
  fr: { correct: "Muito bem ! Tu y es.", associate: "Choisis une expression portugaise, puis son sens.", left: "Expressions portugaises", answer: "Ta réponse en portugais du Brésil", destination: "Place" },
  en: { correct: "Muito bem! You got it.", associate: "Choose a Portuguese phrase, then its meaning.", left: "Portuguese phrases", answer: "Your answer in Brazilian Portuguese", destination: "Square" },
  es: { correct: "¡Muito bem! Lo lograste.", associate: "Elige una expresión portuguesa y después su significado.", left: "Expresiones portuguesas", answer: "Tu respuesta en portugués de Brasil", destination: "Plaza" },
};
function useGameLanguage(locale: YoLocale) {
  const language = useCourseLanguage();
  return { language, copy: language === "de" ? { ...C[locale], ...germanCopy[locale] } : language === "pt-BR" ? { ...C[locale], ...portugueseCopy[locale] } : C[locale] };
}

export const italianButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#245a46] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#183e30] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#245a46]";
const optionButton = "min-h-14 rounded-2xl border-2 p-4 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245a46] disabled:cursor-default";
interface GameProps { locale: YoLocale; onAttempt: (correct: boolean) => void; onHelp: () => void }

function Feedback({ correct, locale, children }: { correct: boolean | null; locale: YoLocale; children?: React.ReactNode }) {
  const { copy } = useGameLanguage(locale);
  if (correct === null) return null;
  return <div role="status" className={`mt-5 rounded-2xl border p-4 text-sm leading-relaxed ${correct ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
    <p className="flex items-center gap-2 font-bold">{correct ? <CheckCircle2 size={19} aria-hidden /> : <RotateCcw size={17} aria-hidden />}{correct ? copy.correct : copy.retry}</p>
    {children ? <div className="mt-2">{children}</div> : null}
  </div>;
}

function Options({ options, selected, disabled, locale, onSelect }: { options: ItalianChoiceActivity["options"]; selected: string | null; disabled: boolean; locale: YoLocale; onSelect: (id: string) => void }) {
  const { language, copy } = useGameLanguage(locale);
  return <div className="grid gap-3" role="group" aria-label={copy.choose}>
    {options.map((option, index) => <button key={option.id} type="button" aria-pressed={selected === option.id} disabled={disabled} onClick={() => onSelect(option.id)}
      className={`${optionButton} flex items-center gap-3 ${selected === option.id ? "border-[#245a46] bg-[#e7f0e8] text-[#173c2e]" : "border-[#e7dfd0] bg-white hover:border-[#c86b45]"}`}>
      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${selected === option.id ? "bg-[#245a46] text-white" : "bg-[#f4efe5] text-[#65594c]"}`}>{String.fromCharCode(65 + index)}</span>
      <span lang={option.it ? language : undefined}>{option.it ?? option.label?.[locale]}</span>
    </button>)}
  </div>;
}

function ChoiceGame({ activity, locale, onAttempt, onHelp }: GameProps & { activity: ItalianChoiceActivity }) {
  const { language, copy } = useGameLanguage(locale);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState(false);
  const [transcriptRead, setTranscriptRead] = useState(false);
  const [heard, setHeard] = useState(false);
  const listening = activity.kind === "listen";
  const canAnswer = !listening || heard || transcriptRead;
  function check() { if (!selected || !canAnswer || feedback === true) return; const correct = selected === activity.correctId; setFeedback(correct); onAttempt(correct); }
  return <div>
    {listening ? <div className="mb-6 rounded-3xl border border-[#dacdb9] bg-[#f8f2e8] p-5">
      <ItalianModuleAudio text={activity.stimulus ?? ""} locale={locale} label={copy.listen} onListen={() => setHeard(true)} />
      {heard ? <p className="mt-2 text-xs text-[#245a46]">✓ {copy.listened}</p> : null}
      <button className="mt-3 block min-h-11 text-left text-sm font-semibold underline underline-offset-4" type="button" aria-expanded={transcript} onClick={() => { if (!transcript) { onHelp(); setTranscriptRead(true); } setTranscript(!transcript); }}>{copy.transcript}</button>
      {transcript ? <div className="mt-2"><p lang={language} className="text-lg font-semibold">{activity.stimulus}</p><p className="mt-2 text-xs">{copy.written}</p></div> : null}
      {!canAnswer ? <p className="mt-2 text-xs text-[#6c604e]">{copy.beforeListen}</p> : null}
    </div> : null}
    <Options options={activity.options} selected={selected} disabled={feedback === true} locale={locale} onSelect={(id) => { setSelected(id); setFeedback(null); }} />
    <button className={`${italianButton} mt-5`} type="button" disabled={!selected || !canAnswer || feedback === true} onClick={check}><Check size={17} aria-hidden />{copy.check}</button>
    <Feedback correct={feedback} locale={locale}>{activity.options.find((option) => option.id === selected)?.feedback[locale]}</Feedback>
  </div>;
}

function MatchGame({ activity, locale, onAttempt }: GameProps & { activity: ItalianMatchActivity }) {
  const { language, copy } = useGameLanguage(locale);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const targets = scrambleItalianItems(activity.pairs, activity.id);
  function match(id: string) {
    if (!selected || matched.includes(id)) return;
    if (id === selected) {
      const next = [...matched, id]; setMatched(next); setSelected(null); setMessage(copy.pair);
      if (next.length === activity.pairs.length) onAttempt(true);
    } else { setMessage(copy.wrongPair); onAttempt(false); }
  }
  return <div>
    <p className="mb-4 text-sm text-[#6c604e]">{copy.associate}</p>
    <div className="grid grid-cols-2 gap-3 sm:gap-5">
      <div className="grid gap-3" role="group" aria-label={copy.left}>{activity.pairs.map((pair) => <button key={pair.id} type="button" lang={language} aria-pressed={selected === pair.id} disabled={matched.includes(pair.id)} onClick={() => { setSelected(pair.id); setMessage(""); }} className={`${optionButton} ${matched.includes(pair.id) ? "border-[#c1d6c5] bg-[#e7f0e8] text-[#245a46]" : selected === pair.id ? "border-[#c86b45] bg-[#fff0e3]" : "border-[#e7dfd0] bg-white hover:border-[#c86b45]"}`}>{matched.includes(pair.id) ? "✓ " : ""}{pair.it}</button>)}</div>
      <div className="grid gap-3" role="group" aria-label={copy.right}>{targets.map((pair) => <button key={pair.id} type="button" disabled={matched.includes(pair.id) || !selected} onClick={() => match(pair.id)} className={`${optionButton} ${matched.includes(pair.id) ? "border-[#c1d6c5] bg-[#e7f0e8] text-[#245a46]" : "border-[#e7dfd0] bg-white enabled:hover:border-[#245a46] disabled:opacity-65"}`}>{matched.includes(pair.id) ? "✓ " : ""}{pair.meaning[locale]}</button>)}</div>
    </div>
    <p role="status" className="mt-4 min-h-6 text-sm font-medium">{message} <span className="text-[#6c604e]">{matched.length}/{activity.pairs.length} {copy.matched}</span></p>
    <Feedback correct={matched.length === activity.pairs.length ? true : null} locale={locale}>{activity.explanation[locale]}</Feedback>
  </div>;
}

function OrderGame({ activity, locale, onAttempt }: GameProps & { activity: ItalianOrderActivity }) {
  const { language, copy } = useGameLanguage(locale);
  const pool = scrambleItalianItems([...activity.tokens, ...(activity.distractors ?? [])].map((text, id) => ({ text, id })), activity.id);
  const [chosen, setChosen] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const selected = chosen.map((id) => pool.find((token) => token.id === id)!);
  const solved = feedback === true;
  function check() { if (!chosen.length || solved) return; const correct = language !== "it" ? (language === "de" ? matchesGermanAnswer : matchesPortugueseAnswer)(selected.map((token) => token.text).join(" "), [activity.answer.join(" ")]) : checkItalianOrder(selected.map((token) => token.text), activity.answer); setFeedback(correct); onAttempt(correct); }
  return <div>
    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6c604e]">{copy.sentence}</p>
    <div role="group" aria-label={copy.sentence} className="flex min-h-28 flex-wrap content-start gap-2 rounded-3xl border-2 border-dashed border-[#cabaa2] bg-[#f8f4ec] p-4">
      {!chosen.length ? <p className="self-center text-sm text-[#776a58]">{copy.empty}</p> : selected.map((token, index) => <button type="button" key={`${token.id}-${index}`} disabled={solved} lang={language} aria-label={`${copy.remove} ${token.text}`} onClick={() => { setChosen(chosen.filter((_, position) => position !== index)); setFeedback(null); }} className="min-h-11 rounded-xl border border-[#b6cbb9] bg-[#e7f0e8] px-4 font-semibold text-[#245a46] focus-visible:outline focus-visible:outline-2">{token.text}</button>)}
    </div>
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={copy.pool}>{pool.map((token) => <button key={token.id} type="button" lang={language} disabled={solved || chosen.includes(token.id)} onClick={() => { setChosen([...chosen, token.id]); setFeedback(null); }} className="min-h-12 rounded-xl border border-[#d8cbb7] bg-white px-4 text-base font-semibold shadow-[0_3px_0_#e6dccb] transition enabled:hover:-translate-y-0.5 disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#245a46]">{token.text}</button>)}</div>
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={italianButton} disabled={!chosen.length || solved} onClick={check}>{copy.check}</button><button type="button" className="min-h-11 rounded-xl px-3 text-sm underline" disabled={!chosen.length || solved} onClick={() => { setChosen([]); setFeedback(null); }}>{copy.clear}</button></div>
    <Feedback correct={feedback} locale={locale}>{feedback ? activity.explanation[locale] : null}</Feedback>
  </div>;
}

function TypeGame({ activity, locale, onAttempt, onHelp }: GameProps & { activity: ItalianTypeActivity }) {
  const { language, copy } = useGameLanguage(locale);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [model, setModel] = useState(false);
  const [heard, setHeard] = useState(false);
  const [read, setRead] = useState(false);
  const unlocked = !activity.listeningText || heard || read;
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  function check() { if (!unlocked || !value.trim() || feedback === true) return; const correct = (language === "de" ? matchesGermanAnswer : language === "pt-BR" ? matchesPortugueseAnswer : matchesItalianAnswer)(value, activity.accepted); setFeedback(correct); onAttempt(correct); }
  return <form onSubmit={(event) => { event.preventDefault(); check(); }}>
    {activity.listeningText ? <div className="mb-5"><ItalianModuleAudio text={activity.listeningText} locale={locale} label={copy.listen} onListen={() => setHeard(true)} /><p className="mt-2 text-xs">{read ? copy.written : heard ? copy.listened : copy.beforeListen}</p></div> : null}
    <label htmlFor={id} className="mb-2 block text-sm font-bold">{copy.answer}</label>
    <input ref={inputRef} id={id} lang={language} autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={160} value={value} disabled={feedback === true} onChange={(event) => { setValue(event.target.value); setFeedback(null); }} className="min-h-16 w-full rounded-2xl border-2 border-[#d8cbb7] bg-white px-4 text-xl outline-none focus:border-[#245a46]" />
    <div className="mt-3 flex flex-wrap gap-2">{(language === "de" ? ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"] : language === "pt-BR" ? ["á", "â", "ã", "à", "é", "ê", "í", "ó", "ô", "õ", "ú", "ç"] : ["à", "è", "é", "ì", "ò", "ù", "’"]).map((character) => <button key={character} type="button" aria-label={`${copy.add} ${character}`} disabled={feedback === true} onClick={() => { const start = inputRef.current?.selectionStart ?? value.length; const end = inputRef.current?.selectionEnd ?? start; setValue((value.slice(0, start) + character + value.slice(end)).slice(0, 160)); setFeedback(null); requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(start + 1, start + 1); }); }} className="min-h-11 min-w-11 rounded-xl border border-[#e7dfd0] bg-white px-3 text-lg">{character}</button>)}</div>
    <p className="mt-2 text-xs text-[#6c604e]">{copy.accent}</p>
    <div className="mt-5 flex flex-wrap items-center gap-3"><button className={italianButton} type="submit" disabled={!unlocked || !value.trim() || feedback === true}>{copy.check}</button><button type="button" className="min-h-11 rounded-xl px-3 text-sm underline" onClick={() => { if (!model) { onHelp(); setRead(true); } setModel(!model); }} aria-expanded={model}>{activity.listeningText ? copy.transcript : copy.model}</button></div>
    {model ? <p lang={language} className="mt-4 rounded-xl bg-[#f4efe5] p-4 font-semibold">{activity.model}</p> : null}
    <Feedback correct={feedback} locale={locale}>{feedback ? activity.explanation[locale] : null}</Feedback>
  </form>;
}

function CafeGame({ activity, locale, onAttempt }: GameProps & { activity: ItalianCafeActivity }) {
  const { language, copy } = useGameLanguage(locale);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const money = (cents: number) => new Intl.NumberFormat(language === "de" ? "de-DE" : language === "pt-BR" ? "pt-BR" : "it-IT", { style: "currency", currency: language === "pt-BR" ? "BRL" : "EUR" }).format(cents / 100);
  const total = italianCafeTotal(activity, basket);
  function change(id: string, amount: number) { setBasket((current) => ({ ...current, [id]: Math.max(0, Math.min(9, (current[id] ?? 0) + amount)) })); setFeedback(null); }
  return <div>
    <div className="mb-5 rounded-2xl border border-[#d8cbb7] bg-[#f8f4ec] p-4"><p lang={language} className="mb-3 text-lg font-semibold">{activity.orderText}</p><ItalianModuleAudio text={activity.orderText} locale={locale} /></div>
    <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[#fff0e3] p-4"><span className="flex items-center gap-2 text-sm font-bold"><Coffee size={19} aria-hidden />{copy.menu}</span><span className="text-xs">{copy.budget} <strong>{money(activity.budgetCents)}</strong></span></div>
    <div className="space-y-3">{activity.menu.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7dfd0] bg-white p-4"><div><p lang={language} className="font-semibold">{item.it}</p><p className="mt-1 text-sm text-[#75644c]">{money(item.priceCents)}</p></div><div className="flex items-center gap-2"><button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d8cbb7] disabled:opacity-30" aria-label={`${copy.remove} ${item.it}`} disabled={!basket[item.id] || feedback === true} onClick={() => change(item.id, -1)}><Minus size={17} aria-hidden /></button><output aria-label={`${item.it} — ${copy.counter}`} className="min-w-7 text-center font-bold">{basket[item.id] ?? 0}</output><button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e7f0e8] text-[#245a46] disabled:opacity-30" aria-label={`${copy.add} ${item.it}`} disabled={(basket[item.id] ?? 0) >= 9 || feedback === true} onClick={() => change(item.id, 1)}><Plus size={17} aria-hidden /></button></div></div>)}</div>
    <div className="my-5 flex items-center justify-between border-b border-dashed border-[#cabaa2] pb-4"><span className="font-semibold">{copy.total}</span><output className={`font-serif text-3xl ${total > activity.budgetCents ? "text-red-800" : "text-[#245a46]"}`}>{money(total)}</output></div>
    <p className="mb-4 text-xs text-[#6c604e]">{copy.fictional} {copy.basketHint}</p>
    <button type="button" className={italianButton} disabled={!total || feedback === true} onClick={() => { const correct = checkItalianCafe(activity, basket); setFeedback(correct); onAttempt(correct); }}>{copy.check}</button>
    <Feedback correct={feedback} locale={locale}>{feedback ? activity.explanation[locale] : null}</Feedback>
  </div>;
}

function MapGame({ activity, locale, onAttempt }: GameProps & { activity: ItalianMapActivity }) {
  const { language, copy } = useGameLanguage(locale);
  const [path, setPath] = useState<ItalianMapDirection[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [boundary, setBoundary] = useState(false);
  const position = italianMapPosition(activity, path) ?? activity.start;
  const labels = { up: copy.up, down: copy.down, right: copy.east, left: copy.west };
  const icons = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight };
  function move(direction: ItalianMapDirection) {
    if (feedback === true || path.length >= 12) return;
    const next = [...path, direction];
    if (!italianMapPosition(activity, next)) { setBoundary(true); return; }
    setPath(next); setFeedback(null); setBoundary(false);
  }
  return <div>
    <div className="mb-5 space-y-2 rounded-2xl bg-[#f4efe5] p-4">{activity.instructions.map((line) => <div key={line}><p lang={language} className="mb-2 font-medium">{line}</p><ItalianModuleAudio text={line} locale={locale}/></div>)}</div>
    <div className="mx-auto grid max-w-sm grid-cols-3 gap-2 rounded-[2rem] border-[10px] border-[#e9d8ba] bg-[#e9d8ba]" aria-label={copy.map}>
      {Array.from({ length: 9 }, (_, index) => { const row = Math.floor(index / 3), col = index % 3; const here = position.row === row && position.col === col; const goal = activity.goal.row === row && activity.goal.col === col; const start = activity.start.row === row && activity.start.col === col;
        return <div key={index} className={`flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-center ${here ? "bg-[#245a46] text-white" : goal ? "bg-[#f7b27b] text-[#4d2d20]" : "bg-[#fffaf0] text-[#776954]"}`} aria-label={`${row + 1}, ${col + 1}${here ? `, ${copy.you}` : ""}${goal ? `, ${copy.destination}` : ""}`}>
          {here ? <span aria-hidden><CompanionAvatar state="map" locale={locale} size="xs" compact /></span> : goal ? <MapPin size={25} aria-hidden /> : <span aria-hidden className="text-2xl opacity-40">{index % 2 ? "⌂" : "♧"}</span>}
          <span className="max-w-full px-1 text-[10px] font-bold sm:text-xs">{here ? "Yoppo" : goal ? copy.destination : start ? copy.start : ""}</span>
        </div>;
      })}
    </div>
    <div className="mx-auto mt-5 grid w-44 grid-cols-3 gap-2" role="group" aria-label={copy.steps}>{(["up", "left", "down", "right"] as const).map((direction) => { const Icon = icons[direction]; return <button type="button" key={direction} disabled={feedback === true || path.length >= 12} onClick={() => move(direction)} aria-label={labels[direction]} className={`flex h-12 items-center justify-center rounded-xl border border-[#cabaa2] bg-white hover:bg-[#e7f0e8] disabled:opacity-40 ${direction === "up" ? "col-start-2" : direction === "left" ? "col-start-1 row-start-2" : "row-start-2"}`}><Icon size={22} aria-hidden /></button>; })}</div>
    <p role="status" className="mt-3 min-h-5 text-center text-xs text-[#805327]">{boundary ? copy.boundary : `${copy.steps} : ${path.length}`}</p>
    <p aria-label={copy.route} className="mt-2 min-h-5 text-center text-xs">{path.map((direction) => labels[direction]).join(" → ")}</p>
    <p className="my-4 text-xs text-[#6c604e]">{copy.map}</p>
    <div className="flex flex-wrap gap-3"><button type="button" className={italianButton} disabled={!path.length || feedback === true} onClick={() => { const correct = checkItalianMap(activity, path); setFeedback(correct); onAttempt(correct); }}>{copy.check}</button><button type="button" className="min-h-11 rounded-xl px-3 text-sm underline" disabled={!path.length || feedback === true} onClick={() => { setPath(path.slice(0, -1)); setFeedback(null); setBoundary(false); }}><CornerDownLeft size={16} className="mr-1 inline" aria-hidden />{copy.undo}</button><button type="button" className="min-h-11 rounded-xl px-3 text-sm underline" disabled={!path.length || feedback === true} onClick={() => { setPath([]); setFeedback(null); setBoundary(false); }}>{copy.clear}</button></div>
    <Feedback correct={feedback} locale={locale}>{feedback ? activity.explanation[locale] : null}</Feedback>
  </div>;
}

function DialogueGame({ activity, locale, onAttempt }: GameProps & { activity: ItalianDialogueActivity }) {
  const { language, copy } = useGameLanguage(locale);
  const [turnIndex, setTurnIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const turn = activity.turns[turnIndex];
  const last = turnIndex === activity.turns.length - 1;
  function check() { if (!selected || feedback === true) return; const correct = selected === turn.correctId; setFeedback(correct); if (!correct || last) onAttempt(correct); }
  return <div>
    <div className="mb-5 rounded-3xl rounded-tl-md bg-[#e7f0e8] p-5"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#245a46]">{turn.speaker} · {copy.turn} {turnIndex + 1}/{activity.turns.length}</p><p lang={language} className="mb-4 font-serif text-2xl text-[#173c2e]">{turn.line}</p><ItalianModuleAudio text={turn.line} locale={locale} /></div>
    <p className="mb-4 text-sm font-medium">{turn.prompt[locale]}</p>
    <Options options={turn.options} selected={selected} disabled={feedback === true} locale={locale} onSelect={(id) => { setSelected(id); setFeedback(null); }} />
    <button type="button" className={`${italianButton} mt-5`} disabled={!selected || feedback === true} onClick={check}>{copy.check}</button>
    <Feedback correct={feedback} locale={locale}>{turn.options.find((option) => option.id === selected)?.feedback[locale]}</Feedback>
    {feedback && !last ? <button type="button" className={`${italianButton} mt-4`} onClick={() => { window.dispatchEvent(new Event("yo-italian-audio-stop")); setTurnIndex(turnIndex + 1); setSelected(null); setFeedback(null); }}>{copy.nextTurn}<ChevronRight size={18} aria-hidden /></button> : null}
    {feedback && last ? <p className="mt-3 text-sm font-bold text-[#245a46]">{copy.finished}</p> : null}
  </div>;
}

export function ItalianGame({ activity, ...props }: GameProps & { activity: ItalianActivity }) {
  switch (activity.kind) {
    case "choice": case "listen": case "culture": return <ChoiceGame activity={activity} {...props} />;
    case "match": return <MatchGame activity={activity} {...props} />;
    case "order": return <OrderGame activity={activity} {...props} />;
    case "type": return <TypeGame activity={activity} {...props} />;
    case "cafe": return <CafeGame activity={activity} {...props} />;
    case "map": return <MapGame activity={activity} {...props} />;
    case "dialogue": return <DialogueGame activity={activity} {...props} />;
  }
}
