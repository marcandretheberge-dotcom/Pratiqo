"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag, RotateCcw, Trophy, Volume2, X } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { ADVENTURE_EVALUATED, adventureCopy, adventureMilestones, adventureWorld, newAdventureMilestones, type AdventureMilestone, type AdventureWorld } from "@/lib/yo/adventure";
import { EFFECTS_KEY, listenForAdventureInterruptions, playAdventureSound, prepareAdventureSound, stopAdventureSound } from "@/lib/yo/adventureSound";
import type { LearningJourney } from "@/lib/yo/learningJourney";
import type { YoLocale } from "@/lib/yo/types";
import type { CourseCatalog } from "@/lib/yo/italian/course/courseTypes";
import type { CourseProgress } from "@/lib/yo/italian/course/courseProgress";
import { buildCourseJourney } from "@/lib/yo/courseJourney";
import { AdventureScenery } from "./AdventureScenery";
import styles, { adventureCss } from "./adventureStyles";

export { EFFECTS_KEY } from "@/lib/yo/adventureSound";
const button = "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2";

export function CourseAdventure({ catalog, progress, locale, ready, href }: {
  catalog: CourseCatalog; progress: CourseProgress; locale: YoLocale; ready: boolean; href: string;
}) {
  const finals = catalog.assessments.filter(item => item.theme !== "culture" && catalog.units.length > 1 && item.unitIds.length === catalog.units.length);
  const finalPassed = finals.length > 0 && finals.every(item => (progress.assessments[item.id]?.bestIndependent ?? -1) >= item.passPercent);
  return <AdventureProgress journey={buildCourseJourney(catalog, progress)} world={adventureWorld(href)} locale={locale} ready={ready} finalPassed={finalPassed} />;
}

export function AdventureProgress({ journey, world, locale, ready, finalPassed = false }: {
  journey: LearningJourney; world: AdventureWorld; locale: YoLocale; ready: boolean; finalPassed?: boolean;
}) {
  const c = adventureCopy[locale];
  const earned = adventureMilestones(journey, finalPassed);
  const fingerprint = earned.map(item => item.id).join("|");
  const previous = useRef<{ world: AdventureWorld; milestones: AdventureMilestone[] } | null>(null);
  const evaluated = useRef(false);
  const [evaluation, setEvaluation] = useState(0);
  const [queue, setQueue] = useState<AdventureMilestone[]>([]);
  const [effects, setEffects] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [replay, setReplay] = useState(0);
  const seen = useRef(new Set<string>());
  const visible = queue[0];
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
    const meaningful = fresh.some(item => item.kind === "mastery" || item.kind === "finale") ? fresh.filter(item => item.kind !== "checkpoint") : fresh;
    if (meaningful.length) setQueue(items => [...items, ...meaningful]);
  }, [fingerprint, ready, world, evaluation]);

  useEffect(() => {
    if (!visible || !effectsRef.current) return;
    let mounted = true;
    void playAdventureSound(visible.kind).then(ok => { if (mounted) { setSoundError(!ok); setSoundPlayed(ok); } });
    return () => { mounted = false; stopAdventureSound(); };
  }, [visible, replay]);

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

  function dismiss() { stopAdventureSound(); setQueue(items => items.slice(1)); setSoundError(false); }
  function repeat(item: AdventureMilestone) { setQueue(items => items[0]?.id === item.id ? items : [item]); setReplay(value => value + 1); }
  async function toggleEffects(enabled: boolean) {
    setEffects(enabled); setSoundError(false);
    try { localStorage.setItem(EFFECTS_KEY, String(!enabled)); } catch { /* Session-only preference is safe. */ }
    if (!enabled) stopAdventureSound();
    else setSoundError(!await prepareAdventureSound());
  }
  const trophies = earned.filter(item => item.kind !== "unlock");
  return <div className="my-4 min-w-0" data-adventure-world={world} data-effect-state={soundError ? "unavailable" : soundPlayed ? "played" : "idle"}>
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
    <dialog ref={dialog} aria-label={visible ? c.kinds[visible.kind] : c.milestones} onCancel={event => { event.preventDefault(); stopAdventureSound(); setQueue([]); }} className="fixed m-auto max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-lg border border-emerald-200 bg-white p-4 text-gray-900 shadow-xl backdrop:bg-black/35 sm:p-6" data-yoppo-controls>
    {visible ? <section key={`${visible.id}-${replay}`} aria-label={c.kinds[visible.kind]} className={styles.celebration} data-celebration={visible.kind}>
      <div className="flex items-start gap-3">
        <CompanionAvatar visualId="travel" state={visible.kind === "unlock" ? "map" : "celebrating"} locale={locale} size="sm" compact />
        <div className="min-w-0 flex-1"><p role="status" className="font-bold text-emerald-950">{c.kinds[visible.kind]}</p><h3 className="mt-1 text-lg font-bold">{visible.title[locale]}</h3></div>
        <button type="button" className={button} aria-label={c.skip} onClick={dismiss}><X size={19} aria-hidden /></button>
      </div>
      <div className="mt-3 grid min-w-0 items-center gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="max-w-60"><AdventureScenery world={world} state={visible.kind === "mastery" || visible.kind === "finale" ? "mastered" : "available"} replay={replay} /></div>
        <div className="text-sm leading-6">
          <p>{visible.kind === "checkpoint" ? c.half : visible.kind === "finale" ? c.final : visible.kind === "unlock" ? c.goal : c.skills}</p>
          {visible.skills.length ? <ul className="list-disc pl-5">{visible.skills.map((skill, index) => <li key={index}>{skill[locale]}</li>)}</ul> : null}
          <p className="mt-2 text-xs text-gray-600">{visible.kind === "unlock" ? c.access : c.proof}</p>
          {visible.kind === "finale" ? <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={`/yo/langues?lang=${locale}`}>{c.explore}</Link> : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={`${button} bg-emerald-800 text-white`} onClick={dismiss}>{c.skip}</button><button type="button" className={button} onClick={() => repeat(visible)}><RotateCcw size={16} aria-hidden />{c.replay}</button></div>
    </section> : null}
    </dialog>
    {soundError ? <p role="status" className="mt-2 text-xs text-gray-600">{c.unavailable}</p> : null}
  </div>;
}
