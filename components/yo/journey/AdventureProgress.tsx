"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Flag, RotateCcw, Trophy, Volume2, X } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { ADVENTURE_EVALUATED, adventureCopy, adventureMilestones, adventureWorld, newAdventureMilestones, type AdventureMilestone, type AdventureWorld } from "@/lib/yo/adventure";
import { EFFECTS_KEY, listenForAdventureInterruptions, playAdventureSound, prepareAdventureSound, stopAdventureSound } from "@/lib/yo/adventureSound";
import type { LearningJourney } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { ITALIAN_COURSE_PATH, italianCourseHref } from "@/lib/yo/italian/course/courseLinks";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { AdventureScenery } from "./AdventureScenery";
import styles, { adventureCss } from "./adventureStyles";

export { EFFECTS_KEY } from "@/lib/yo/adventureSound";
const button = "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2";

function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const panel = event.currentTarget;
  const controls = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")).filter(element => {
    const style = window.getComputedStyle(element);
    return element.tabIndex >= 0 && !element.matches(":disabled, [aria-disabled='true']") && !element.closest("[hidden], [inert], [aria-hidden='true']")
      && style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && element.getClientRects().length > 0;
  });
  const first = controls[0], last = controls.at(-1), focused = document.activeElement;
  if (!first || !last) { event.preventDefault(); panel.focus(); return; }
  if (event.shiftKey ? focused === first || focused === panel : focused === last || focused === panel) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

export function CourseAdventure({ catalog, progress, locale, ready, href }: {
  catalog: CourseCatalog; progress: CourseProgress; locale: YoLocale; ready: boolean; href: string;
}) {
  const finals = catalog.assessments.filter(item => item.theme !== "culture" && catalog.units.length > 1 && item.unitIds.length === catalog.units.length);
  const finalPassed = finals.length > 0 && finals.every(item => (progress.assessments[item.id]?.bestIndependent ?? -1) >= item.passPercent);
  const world = adventureWorld(href);
  const hrefForUnit = world === "italian" && href.split("?")[0] === ITALIAN_COURSE_PATH ? (unitId: string) => italianCourseHref(locale, unitId) : undefined;
  return <AdventureProgress journey={buildCourseJourney(catalog, progress)} world={world} locale={locale} ready={ready} finalPassed={finalPassed} hrefForUnit={hrefForUnit} />;
}

export function AdventureProgress({ journey, world, locale, ready, finalPassed = false, hrefForUnit }: {
  journey: LearningJourney; world: AdventureWorld; locale: YoLocale; ready: boolean; finalPassed?: boolean; hrefForUnit?: (unitId: string) => string;
}) {
  const c = adventureCopy[locale];
  const earned = adventureMilestones(journey, finalPassed);
  const fingerprint = earned.map(item => item.id).join("|");
  const previous = useRef<{ world: AdventureWorld; milestones: AdventureMilestone[] } | null>(null);
  const evaluated = useRef(false);
  const [evaluation, setEvaluation] = useState(0);
  const [queue, setQueue] = useState<AdventureMilestone[]>([]);
  const [effects, setEffects] = useState(false);
  const [soundResult, setSoundResult] = useState<{ key: string; state: "played" | "unavailable" } | null>(null);
  const [replay, setReplay] = useState(0);
  const seen = useRef(new Set<string>());
  const visible = queue[0];
  const pilotIndex = world === "italian" && hrefForUnit ? journey.steps.findIndex(step => step.unit.id === "u01") : -1;
  const pilotNext = pilotIndex >= 0 ? journey.steps[pilotIndex + 1] : undefined;
  const pilotNextId = pilotNext?.unlocked ? pilotNext.unit.id : undefined;
  const destination = visible?.kind === "mastery" && visible.unitId === "u01" && pilotNextId ? pilotNext : undefined;
  const victory = Boolean(destination);
  const soundKey = `${world}:${visible?.id ?? "settings"}:${replay}:${victory}`;
  const soundState = effects && soundResult?.key === soundKey ? soundResult.state : "idle";
  const soundError = soundState === "unavailable";
  const dialog = useRef<HTMLDialogElement>(null);
  const showing = Boolean(visible);
  const latest = useRef(earned);
  latest.current = earned;
  const effectsRef = useRef(effects);
  effectsRef.current = effects;

  useEffect(() => {
    try { setEffects(localStorage.getItem(EFFECTS_KEY) === "false"); } catch { /* Muted by default. */ }
    const evaluatedNow = () => { evaluated.current = true; setEvaluation(value => value + 1); };
    const hidden = () => { if (document.visibilityState !== "visible") { setQueue([]); evaluated.current = false; } };
    window.addEventListener(ADVENTURE_EVALUATED, evaluatedNow);
    document.addEventListener("visibilitychange", hidden);
    const stop = listenForAdventureInterruptions();
    return () => { stop(); window.removeEventListener(ADVENTURE_EVALUATED, evaluatedNow); document.removeEventListener("visibilitychange", hidden); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const current = latest.current;
    const last = previous.current;
    previous.current = { world, milestones: current };
    // Hydration/import/sync recognises trophies silently; it never queues old celebrations.
    if (!last || last.world !== world) { evaluated.current = false; seen.current = new Set(current.map(item => item.id)); setQueue([]); return; }
    const localEvaluation = evaluated.current;
    evaluated.current = false;
    const fresh = newAdventureMilestones(last.milestones, current).filter(item => !seen.current.has(item.id));
    current.forEach(item => seen.current.add(item.id));
    if (!localEvaluation || document.visibilityState === "hidden") return;
    // Recognition is derived from progress. This set only deduplicates presentation.
    let meaningful = fresh.some(item => item.kind === "mastery" || item.kind === "finale") ? fresh.filter(item => item.kind !== "checkpoint") : fresh;
    // The Italian pilot reveals the real next destination inside its mastery scene.
    // Its unlock remains earned; only the duplicate ceremony is consumed here.
    if (pilotNextId && fresh.some(item => item.kind === "mastery" && item.unitId === "u01")) {
      meaningful = meaningful.filter(item => !(item.kind === "unlock" && item.unitId === pilotNextId));
    }
    if (meaningful.length) setQueue(items => [...items, ...meaningful]);
  }, [fingerprint, ready, world, evaluation, pilotNextId]);

  useEffect(() => {
    if (!visible || !effectsRef.current) return;
    let mounted = true;
    void playAdventureSound(visible.kind, victory ? "italian-u01" : undefined).then(ok => { if (mounted && effectsRef.current) setSoundResult({ key: soundKey, state: ok ? "played" : "unavailable" }); });
    return () => { mounted = false; stopAdventureSound(); };
  }, [visible, victory, soundKey]);

  useEffect(() => {
    if (!showing) return;
    const panel = dialog.current;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (panel && typeof panel.showModal === "function") panel.showModal();
    else panel?.setAttribute("open", "");
    return () => {
      if (panel && typeof panel.close === "function") panel.close();
      else panel?.removeAttribute("open");
      focused?.focus({ preventScroll: true });
    };
  }, [showing]);

  useEffect(() => {
    // Each scene replaces its controls; retain keyboard focus within the open dialog.
    if (visible) dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [visible, replay]);

  function dismiss() { stopAdventureSound(); setQueue(items => items.slice(1)); setSoundResult(null); }
  function dismissAll() { stopAdventureSound(); setQueue([]); setSoundResult(null); }
  function repeat(item: AdventureMilestone) {
    // Prime a suspended context directly from the replay gesture; it still obeys the saved mute preference.
    if (effectsRef.current) void prepareAdventureSound();
    setQueue(items => items[0]?.id === item.id ? items : [item]); setReplay(value => value + 1);
  }
  async function toggleEffects(enabled: boolean) {
    effectsRef.current = enabled;
    setEffects(enabled); setSoundResult(null);
    try { localStorage.setItem(EFFECTS_KEY, String(!enabled)); } catch { /* Session-only preference is safe. */ }
    if (!enabled) stopAdventureSound();
    else { const available = await prepareAdventureSound(); if (effectsRef.current && !available) setSoundResult({ key: soundKey, state: "unavailable" }); }
  }
  const trophies = earned.filter(item => item.kind !== "unlock");
  return <div className="my-4 min-w-0" data-adventure-world={world} data-effect-state={soundState}>
    <style>{adventureCss}</style>
    <div className="flex flex-wrap items-start justify-between gap-3 border-y border-emerald-100 py-2">
      <details className="min-w-0 flex-1">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-emerald-950">{c.milestones} · {ready ? trophies.length : "…"}</summary>
        <p className="mb-3 text-xs text-gray-600">{c.local}</p>
        <ul className="space-y-2 pb-3">{trophies.map(item => <li key={item.id} className="flex min-w-0 items-center gap-2 text-sm">
          {item.kind === "checkpoint" ? <Flag size={18} aria-hidden className="shrink-0 text-teal-700" /> : <Trophy size={18} aria-hidden className="shrink-0 text-amber-700" />}
          <span className="min-w-0 flex-1">{item.title[locale]} · {item.kind === "checkpoint" ? c.recap : c.kinds[item.kind]}</span>
          <button type="button" className={button} title={c.replay} aria-label={`${c.replay} : ${item.title[locale]} · ${c.kinds[item.kind]}`} onClick={() => repeat(item)}><RotateCcw size={17} aria-hidden /></button>
        </li>)}</ul>
      </details>
      <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm text-gray-700"><Volume2 size={16} aria-hidden /><span>{c.effects}</span><input type="checkbox" checked={effects} onChange={event => void toggleEffects(event.target.checked)} className="size-4 accent-emerald-800" /></label>
    </div>
    <dialog ref={dialog} aria-label={visible ? victory ? c.victory : c.kinds[visible.kind] : c.milestones} onKeyDown={keepDialogFocus} onCancel={event => { event.preventDefault(); dismissAll(); }} className="fixed m-auto max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-lg border border-emerald-200 bg-white p-4 text-gray-900 shadow-xl backdrop:bg-black/35 sm:p-6" data-yoppo-controls>
    {visible ? <section key={`${visible.id}-${replay}`} aria-label={victory ? c.victory : c.kinds[visible.kind]} className={styles.celebration} data-celebration={visible.kind} data-celebration-scene={victory ? "italian-u01" : undefined}>
      <div className="flex items-start gap-3">
        <CompanionAvatar visualId="travel" state={visible.kind === "unlock" ? "map" : "celebrating"} locale={locale} size="sm" compact />
        <div className="min-w-0 flex-1"><p role="status" className="font-bold text-emerald-950">{victory ? c.victory : c.kinds[visible.kind]}</p><h3 className="mt-1 text-lg font-bold">{visible.title[locale]}</h3></div>
        <button type="button" className={button} aria-label={c.skip} onClick={dismiss}><X size={19} aria-hidden /></button>
      </div>
      <div className={victory ? "mt-3 min-w-0 space-y-4" : "mt-3 grid min-w-0 items-center gap-4 sm:grid-cols-[200px_minmax(0,1fr)]"}>
        <div className={victory ? "w-full" : "max-w-60"}><AdventureScenery world={world} state={visible.kind === "mastery" || visible.kind === "finale" ? "mastered" : "available"} replay={replay} victory={destination ? { destinationNumber: destination.unit.number } : undefined} /></div>
        <div className="text-sm leading-6">
          {victory ? <p className="mb-3 font-semibold text-emerald-900">{c.victoryStory}</p> : null}
          <p>{visible.kind === "checkpoint" ? c.half : visible.kind === "recap" ? c.recapSuccess : visible.kind === "finale" ? c.final : visible.kind === "unlock" ? c.goal : c.skills}</p>
          {visible.skills.length ? <ul className="list-disc pl-5">{visible.skills.map((skill, index) => <li key={index}>{skill[locale]}</li>)}</ul> : null}
          <p className="mt-2 text-xs text-gray-600">{visible.kind === "unlock" ? c.access : c.proof}</p>
          {visible.kind === "finale" ? <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={`/yo/langues?lang=${locale}`}>{c.explore}</Link> : null}
        </div>
      </div>
      {destination && hrefForUnit ? <section aria-label={c.nextDestination} data-next-destination={destination.unit.id} className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{c.nextDestination}</p>
        <h4 className="mt-1 break-words text-lg font-bold">{destination.unit.title[locale]}</h4>
        <p className="mt-2 text-sm leading-6">{(destination.unit.objectives[0] ?? destination.unit.subtitle)[locale]}</p>
        <Link href={hrefForUnit(destination.unit.id)} onClick={dismissAll} className={`${button} mt-3 bg-emerald-800 text-white`} aria-label={`${c.visitDestination} : ${destination.unit.title[locale]}`}>{c.visitDestination}</Link>
      </section> : null}
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={`${button} bg-emerald-800 text-white`} onClick={dismiss}>{c.skip}</button><button type="button" className={button} onClick={() => repeat(visible)}><RotateCcw size={16} aria-hidden />{c.replay}</button>{victory ? <button type="button" className={button} aria-pressed={effects} onClick={() => void toggleEffects(!effects)}><Volume2 size={16} aria-hidden />{c.effects}</button> : null}</div>
      {victory && soundError ? <p role="status" className="mt-2 text-xs text-gray-600">{c.unavailable}</p> : null}
    </section> : null}
    </dialog>
    {!victory && soundError ? <p role="status" className="mt-2 text-xs text-gray-600">{c.unavailable}</p> : null}
  </div>;
}
