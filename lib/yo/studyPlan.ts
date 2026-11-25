import type { AdventureWorld } from "./adventure";
import { learningLanguageId, type YoLearningLanguage } from "./config/languages";
import { goalOptions, weeklyRhythm, type LearningProfile } from "./personalized/profile";
import type { YoLocale } from "./types";

export type StudyPreferences = Pick<LearningProfile, "goal" | "weeklyMinutes">;
type Text = Record<YoLocale, string>;
type StorageReader = Pick<Storage, "getItem">;
const text = (fr: string, en: string, es: string): Text => ({ fr, en, es });
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const introLanguages = { en: "en", fr: "fr-CA", es: "es", de: "de", pt: "pt-BR", ja: "ja", zh: "zh-Hans" } as const;

export const studyLanguageForWorld: Record<AdventureWorld, YoLearningLanguage> = {
  italian: "it", english: "en", french: "fr", spanish: "es", german: "de", portuguese: "pt", japanese: "ja", mandarin: "zh",
};

export function studyPreferenceSource(language: string) {
  const id = learningLanguageId(language);
  if (!id) return null;
  if (id === "it") return { id, language: "it", key: "yo.learning-profile.v1.it", epochKey: null };
  const sourceLanguage = introLanguages[id];
  return { id, language: sourceLanguage, key: `yo.shared-intro.v1.${sourceLanguage}`, epochKey: `yo.shared-intro.epoch.v1.${sourceLanguage}` };
}

export function studyPreferences(value: unknown): StudyPreferences | null {
  if (!object(value) || !goalOptions.includes(value.goal as StudyPreferences["goal"]) ||
    !Number.isInteger(value.weeklyMinutes) || typeof value.weeklyMinutes !== "number" ||
    (value.weeklyMinutes !== 0 && value.weeklyMinutes < 15) || value.weeklyMinutes > 1200) return null;
  return { goal: value.goal as StudyPreferences["goal"], weeklyMinutes: value.weeklyMinutes };
}

function resetStamp(value: unknown): { at: number; actor: string } | null {
  return object(value) && typeof value.at === "number" && Number.isSafeInteger(value.at) && value.at >= 0 && value.at <= Date.now() + 60000 &&
    typeof value.actor === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value.actor) ? { at: value.at, actor: value.actor } : null;
}

/** Read only goal and pace. Do not import course banks, interpret grades or write a migrated profile. */
export function readStudyPreferences(storage: StorageReader, language: string): StudyPreferences | null {
  const source = studyPreferenceSource(language);
  if (!source) return null;
  try {
    const raw = storage.getItem(source.key);
    if (!raw || raw.length > (source.id === "it" ? 4000 : 30000)) return null;
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.language !== source.language) return null;
    if (source.id === "it") return value.version === 1 ? studyPreferences(value) : null;
    if (value.version !== 1 && value.version !== 2 || !object(value.profile)) return null;
    const epochRaw = storage.getItem(source.epochKey!);
    if (epochRaw && epochRaw.length < 1000) {
      let epoch: unknown;
      try { epoch = JSON.parse(epochRaw); } catch { /* An invalid tombstone has no authority. */ }
      if (object(epoch) && epoch.version === 1 && epoch.language === source.language) {
        const reset = resetStamp(epoch.reset);
        const savedReset = object(value.sync) ? resetStamp(value.sync.reset) : null;
        const comparison = reset ? reset.at - (savedReset?.at ?? 0) || reset.actor.localeCompare(savedReset?.actor ?? "legacy") : 0;
        if (comparison > 0) return null;
      }
    }
    return studyPreferences({ goal: value.profile.goal, weeklyMinutes: value.profile.minutes });
  } catch { return null; }
}

export const studyGoalFocus: Record<StudyPreferences["goal"], Text> = {
  travel: text("Pour voyager : essaie de redire une phrase utile sans regarder.", "For travel: try saying a useful phrase without looking.", "Para viajar: intenta repetir una frase útil sin mirar."),
  family: text("Pour tes proches : reprends une phrase comme si tu leur parlais.", "For family and friends: try a phrase as if you were speaking to them.", "Para tus seres queridos: prueba una frase como si les hablaras."),
  work: text("Pour le travail ou les études : entraîne-toi à répondre clairement.", "For work or study: practise giving a clear reply.", "Para el trabajo o los estudios: practica una respuesta clara."),
  conversation: text("Pour converser : essaie de répondre avant d’afficher l’aide.", "For conversation: try replying before showing the help.", "Para conversar: intenta responder antes de mostrar la ayuda."),
  thorough: text("Pour approfondir : observe un exemple, puis crée ta propre phrase.", "For deeper learning: study an example, then make your own sentence.", "Para profundizar: observa un ejemplo y crea tu propia frase."),
};

export function studyPaceText(minutes: number): Text {
  const rhythm = weeklyRhythm(minutes);
  if (!rhythm) return text("À ton rythme, sans horaire imposé.", "At your pace, without a fixed schedule.", "A tu ritmo, sin horario fijo.");
  const { sessions, minutes: duration } = rhythm;
  return text(
    `Rythme proposé : ${sessions} séance${sessions > 1 ? "s" : ""} d’environ ${duration} min par semaine.`,
    `Suggested pace: ${sessions} session${sessions > 1 ? "s" : ""} of about ${duration} minutes per week.`,
    `Ritmo propuesto: ${sessions} ${sessions === 1 ? "sesión" : "sesiones"} de unos ${duration} minutos por semana.`,
  );
}
