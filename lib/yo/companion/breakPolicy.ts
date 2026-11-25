export interface BreakPolicy {
  questions: number;
  activeMs: number;
}
export const DEFAULT_BREAK_POLICY: BreakPolicy = {
  questions: 3,
  activeMs: 180_000,
};
export type BreakPhase = "lesson" | "break" | "return";
export const TRIVIA_HISTORY_KEY = "yopratiqo:companion-trivia:v1";
export function readTriviaHistory(raw: string | null, ids: string[]): string[] {
  if (!raw || raw.length > 20_000) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string => typeof id === "string" && ids.includes(id),
            ),
          ),
        ].slice(-ids.length)
      : [];
  } catch {
    return [];
  }
}

/** Tick explicitly before changing visibility. An injected monotonic clock makes background time testable. */
export class BreakSession {
  phase: BreakPhase = "lesson";
  completed = 0;
  activeMs = 0;
  private last: number;
  private active = false;
  private extraUntil: number | null = null;
  constructor(
    private readonly clock: () => number,
    private readonly policy = DEFAULT_BREAK_POLICY,
  ) {
    this.last = clock();
  }
  start() {
    this.phase = "break";
    this.completed = 0;
    this.activeMs = 0;
    this.extraUntil = null;
    this.last = this.clock();
    this.active = false;
  }
  tick() {
    const now = this.clock();
    if (this.active && this.phase === "break")
      this.activeMs += Math.max(0, now - this.last);
    this.last = now;
  }
  visible(active: boolean) {
    this.tick();
    this.active = active;
  }
  questionCompleted() {
    if (this.phase === "break") this.completed++;
  }
  afterExplanation(audioPlaying: boolean): BreakPhase {
    this.tick();
    const due =
      this.extraUntil === null
        ? this.completed >= this.policy.questions ||
          this.activeMs >= this.policy.activeMs
        : this.completed >= this.extraUntil;
    if (this.phase === "break" && due && !audioPlaying) this.phase = "return";
    return this.phase;
  }
  oneMore() {
    if (this.phase !== "return") return;
    this.extraUntil = this.completed + 1;
    this.phase = "break";
    this.last = this.clock();
  }
  returnToLesson() {
    this.tick();
    this.phase = "lesson";
    this.active = false;
  }
}

/** No repeats until the eligible pool is exhausted, including the cycle boundary. */
export function nextQuestion(
  ids: string[],
  seen: string[],
  previous?: string,
  random: () => number = Math.random,
): { id: string | null; seen: string[] } {
  const unique = [...new Set(ids)];
  let history = seen.filter((id) => unique.includes(id));
  let available = unique.filter((id) => !history.includes(id));
  if (!available.length) {
    history = [];
    available = unique.filter((id) => id !== previous || unique.length === 1);
  }
  const id =
    available[
      Math.min(
        available.length - 1,
        Math.max(0, Math.floor(random() * available.length)),
      )
    ] ?? null;
  return { id, seen: id ? [...history, id] : history };
}
