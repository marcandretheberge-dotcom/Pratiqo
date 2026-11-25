"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { SharedIntro } from "../shared/SharedIntro";
import { YoppoWelcomeLoading } from "../onboarding/YoppoJournal";
import { primary, secondary } from "../italian/guided/copy";
import { dialogue, fresh, goal, missionTitle, notice, questions, restore, storageKey, type Progress } from "@/lib/yo/francisation/mission";

export function FrancisationEntry(props: ComponentProps<typeof SharedIntro>) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [inMission, setInMission] = useState(false);
  const [chooseAgain, setChooseAgain] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const raw = useRef<string | null>(null);
  const current = useRef(fresh());
  const heading = useRef<HTMLHeadingElement>(null);

  function read() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== raw.current) {
        raw.current = stored;
        current.current = restore(stored);
      }
    } catch {
      setStorageNotice("La sauvegarde est indisponible. Tu peux continuer dans cet onglet.");
    }
    return current.current;
  }

  function save(next: Progress) {
    current.current = next;
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(storageKey, serialized);
      raw.current = serialized;
    } catch {
      setStorageNotice("La sauvegarde est indisponible. Tu peux continuer dans cet onglet.");
    }
    setProgress(next);
  }

  useEffect(() => {
    function sync() { setProgress(read()); }
    const entryPath = window.location.pathname;
    function followHistory() {
      if (window.location.pathname !== entryPath) return;
      const active = window.location.hash === "#francisation";
      save({ ...read(), active });
      setInMission(false);
      setChooseAgain(!active);
      if (window.location.hash === "#objectifs") window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (window.location.hash === "#francisation" || window.location.hash === "#objectifs") followHistory();
    else sync();
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("popstate", followHistory);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("popstate", followHistory);
    };
  }, []);

  useEffect(() => { heading.current?.focus(); }, [progress?.active, progress?.step, inMission]);

  function choose(active: boolean) {
    save({ ...read(), active });
    setChooseAgain(!active);
    setInMission(false);
    window.history.pushState(null, "", active ? "#francisation" : window.location.pathname + window.location.search);
  }

  function update(next: Progress) {
    const latest = read();
    if (progress !== latest) {
      setProgress(latest);
      setStorageNotice("Ta progression a changé dans un autre onglet. Reprends à l’étape affichée.");
      return false;
    }
    save(next);
    return true;
  }

  if (!progress) return <YoppoWelcomeLoading locale={props.locale}/>;
  if (!progress.active) return <SharedIntro {...props} editOnReturn={chooseAgain} onChooseFrancisation={() => choose(true)}/>;

  const finished = progress.step === questions.length + 1;
  const reviewing = progress.step === questions.length;
  const mistake = progress.mistakes.findIndex(value => value !== null);
  const questionIndex = reviewing ? Math.max(0, mistake) : progress.step;
  const question = questions[questionIndex];

  return <main lang="fr-CA" className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-900">
    <div className="mx-auto max-w-xl space-y-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-8">
      <p className="font-bold text-emerald-800">{goal} · Mission gratuite</p>
      {storageNotice && <p role="status">{storageNotice}</p>}
      {!inMission ? <>
        <Image src="/companion/travel/journal/yoppo-journal.webp" alt="" width={88} height={88} unoptimized/>
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">{missionTitle}</h1>
        <p>Bonjour, c’est Yoppo ! On va vérifier le nom et les coordonnées d’un personnage à l’accueil d’un atelier.</p>
        <p className="text-sm">Toutes les fiches sont fictives. Utilise seulement les choix proposés.</p>
        <button type="button" className={primary} onClick={() => {
          if (update({ ...progress, started: true })) setInMission(true);
        }}>{progress.started ? "Continuer" : "Commencer"}</button>
        <p className="text-sm text-stone-700">{notice}</p>
      </> : finished ? <>
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">Mission terminée</h1>
        <p>Tu as vérifié le nom de Camille et le courriel de Sam. Pour confirmer une coordonnée, tu peux dire « Pouvez-vous me la répéter ? »</p>
        <button type="button" className={primary} onClick={() => update({ ...fresh(), active: true, started: true })}>Refaire la mission en pratique</button>
      </> : <>
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">{reviewing ? "Revenir sur une erreur" : question.title}</h1>
        {reviewing && <p>{mistake >= 0 ? <>Tu avais choisi « {question.options[progress.mistakes[mistake]!]} ». Retrouve la correction.</> : "L’accueil avait inversé les deux derniers chiffres. Retrouve la correction de Camille."}</p>}
        {questionIndex < 2 ? <section aria-label="Dialogue de l’atelier" className="space-y-2 rounded-xl bg-emerald-50 p-4">
          <h2 className="font-bold">À l’atelier de cuisine</h2>
          <p className="text-sm">Transcription du dialogue · Audio à venir</p>
          <dl>{dialogue.map(([speaker, line], i) => <div key={i} className="mt-2"><dt className="text-sm font-bold text-emerald-900">{speaker}</dt><dd>{line}</dd></div>)}</dl>
        </section> : <section aria-label="Fiche fictive de la bibliothèque" className="space-y-2 break-words rounded-xl bg-emerald-50 p-4">
          <h2 className="font-bold">Fiche de bibliothèque</h2><p>Sam Roy · sam.roy@example.org</p>
          <p><strong>À l’accueil</strong> « J’ai noté sam.ray@example.org. Est-ce exact ? »</p>
        </section>}
        <Question key={progress.step} question={question} checked={progress.checked} helped={progress.hints[questionIndex]}
          onHint={() => update({ ...progress, hints: progress.hints.map((v, i) => i === questionIndex || v) })}
          onCheck={answer => update({ ...progress, checked: answer === question.correct, mistakes: progress.mistakes.map((v, i) =>
            i === questionIndex && v === null && answer !== question.correct ? answer : v) })}
          onNext={() => update({ ...progress, step: progress.step + 1, checked: false })}/>
      </>}
      <nav aria-label="Navigation du parcours" className="flex flex-wrap items-center gap-4 border-t pt-4">
        {inMission && <button type="button" className={secondary} onClick={() => setInMission(false)}>Retour à la mission</button>}
        <button type="button" className={secondary} onClick={() => choose(false)}>Changer d’objectif</button>
        <Link href="/yo" className="py-3 underline">Retour aux langues</Link>
      </nav>
    </div>
  </main>;
}

function Question({ question, checked, helped, onHint, onCheck, onNext }: {
  question: typeof questions[number]; checked: boolean; helped: boolean;
  onHint: () => void; onCheck: (answer: number) => boolean; onNext: () => void;
}) {
  const [answer, setAnswer] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const nextButton = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (checked && submitted.current) nextButton.current?.focus();
  }, [checked]);
  return <div className="space-y-4">
    <fieldset disabled={checked}>
      <legend className="mb-2 font-semibold">{question.prompt}</legend>
      {question.options.map((option, i) => <label key={option} className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border p-3">
        <input type="radio" name="coordonnees" checked={checked ? i === question.correct : answer === i} onChange={() => { setAnswer(i); setWrong(false); }}/>{option}
      </label>)}
    </fieldset>
    <p role="status">{checked ? question.explanation : wrong ? "À revoir. Compare ton choix avec la fiche ou le dialogue, puis réessaie." : ""}</p>
    {checked ? <button ref={nextButton} type="button" className={primary} onClick={onNext}>Continuer</button> : <>
      <button type="button" className={primary} disabled={answer === null} onClick={() => {
        if (answer !== null && onCheck(answer)) {
          submitted.current = true;
          setWrong(answer !== question.correct);
        }
      }}>Vérifier</button>
      <button type="button" className={secondary} aria-expanded={helped} disabled={helped} onClick={onHint}>Voir un indice</button>
      {helped && <p role="status">{question.hint}</p>}
    </>}
  </div>;
}
