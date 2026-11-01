export const ITALIAN_PROGRESS_KEY = "yopratiqo:italian-bologna-a1:v1";

export interface ItalianActivityResult {
  attempts: number;
  completed: boolean;
  independent: boolean;
}

export interface ItalianModuleProgress {
  version: 1;
  resetAt: number;
  updatedAt: number;
  currentStep: string;
  results: Record<string, ItalianActivityResult>;
}

export const emptyItalianProgress = (resetAt = 0): ItalianModuleProgress => ({
  version: 1, resetAt, updatedAt: resetAt, currentStep: "welcome", results: {},
});

export function parseItalianProgress(raw: string | null, activityIds: readonly string[], stepIds: readonly string[]): ItalianModuleProgress {
  const empty = emptyItalianProgress();
  if (!raw || raw.length > 30000) return empty;
  try {
    const input: unknown = JSON.parse(raw);
    if (!input || typeof input !== "object") return empty;
    const record = input as Record<string, unknown>;
    if (record.version !== 1) return empty;
    const stamp = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Date.now() + 60000 ? value : 0;
    const resetAt = stamp(record.resetAt);
    const results: Record<string, ItalianActivityResult> = {};
    const candidates = record.results;
    if (candidates && typeof candidates === "object" && !Array.isArray(candidates)) {
      for (const id of activityIds) {
        if (!Object.prototype.hasOwnProperty.call(candidates, id)) continue;
        const value = (candidates as Record<string, unknown>)[id];
        if (!value || typeof value !== "object") continue;
        const result = value as Record<string, unknown>;
        if (typeof result.attempts !== "number" || !Number.isInteger(result.attempts) || result.attempts < 1) continue;
        results[id] = { attempts: Math.min(result.attempts, 100000), completed: result.completed === true, independent: result.completed === true && result.independent === true };
      }
    }
    return { version: 1, resetAt, updatedAt: Math.max(resetAt, stamp(record.updatedAt)), currentStep: typeof record.currentStep === "string" && stepIds.includes(record.currentStep) ? record.currentStep : "welcome", results };
  } catch { return empty; }
}

export function mergeItalianProgress(left: ItalianModuleProgress, right: ItalianModuleProgress): ItalianModuleProgress {
  if (left.resetAt !== right.resetAt) return left.resetAt > right.resetAt ? left : right;
  const newest = right.updatedAt > left.updatedAt ? right : left;
  const results = { ...left.results };
  for (const [id, incoming] of Object.entries(right.results)) {
    const current = results[id];
    results[id] = current ? {
      attempts: Math.max(current.attempts, incoming.attempts),
      completed: current.completed || incoming.completed,
      independent: current.independent || incoming.independent,
    } : incoming;
  }
  return { ...newest, results };
}

export function recordItalianAttempt(progress: ItalianModuleProgress, id: string, correct: boolean, assisted: boolean, now = Date.now()): ItalianModuleProgress {
  const previous = progress.results[id] ?? { attempts: 0, completed: false, independent: false };
  return { ...progress, updatedAt: Math.max(now, progress.updatedAt + 1), results: { ...progress.results, [id]: {
    attempts: Math.min(previous.attempts + 1, 100000),
    completed: previous.completed || correct,
    independent: previous.independent || (correct && !assisted),
  } } };
}
