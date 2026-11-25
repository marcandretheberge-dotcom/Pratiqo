import { interestIds, type InterestId, type InterestLanguage } from "./preferences";
export type InterestSession = {
  version: 1; language: InterestLanguage; interest: InterestId; runId: string; attempt: number;
  step: number; assisted: boolean[]; correct: boolean[];
};
export type InterestProgress = { version: 1; attempts: Partial<Record<InterestId, number>>; session: InterestSession | null };
export const interestProgressKey = (language: InterestLanguage) => `yo.interest-practice.v1.${language}`;
export function emptyInterestProgress(): InterestProgress { return { version: 1, attempts: {}, session: null }; }
export function parseInterestProgress(raw: string | null, language: InterestLanguage): InterestProgress {
  const empty = emptyInterestProgress();
  if (!raw || raw.length > 5000) return empty;
  try {
    const p = JSON.parse(raw);
    if (!p || p.version !== 1 || !p.attempts || typeof p.attempts !== "object" || Array.isArray(p.attempts)) return empty;
    for (const id of interestIds) {
      const n = p.attempts[id];
      if (Number.isSafeInteger(n) && n >= 0 && n <= 1000000) empty.attempts[id] = n;
    }
    const s = p.session;
    if (s && s.version === 1 && s.language === language && interestIds.includes(s.interest) &&
      typeof s.runId === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(s.runId) &&
      Number.isSafeInteger(s.attempt) && s.attempt >= 0 && s.attempt <= 1000000 &&
      Number.isInteger(s.step) && s.step >= 0 && s.step <= 6 &&
      [s.assisted, s.correct].every(a => Array.isArray(a) && a.length === 4 && a.every(v => typeof v === "boolean"))) {
      empty.session = { version: 1, language, interest: s.interest, runId: s.runId, attempt: s.attempt, step: s.step, assisted: s.assisted, correct: s.correct };
    }
    return empty;
  } catch { return empty; }
}
export function newInterestSession(language: InterestLanguage, interest: InterestId, attempt: number): InterestSession {
  return { version: 1, language, interest, runId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, attempt, step: 0, assisted: [false, false, false, false], correct: [false, false, false, false] };
}
export const interestReviewId = (interest: InterestId, step: number) => `interest:${interest}:${["venue", "direction", "recall", "transfer"][step - 2]}`;
