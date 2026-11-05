import type { LearningJourney } from "./learningJourney";
import type { YoLocale } from "./types";

export type AdventureWorld = "italian" | "german" | "portuguese" | "japanese" | "mandarin" | "french" | "english" | "spanish";
export type AdventureKind = "unlock" | "checkpoint" | "mastery" | "finale";
export type DestinationState = "locked" | "available" | "progress" | "completed" | "mastered";
export type AdventureMilestone = { id: string; kind: AdventureKind; unitId?: string; title: Record<YoLocale, string>; skills: Record<YoLocale, string>[] };
export const ADVENTURE_EVALUATED = "yo-adventure-evaluated";

export function destinationState(step: LearningJourney["steps"][number]): DestinationState {
  if (step.passed) return "mastered";
  if (!step.unlocked) return "locked";
  if (step.unit.activityIds.length > 0 && step.practiced >= step.unit.activityIds.length) return "completed";
  return step.started ? "progress" : "available";
}

/** A projection of existing results, never another progress, money or entitlement ledger. */
export function adventureMilestones(journey: LearningJourney, finalPassed = false): AdventureMilestone[] {
  const milestones: AdventureMilestone[] = [];
  for (const step of journey.steps) {
    const common = { unitId: step.unit.id, title: step.unit.title, skills: step.unit.objectives };
    if (step.unlocked) milestones.push({ ...common, skills: [step.unit.objectives[0] ?? step.unit.subtitle], id: `${step.unit.id}:unlock`, kind: "unlock" });
    const half = Math.ceil(step.unit.activityIds.length / 2);
    if (half > 0 && step.independent >= half) milestones.push({ ...common, skills: [], id: `${step.unit.id}:checkpoint`, kind: "checkpoint" });
    if (step.passed) milestones.push({ ...common, id: `${step.unit.id}:mastery`, kind: "mastery" });
  }
  // Culture trivia and merely opening the final are never a course completion.
  if (finalPassed && journey.steps.length > 0 && journey.steps.every(step => step.passed)) {
    milestones.push({ id: "course:finale", kind: "finale", title: { fr: "Ton voyage continue", en: "Your journey continues", es: "Tu viaje continúa" }, skills: [] });
  }
  return milestones;
}

export function newAdventureMilestones(before: AdventureMilestone[], after: AdventureMilestone[]) {
  const known = new Set(before.map(item => item.id));
  return after.filter(item => !known.has(item.id));
}

/** Called only after local evaluated work has been saved, never on hydration or storage sync. */
export function announceAdventureEvaluation() {
  if (typeof window !== "undefined") window.dispatchEvent(new window.Event(ADVENTURE_EVALUATED));
}

// Visual themes only. Course availability and entitlements stay in their existing catalogs.
export function adventureWorld(path: string): AdventureWorld {
  if (path.includes("allemand")) return "german";
  if (path.includes("portugais")) return "portuguese";
  if (path.includes("japonais")) return "japanese";
  if (path.includes("mandarin")) return "mandarin";
  if (path.includes("francais") || path.includes("french")) return "french";
  if (path.includes("anglais") || path.includes("english")) return "english";
  if (path.includes("espagnol") || path.includes("spanish")) return "spanish";
  return "italian";
}

export const adventureCopy = {
  fr: {
    states: { locked: "Destination verrouillée", available: "Prête à explorer", progress: "Voyage en cours", completed: "Activités terminées · défi à valider", mastered: "Défi maîtrisé" },
    kinds: { unlock: "Un nouveau chemin s’ouvre", checkpoint: "Une belle étape franchie", mastery: "Destination illuminée", finale: "Le voyage prend vie" },
    effects: "Effets sonores", replay: "Rejouer la célébration", skip: "Continuer", milestones: "Mes jalons", goal: "Ta prochaine mission", skills: "Objectifs évalués dans ce défi", half: "Tu as réussi au moins la moitié des exercices de cette étape sans aide affichée.",
    proof: "Ce jalon reconnaît les exercices évalués, pas une certification ni la maîtrise de toute la langue.", access: "Ce chemin guide ton apprentissage. Il n’achète ni ne débloque de contenu payant.",
    final: "Les défis du parcours et le bilan final sont réussis. Reprends les situations à revoir avant d’explorer une autre langue.", local: "Jalons issus de ta progression enregistrée sur cet appareil.", unavailable: "Son indisponible ici. La célébration reste visible.",
    explore: "Explorer une autre langue", recap: "Mi-parcours", challenge: "Mission finale", retry: "Entraîne-toi et réessaie autant que nécessaire. Aucun pass supplémentaire.",
  },
  en: {
    states: { locked: "Locked destination", available: "Ready to explore", progress: "Journey in progress", completed: "Activities completed · challenge pending", mastered: "Challenge mastered" },
    kinds: { unlock: "A new path opens", checkpoint: "A meaningful step forward", mastery: "Destination brought to life", finale: "Your journey comes alive" },
    effects: "Sound effects", replay: "Replay celebration", skip: "Continue", milestones: "My milestones", goal: "Your next mission", skills: "Objectives assessed in this challenge", half: "You have passed at least half of this step’s exercises without displayed help.",
    proof: "This milestone recognises the assessed exercises, not certification or mastery of the whole language.", access: "This path guides learning. It does not purchase or unlock paid content.",
    final: "The journey challenges and final review are passed. Revisit situations needing practice before exploring another language.", local: "Milestones come from progress saved on this device.", unavailable: "Sound is unavailable here. The celebration remains visible.",
    explore: "Explore another language", recap: "Halfway checkpoint", challenge: "Final mission", retry: "Practise and retry as often as you need. No additional pass.",
  },
  es: {
    states: { locked: "Destino bloqueado", available: "Listo para explorar", progress: "Viaje en curso", completed: "Actividades terminadas · reto pendiente", mastered: "Reto dominado" },
    kinds: { unlock: "Se abre un nuevo camino", checkpoint: "Un paso importante", mastery: "El destino cobra vida", finale: "Tu viaje cobra vida" },
    effects: "Efectos de sonido", replay: "Repetir celebración", skip: "Continuar", milestones: "Mis logros", goal: "Tu próxima misión", skills: "Objetivos evaluados en este reto", half: "Has superado al menos la mitad de los ejercicios de esta etapa sin ayuda mostrada.",
    proof: "Este logro reconoce los ejercicios evaluados, no una certificación ni el dominio de toda la lengua.", access: "Este camino guía el aprendizaje. No compra ni desbloquea contenido de pago.",
    final: "Has superado los retos del recorrido y la evaluación final. Repasa las situaciones pendientes antes de explorar otro idioma.", local: "Los logros proceden del progreso guardado en este dispositivo.", unavailable: "El sonido no está disponible aquí. La celebración sigue visible.",
    explore: "Explorar otro idioma", recap: "Punto intermedio", challenge: "Misión final", retry: "Practica y reintenta las veces que necesites. Sin otro pase.",
  },
} as const;
