"use client";

import Image from "next/image";
import { ArrowRight, Check, ChevronDown, Compass, Flag, RotateCcw, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { getCompanionVisualAsset, type CompanionVisualState } from "@/lib/companion/companionVisuals";
import type { YoLocale } from "@/lib/yo/types";

const copy = {
  fr: {
    challenge: "Défi final", ready: "Un dernier défi", destination: "pour ton tampon de", intro: "Montre ce que tu sais faire. Yoppo est avec toi !",
    questions: "questions", goal: "à réussir", noHelp: "Sans indice", rules: "Comment ça marche", start: "Commencer le défi", review: "Revoir les missions",
    passport: "PASSEPORT", stamp: "TAMPON DE VOYAGE", earned: "OBTENU", retained: "DÉJÀ OBTENU", awaiting: "À GAGNER", perfect: "Parfait !", success: "Défi réussi !", retryTitle: "On réessaie ensemble ?",
    earnedBody: "Ton tampon est dans ton passeport.", passedBody: "Tu as terminé le défi. Retrouve ta progression sur la carte.", retryBody: "Chaque essai te fait avancer. Revois quelques mots, puis lance-toi !",
    assistedBody: "Tu as utilisé une aide. Recommence sans indice pour gagner le tampon.", answers: "Bonnes réponses", accuracy: "Précision", target: "Objectif", unaided: "sans indice",
    retainedBody: "Ton tampon reste dans ton passeport. Ce nouvel essai t’aide à progresser.", retryDetails: "À propos du défi", practiceTitle: "On s’entraîne", practiceDestination: "à",
    details: "Ce que je sais maintenant faire", continue: "Retour à la carte", retry: "Réessayer", celebrating: "Yoppo célèbre ta réussite", companion: "Yoppo t’encourage pour le défi",
  },
  en: {
    challenge: "Final challenge", ready: "One final challenge", destination: "for your stamp from", intro: "Show what you can do. Yoppo is with you!",
    questions: "questions", goal: "to get right", noHelp: "No hints", rules: "How it works", start: "Start the challenge", review: "Review the missions",
    passport: "PASSPORT", stamp: "TRAVEL STAMP", earned: "EARNED", retained: "ALREADY EARNED", awaiting: "TO EARN", perfect: "Perfect!", success: "Challenge complete!", retryTitle: "Ready to try again?",
    earnedBody: "Your stamp is in your passport.", passedBody: "You finished the challenge. Find your progress on the map.", retryBody: "Every try moves you forward. Review a few words, then give it another go!",
    assistedBody: "You used some help. Try again without hints to earn the stamp.", answers: "Correct answers", accuracy: "Accuracy", target: "Goal", unaided: "without hints",
    retainedBody: "Your stamp stays in your passport. This new attempt helps you keep improving.", retryDetails: "About the challenge", practiceTitle: "Let’s practise", practiceDestination: "in",
    details: "What I can do now", continue: "Back to the map", retry: "Try again", celebrating: "Yoppo celebrates your achievement", companion: "Yoppo cheers you on for the challenge",
  },
  es: {
    challenge: "Desafío final", ready: "Un último desafío", destination: "para tu sello de", intro: "Demuestra lo que sabes. ¡Yoppo te acompaña!",
    questions: "preguntas", goal: "para acertar", noHelp: "Sin pistas", rules: "Cómo funciona", start: "Empezar el desafío", review: "Repasar las misiones",
    passport: "PASAPORTE", stamp: "SELLO DE VIAJE", earned: "OBTENIDO", retained: "YA OBTENIDO", awaiting: "POR GANAR", perfect: "¡Perfecto!", success: "¡Desafío superado!", retryTitle: "¿Lo intentamos de nuevo?",
    earnedBody: "Tu sello está en tu pasaporte.", passedBody: "Has terminado el desafío. Encuentra tu progreso en el mapa.", retryBody: "Cada intento te ayuda a avanzar. Repasa unas palabras y vuelve a intentarlo.",
    assistedBody: "Has usado una ayuda. Repite sin pistas para ganar el sello.", answers: "Respuestas correctas", accuracy: "Precisión", target: "Objetivo", unaided: "sin pistas",
    retainedBody: "Tu sello sigue en tu pasaporte. Este nuevo intento te ayuda a mejorar.", retryDetails: "Sobre el desafío", practiceTitle: "Vamos a practicar", practiceDestination: "en",
    details: "Lo que ya sé hacer", continue: "Volver al mapa", retry: "Volver a intentarlo", celebrating: "Yoppo celebra tu logro", companion: "Yoppo te anima para el desafío",
  },
} satisfies Record<YoLocale, Record<string, string>>;

function PassportStamp({ city, locale, earned, retained = false }: { city: string; locale: YoLocale; earned: boolean; retained?: boolean }) {
  const c = copy[locale];
  const status = earned ? retained ? c.retained : c.earned : c.awaiting;
  return <div className="yo-challenge-stamp" data-earned={earned} data-retained={retained} role="img" aria-label={`${city} · ${status}`}>
    <span className="yo-challenge-stamp-top">{c.passport}</span>
    <Compass size={23} strokeWidth={1.8} aria-hidden="true" />
    <strong>{city}</strong>
    <span className="yo-challenge-stamp-caption">{c.stamp}</span>
    <span className="yo-challenge-stamp-state">{earned ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : <Flag size={10} aria-hidden="true" />}{status}</span>
  </div>;
}

function ChallengeHero({ city, locale, state, earned = false, retained = false, celebrate = false }: {
  city: string; locale: YoLocale; state: CompanionVisualState; earned?: boolean; retained?: boolean; celebrate?: boolean;
}) {
  const asset = getCompanionVisualAsset("travel", state), fallback = getCompanionVisualAsset("travel", "teacher_ready");
  return <div className="yo-challenge-hero" data-celebrate={celebrate}>
    {asset.src || fallback.src ? <Image className="yo-challenge-yoppo" src={(asset.src ?? fallback.src)!} width={asset.width} height={asset.height}
      sizes="(max-width: 600px) 220px, 260px" loading="eager" alt={celebrate ? copy[locale].celebrating : copy[locale].companion} /> : null}
    <PassportStamp city={city} locale={locale} earned={earned} retained={retained} />
    {celebrate ? <span className="yo-challenge-sparkles" aria-hidden="true"><Sparkles /><Sparkles /><Sparkles /></span> : null}
  </div>;
}

export type FinalChallengeIntroProps = {
  locale: YoLocale; city: string; total: number; required: number; briefing: string; rules: string;
  headingRef: Ref<HTMLHeadingElement>; onStart: () => void; onReview: () => void; stampEarned?: boolean;
};

export function FinalChallengeIntro({ locale, city, total, required, briefing, rules, headingRef, onStart, onReview, stampEarned = false }: FinalChallengeIntroProps) {
  const c = copy[locale];
  return <section className="yo-challenge-stage" data-challenge-stage="intro">
    <div className="yo-challenge-body">
      <ChallengeHero city={city} locale={locale} state="teacher_ready" earned={stampEarned} retained={stampEarned} />
      <p className="yo-challenge-eyebrow">{c.challenge}</p>
      <h1 ref={headingRef} tabIndex={-1} className="yo-challenge-title">{stampEarned ? c.practiceTitle : c.ready}<span>{stampEarned ? c.practiceDestination : c.destination} <strong>{city}</strong></span></h1>
      <p className="yo-challenge-subtitle">{stampEarned ? c.retainedBody : c.intro}</p>
      <div className="yo-challenge-requirements">
        <span><Flag size={18} aria-hidden="true" /><strong>{total}</strong> {c.questions}</span>
        <span><Target size={19} aria-hidden="true" /><strong>{required}/{total}</strong> {c.goal}</span>
        <span><ShieldCheck size={19} aria-hidden="true" />{c.noHelp}</span>
      </div>
      <details className="yo-challenge-details">
        <summary>{c.rules}<ChevronDown size={17} aria-hidden="true" /></summary>
        <div className="yo-challenge-details-content"><p>{briefing}</p><p>{rules}</p></div>
      </details>
    </div>
    <footer className="yo-challenge-footer">
      <button type="button" className="yo-challenge-button" onClick={onStart}>{c.start}<ArrowRight size={21} aria-hidden="true" /></button>
      <button type="button" className="yo-challenge-text-button" onClick={onReview}>{c.review}</button>
    </footer>
  </section>;
}

export type FinalChallengeResultProps = {
  locale: YoLocale; city: string; correct: number; total: number; required: number; passed: boolean; assisted: boolean; stampEarned: boolean;
  headingRef: Ref<HTMLHeadingElement>; onContinue: () => void; onRetry: () => void; onReview: () => void; children?: ReactNode;
};

export function FinalChallengeResult({ locale, city, correct, total, required, passed, assisted, stampEarned, headingRef, onContinue, onRetry, onReview, children }: FinalChallengeResultProps) {
  const c = copy[locale], celebrate = passed && stampEarned, retained = stampEarned && !passed, perfect = passed && correct === total;
  const score = Math.min(Math.max(0, correct), Math.max(0, total));
  const accuracy = total > 0 ? Math.round(score / total * 100) : 0;
  const subtitle = retained ? c.retainedBody : celebrate ? c.earnedBody : passed ? c.passedBody : assisted ? c.assistedBody : c.retryBody;
  return <section className="yo-challenge-stage" data-challenge-stage={passed ? "success" : "retry"}>
    <div className="yo-challenge-body">
      <ChallengeHero city={city} locale={locale} state={celebrate ? "celebrating" : "teacher_ready"} earned={stampEarned} retained={retained} celebrate={celebrate} />
      <p className="yo-challenge-eyebrow">{city} · {c.challenge}</p>
      <h1 ref={headingRef} tabIndex={-1} className="yo-challenge-title">{perfect ? c.perfect : passed ? c.success : c.retryTitle}</h1>
      <p className="yo-challenge-subtitle">{subtitle}</p>
      <dl className="yo-challenge-stats">
        <div className="yo-challenge-stat"><dt><Check size={18} aria-hidden="true" />{c.answers}</dt><dd>{score}<span>/{total}</span></dd></div>
        <div className="yo-challenge-stat"><dt><Target size={18} aria-hidden="true" />{c.accuracy}</dt><dd>{accuracy}<span>%</span></dd></div>
      </dl>
      {!passed ? <p className="yo-challenge-target">{c.target} : <strong>{required}/{total}</strong> {c.unaided}</p> : null}
      {children ? <details className="yo-challenge-details yo-challenge-achievements"><summary>{passed ? c.details : c.retryDetails}<ChevronDown size={17} aria-hidden="true" /></summary><div className="yo-challenge-details-content">{children}</div></details> : null}
    </div>
    <footer className="yo-challenge-footer">
      <button type="button" className="yo-challenge-button" onClick={passed ? onContinue : onRetry}>{passed ? c.continue : c.retry}{passed ? <ArrowRight size={21} aria-hidden="true" /> : <RotateCcw size={20} aria-hidden="true" />}</button>
      {!passed ? <button type="button" className="yo-challenge-text-button" onClick={onReview}>{c.review}</button> : null}
    </footer>
  </section>;
}
