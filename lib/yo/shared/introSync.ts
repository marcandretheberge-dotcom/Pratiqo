import type { Answer, Draft, Exercise, IntroCourse, IntroProfile, IntroState } from "./types";
import { courseSteps } from "./steps";
import { emptyDraft, freshIntro, independentScore, introKey, introPassed, parseIntro } from "./state";

export const INTRO_SYNC_LIMIT = 30000;
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type Stamp = { at: number; actor: string };
type Cursor = Pick<IntroState, "view" | "resume" | "step">;
type Attempt = { run: Stamp; changed: Stamp; draft: Draft };
type FinalRun = { run: Stamp; answers: Answer[]; attempts: Record<string, Attempt> };
type Sync = {
  version: 1; revision: string; reset: Stamp; clock: number;
  profile: Stamp; cursor: Stamp; attempts: Record<string, Attempt>; final: FinalRun;
};
type Document = { state: IntroState; sync: Sync };
export interface IntroSyncSnapshot { state: IntroState; token: string; storageError: boolean; contentChanged: boolean }
export interface IntroSubmission { draft: Draft; before: Draft }
const ZERO: Stamp = { at: 0, actor: "legacy" };
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
const compare = (a: Stamp, b: Stamp) => a.at - b.at || a.actor.localeCompare(b.actor);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const cursorOf = (state: IntroState): Cursor => ({ view: state.view, resume: state.resume, step: state.step });
const ordered = <T,>(values: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
export const introEpochKey = (language: string) => "yo.shared-intro.epoch.v1." + language;

/** Content identity only; no access or certification decision uses this hash. */
export function introRevision(course: IntroCourse): string {
  const text = JSON.stringify([course.language, course.phrases, course.missions, course.final]);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

function stamp(value: unknown, now: number): Stamp | null {
  if (!object(value) || !integer(value.at, 0, now + 60000) || typeof value.actor !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value.actor)) return null;
  return { at: value.at, actor: value.actor };
}
function exerciseAt(course: IntroCourse, stepIndex: number): Exercise | undefined {
  const step = courseSteps(course)[stepIndex], mission = course.missions[step.mission];
  return step.kind === "exercise" ? mission.practice[step.index] : step.kind === "recall" ? mission.preparation[step.index - 1] : undefined;
}
function validDraft(value: unknown, exercise: Exercise, course: IntroCourse): Draft | null {
  if (!object(value) || !["checked", "correct", "assisted", "heard", "transcript"].every(key => typeof value[key] === "boolean") ||
    !(value.selected === null || typeof value.selected === "string" && exercise.options.includes(value.selected)) ||
    !Array.isArray(value.tiles) || value.tiles.length > 20 || new Set(value.tiles).size !== value.tiles.length) return null;
  const parts = exercise.kind === "order" ? course.phrases.find(phrase => phrase.id === exercise.answer)?.parts ?? [] : [];
  if (!value.tiles.every(index => integer(index, 0, parts.length - 1))) return null;
  return { selected: value.selected as string | null, tiles: [...value.tiles] as number[], checked: value.checked as boolean, correct: value.correct as boolean,
    assisted: Boolean(value.assisted || value.transcript), heard: value.heard as boolean, transcript: value.transcript as boolean };
}
function parseAttempt(value: unknown, exercise: Exercise, course: IntroCourse, now: number): Attempt | null {
  if (!object(value)) return null;
  const run = stamp(value.run, now), changed = stamp(value.changed, now), draft = validDraft(value.draft, exercise, course);
  return run && changed && draft ? { run, changed, draft } : null;
}
function allLessonExercises(course: IntroCourse): Exercise[] {
  return course.missions.flatMap(mission => [...mission.preparation, ...mission.practice]);
}
function legacyDocument(state: IntroState, course: IntroCourse): Document {
  state = { version: 2, language: course.language, profile: state.profile, ...cursorOf(state), finalIndex: state.finalIndex,
    draft: state.draft, completed: [...state.completed], visited: [...state.visited], answers: state.answers.map(answer => ({ correct: answer.correct, assisted: answer.assisted })), best: state.best };
  const sync: Sync = { version: 1, revision: introRevision(course), reset: ZERO, clock: 0, profile: ZERO, cursor: ZERO, attempts: {}, final: { run: ZERO, answers: state.answers.map(answer => ({ ...answer })), attempts: {} } };
  const inFinal = state.view === "final" || state.resume === "final";
  if (inFinal) sync.final.attempts[course.final[state.finalIndex].id] = { run: ZERO, changed: ZERO, draft: { ...state.draft, tiles: [...state.draft.tiles] } };
  else {
    const exercise = exerciseAt(course, state.step);
    if (exercise) sync.attempts[exercise.id] = { run: ZERO, changed: ZERO, draft: { ...state.draft, tiles: [...state.draft.tiles] } };
  }
  return { state, sync };
}
function freshDocument(course: IntroCourse, reset = ZERO): Document {
  const doc = legacyDocument(freshIntro(course), course);
  doc.sync.reset = reset; doc.sync.clock = reset.at;
  return doc;
}
function parseDocument(raw: string | null, course: IntroCourse, now: number): Document {
  const base = legacyDocument(parseIntro(raw, course), course);
  if (!raw || raw.length > INTRO_SYNC_LIMIT) return base;
  try {
    const value: unknown = JSON.parse(raw), input = object(value) ? value.sync : null;
    if (!object(input) || input.version !== 1 || typeof input.revision !== "string") return base;
    const reset = stamp(input.reset, now), profile = stamp(input.profile, now), cursor = stamp(input.cursor, now);
    if (!reset || !profile || !cursor || !integer(input.clock, 0, now + 60000)) return base;
    base.sync.reset = reset; base.sync.clock = input.clock; base.sync.profile = profile; base.sync.cursor = cursor;
    // Authored changes clear unfinished local answers; historical outcomes and the best score remain.
    if (input.revision !== base.sync.revision) {
      base.sync.attempts = {}; base.sync.final.attempts = {};
      if (base.sync.final.answers.length < course.final.length) {
        base.sync.final = { run: ZERO, answers: [], attempts: {} };
        base.state.answers = []; base.state.finalIndex = 0;
      }
      return base;
    }
    if (object(input.attempts)) {
      base.sync.attempts = {};
      for (const exercise of allLessonExercises(course)) {
        const attempt = Object.hasOwn(input.attempts, exercise.id) ? parseAttempt(input.attempts[exercise.id], exercise, course, now) : null;
        if (attempt) base.sync.attempts[exercise.id] = attempt;
      }
    }
    if (object(input.final)) {
      const run = stamp(input.final.run, now), answers = input.final.answers;
      if (run && Array.isArray(answers) && answers.length <= course.final.length && answers.every(answer => object(answer) && typeof answer.correct === "boolean" && typeof answer.assisted === "boolean") &&
        same(answers.map(answer => ({ correct: answer.correct, assisted: answer.assisted })), base.sync.final.answers)) {
        base.sync.final = { run, answers: answers.map(answer => ({ correct: answer.correct, assisted: answer.assisted })), attempts: {} };
        if (object(input.final.attempts)) for (const exercise of course.final) {
          const attempt = Object.hasOwn(input.final.attempts, exercise.id) ? parseAttempt(input.final.attempts[exercise.id], exercise, course, now) : null;
          if (attempt && compare(attempt.run, run) === 0) base.sync.final.attempts[exercise.id] = attempt;
        }
      }
    }
    base.sync.clock = Math.max(base.sync.clock, reset.at, profile.at, cursor.at, base.sync.final.run.at,
      ...Object.values(base.sync.attempts).flatMap(attempt => [attempt.run.at, attempt.changed.at]),
      ...Object.values(base.sync.final.attempts).flatMap(attempt => [attempt.run.at, attempt.changed.at]));
  } catch { /* Legacy parsing already supplied the safe fallback. */ }
  return base;
}
function mergeAttempt(a: Attempt, b: Attempt, assessment: boolean): Attempt {
  if (compare(a.run, b.run)) return compare(a.run, b.run) > 0 ? a : b;
  const latest = compare(a.changed, b.changed) || JSON.stringify(a.draft).localeCompare(JSON.stringify(b.draft));
  let winner = latest >= 0 ? a : b;
  if (assessment && (a.draft.checked || b.draft.checked)) {
    winner = !a.draft.checked ? b : !b.draft.checked ? a : a.draft.correct !== b.draft.correct ? (a.draft.correct ? b : a) : latest <= 0 ? a : b;
  } else if (a.draft.checked && a.draft.correct || b.draft.checked && b.draft.correct) {
    winner = a.draft.checked && a.draft.correct ? a : b;
  }
  return { ...winner, draft: { ...winner.draft, tiles: [...winner.draft.tiles], assisted: a.draft.assisted || b.draft.assisted || a.draft.transcript || b.draft.transcript ||
    (!assessment && (a.draft.checked && !a.draft.correct || b.draft.checked && !b.draft.correct)), heard: a.draft.heard || b.draft.heard, transcript: a.draft.transcript || b.draft.transcript } };
}
function mergeAttempts(a: Record<string, Attempt>, b: Record<string, Attempt>, assessment: boolean): Record<string, Attempt> {
  const result = { ...a };
  for (const [id, value] of Object.entries(b)) result[id] = Object.hasOwn(result, id) ? mergeAttempt(result[id], value, assessment) : value;
  return ordered(result);
}
function project(doc: Document, cursor: Cursor, course: IntroCourse): IntroState {
  const final = doc.sync.final, finalIndex = Math.min(final.answers.length, course.final.length - 1);
  const inFinal = cursor.view === "final" || cursor.resume === "final";
  const exercise = inFinal ? course.final[finalIndex] : exerciseAt(course, cursor.step);
  const attempt = exercise && (inFinal ? final.attempts[exercise.id] : doc.sync.attempts[exercise.id]);
  const state = { ...doc.state, ...cursor, version: 2 as const, language: course.language, finalIndex, answers: final.answers.map(answer => ({ ...answer })), draft: attempt?.draft ?? emptyDraft() };
  if (cursor.view === "final" && final.answers.length === course.final.length) { state.view = "result"; state.resume = null; }
  return state;
}
function mergeDocuments(a: Document, b: Document, course: IntroCourse): Document {
  if (compare(a.sync.reset, b.sync.reset)) return compare(a.sync.reset, b.sync.reset) > 0 ? a : b;
  const profile = (compare(a.sync.profile, b.sync.profile) || JSON.stringify(a.state.profile).localeCompare(JSON.stringify(b.state.profile))) >= 0 ? a : b;
  const cursor = (compare(a.sync.cursor, b.sync.cursor) || JSON.stringify(cursorOf(a.state)).localeCompare(JSON.stringify(cursorOf(b.state)))) >= 0 ? a : b;
  const final = compare(a.sync.final.run, b.sync.final.run) >= 0 ? a.sync.final : b.sync.final;
  let mergedFinal: FinalRun = final;
  if (!compare(a.sync.final.run, b.sync.final.run)) {
    const answers = Array.from({ length: Math.max(a.sync.final.answers.length, b.sync.final.answers.length) }, (_, index) => {
      const left = a.sync.final.answers[index], right = b.sync.final.answers[index];
      return { correct: left && right ? left.correct && right.correct : (left ?? right).correct, assisted: !!(left?.assisted || right?.assisted) };
    });
    mergedFinal = { run: final.run, answers, attempts: mergeAttempts(a.sync.final.attempts, b.sync.final.attempts, true) };
    for (let index = 0; index < answers.length; index++) {
      const attempt = mergedFinal.attempts[course.final[index].id];
      if (attempt?.draft.checked) { answers[index].correct &&= attempt.draft.correct; answers[index].assisted ||= attempt.draft.assisted; }
    }
  }
  const order = courseSteps(course).map(step => step.id), completed = new Set([...a.state.completed, ...b.state.completed]), visited = new Set([...a.state.visited, ...b.state.visited]);
  return { state: { ...cursor.state, profile: profile.state.profile, completed: order.filter(id => completed.has(id)), visited: order.filter(id => visited.has(id)), best: Math.max(a.state.best, b.state.best) },
    sync: { ...a.sync, clock: Math.max(a.sync.clock, b.sync.clock), profile: profile.sync.profile, cursor: cursor.sync.cursor, attempts: mergeAttempts(a.sync.attempts, b.sync.attempts, false), final: mergedFinal } };
}
function encode(doc: Document, course: IntroCourse): string {
  const state = project(doc, cursorOf(doc.state), course);
  return JSON.stringify({ ...state, sync: { ...doc.sync, attempts: ordered(doc.sync.attempts), final: { ...doc.sync.final, attempts: ordered(doc.sync.final.attempts) } } });
}
function actorId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "tab-" + Math.random().toString(36).slice(2);
}

/** Local evidence only. Restoration and reconciliation never call scoring, feedback, or SRS services. */
export function createIntroSyncStore(course: IntroCourse, storage: () => StorageLike | null = () => typeof window === "undefined" ? null : window.localStorage, clock = () => Date.now(), actor = actorId()) {
  const key = introKey(course.language), epochKey = introEpochKey(course.language), steps = courseSteps(course), listeners = new Set<() => void>();
  let doc: Document | null = null, localCursor: Cursor | null = null, snapshot: IntroSyncSnapshot | null = null, storageError = false, observedPresent = false;
  let observedRevision: string | null = null, invalidated = false;
  function currentRevision(raw: string | null): boolean {
    if (invalidated) return false;
    let revision = "";
    if (raw && raw.length <= INTRO_SYNC_LIMIT) try {
      const value: unknown = JSON.parse(raw);
      if (object(value) && value.language === course.language && object(value.sync) && value.sync.version === 1 && typeof value.sync.revision === "string" && value.sync.revision.length <= 80) revision = value.sync.revision;
    } catch { /* The bounded parser handles invalid data. */ }
    if (observedRevision === null) observedRevision = revision;
    if (revision && revision !== introRevision(course) && revision !== observedRevision) invalidated = true;
    return !invalidated;
  }
  const nextStamp = (): Stamp => ({ at: Math.max(clock(), (doc?.sync.clock ?? 0) + 1, 1), actor });
  const token = (state: IntroState, current: Document) => {
    const inFinal = state.view === "final" || state.resume === "final", exercise = inFinal ? course.final[state.finalIndex] : exerciseAt(course, state.step);
    const run = inFinal ? current.sync.final.run : exercise ? current.sync.attempts[exercise.id]?.run ?? ZERO : ZERO;
    return JSON.stringify([course.language, current.sync.revision, current.sync.reset, inFinal ? "final" : "lesson", exercise?.id ?? steps[state.step].id, run]);
  };
  function read(): Document | null {
    try {
      const target = storage(); if (!target) { storageError = true; return null; }
      const raw = target.getItem(key), epochRaw = target.getItem(epochKey);
      if (!currentRevision(raw)) { storageError = true; return null; }
      let epoch = ZERO;
      if (epochRaw && epochRaw.length < 1000) { try { const value = JSON.parse(epochRaw); if (value?.version === 1 && value.language === course.language) epoch = stamp(value.reset, clock()) ?? ZERO; } catch { /* Ignore malformed tombstones. */ } }
      if (raw === null && observedPresent && doc && compare(epoch, doc.sync.reset) <= 0) {
        epoch = nextStamp();
        target.setItem(epochKey, JSON.stringify({ version: 1, language: course.language, reset: epoch }));
      }
      observedPresent = raw !== null;
      const remote = parseDocument(raw, course, clock());
      storageError = false;
      return compare(epoch, remote.sync.reset) > 0 ? freshDocument(course, epoch) : remote;
    } catch { storageError = true; return null; }
  }
  function refreshSnapshot() {
    const current = doc!, state = project(current, localCursor!, course);
    const next = { state, token: token(state, current), storageError, contentChanged: invalidated };
    if (!snapshot || !same(snapshot, next)) snapshot = next;
  }
  function initialize() {
    if (doc) return;
    doc = read() ?? freshDocument(course);
    localCursor = cursorOf(doc.state);
    if (localCursor.view === "lesson" || localCursor.view === "final") localCursor = { ...localCursor, resume: localCursor.view, view: "map" };
    refreshSnapshot();
  }
  const emit = () => listeners.forEach(listener => listener());
  function persist(): boolean {
    try {
      const target = storage(), raw = encode(doc!, course);
      if (target && !currentRevision(target.getItem(key))) { storageError = true; refreshSnapshot(); emit(); return false; }
      if (!target || raw.length > INTRO_SYNC_LIMIT) throw new Error("Intro storage unavailable");
      target.setItem(key, raw); observedPresent = true; observedRevision = introRevision(course); storageError = false;
    } catch { storageError = true; }
    refreshSnapshot(); emit();
    return true;
  }
  function synchronize() {
    initialize();
    const remote = read();
    if (!remote) { refreshSnapshot(); emit(); return; }
    const before = doc!, merged = mergeDocuments(before, remote, course);
    doc = merged;
    if (compare(merged.sync.reset, before.sync.reset) > 0) localCursor = cursorOf(merged.state);
    else if (localCursor!.view === "map" && compare(merged.sync.cursor, before.sync.cursor) > 0 || localCursor!.view === "result" && compare(merged.sync.final.run, before.sync.final.run) > 0) {
      const cursor = cursorOf(merged.state);
      localCursor = { ...cursor, view: "map", resume: cursor.view === "final" || cursor.view === "lesson" ? cursor.view : cursor.resume };
    }
    refreshSnapshot();
    // Repair only a real union of two stored histories; hydration itself does not rewrite data.
    if (!same(encode(merged, course), encode(remote, course))) persist();
    else emit();
  }
  function updateCursor(cursor: Cursor, at: Stamp) {
    localCursor = cursor; doc!.state = { ...doc!.state, ...cursor }; doc!.sync.cursor = at;
  }
  function changed(at: Stamp) { doc!.sync.clock = Math.max(doc!.sync.clock, at.at); return persist(); }
  function current(expected: string) {
    synchronize(); return !invalidated && snapshot!.token === expected ? snapshot!.state : null;
  }
  function putAttempt(state: IntroState, attempt: Attempt) {
    if (state.view === "final" || state.resume === "final") doc!.sync.final.attempts[course.final[state.finalIndex].id] = attempt;
    else { const exercise = exerciseAt(course, state.step); if (exercise) doc!.sync.attempts[exercise.id] = attempt; }
  }
  function currentAttempt(state: IntroState): Attempt | null {
    const final = state.view === "final" || state.resume === "final", exercise = final ? course.final[state.finalIndex] : exerciseAt(course, state.step);
    if (!exercise) return null;
    return (final ? doc!.sync.final.attempts[exercise.id] : doc!.sync.attempts[exercise.id]) ?? { run: final ? doc!.sync.final.run : ZERO, changed: ZERO, draft: emptyDraft() };
  }
  function startRun(at: Stamp) {
    doc!.sync.final = { run: at, answers: [], attempts: {} };
    updateCursor({ view: "final", resume: "final", step: localCursor!.step }, at);
  }
  return {
    getSnapshot(): IntroSyncSnapshot { initialize(); return snapshot!; },
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
        if (event.key === null || event.key === key || event.key === epochKey) synchronize();
      };
      const onFocus = () => synchronize();
      if (typeof window !== "undefined") { window.addEventListener("storage", onStorage); window.addEventListener("focus", onFocus); }
      return () => { listeners.delete(listener); if (typeof window !== "undefined") { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", onFocus); } };
    },
    synchronize,
    move(index: number) {
      synchronize(); if (invalidated || !integer(index, 0, steps.length - 1)) return;
      const at = nextStamp(); updateCursor({ view: "lesson", resume: "lesson", step: index }, at); changed(at);
    },
    leave() {
      synchronize(); if (invalidated) return; const state = snapshot!.state, at = nextStamp();
      updateCursor({ view: "map", resume: state.view === "final" ? "final" : state.view === "lesson" ? "lesson" : state.resume, step: state.step }, at); changed(at);
    },
    map() { synchronize(); if (invalidated) return; const at = nextStamp(); updateCursor({ view: "map", resume: null, step: localCursor!.step }, at); changed(at); },
    resume() {
      synchronize(); if (invalidated) return; const state = snapshot!.state, at = nextStamp();
      const step = state.resume ? state.step : Math.max(0, steps.findIndex(item => item.mission === (state.profile?.entry ?? 0)));
      updateCursor({ view: state.resume ?? "lesson", resume: state.resume ?? "lesson", step }, at); changed(at);
    },
    profile(profile: IntroProfile) {
      synchronize(); if (invalidated) return; const state = snapshot!.state, at = nextStamp();
      const step = state.profile?.entry === profile.entry ? state.step : Math.max(0, steps.findIndex(item => item.mission === profile.entry));
      doc!.state.profile = profile; doc!.sync.profile = at;
      updateCursor({ view: "map", resume: state.profile?.entry === profile.entry ? state.resume : "lesson", step }, at); changed(at);
    },
    startFinal() { synchronize(); if (invalidated) return; const at = nextStamp(); startRun(at); changed(at); },
    restart(expected: string) {
      const state = current(expected); if (!state || state.view !== "lesson") return false;
      const attempt = currentAttempt(state); if (!attempt) return false;
      const at = nextStamp(); putAttempt(state, { run: at, changed: at, draft: emptyDraft() }); return changed(at);
    },
    edit(expected: string, next: Draft, submission?: IntroSubmission): Draft | null {
      const state = current(expected); if (!state || state.view !== "lesson" && state.view !== "final") return null;
      const attempt = currentAttempt(state); if (!attempt) return null;
      const assessment = state.view === "final" || state.resume === "final", exercise = assessment ? course.final[state.finalIndex] : exerciseAt(course, state.step)!;
      const draft = validDraft(next, exercise, course); if (!draft) return null;
      if (attempt.draft.checked && (assessment || attempt.draft.correct)) return null;
      if (submission && exercise.kind === "order" && !same(submission.before.tiles, attempt.draft.tiles)) return null;
      if (submission && attempt.draft.checked && attempt.draft.selected === draft.selected && same(attempt.draft.tiles, draft.tiles)) return null;
      const at = nextStamp();
      draft.assisted ||= attempt.draft.assisted || attempt.draft.transcript || (!assessment && (attempt.draft.checked && !attempt.draft.correct || draft.checked && !draft.correct));
      draft.heard ||= attempt.draft.heard; draft.transcript ||= attempt.draft.transcript;
      putAttempt(state, { run: attempt.run, changed: at, draft }); return changed(at) ? draft : null;
    },
    advance(expected: string): { accepted: boolean; mission: number | null } {
      const state = current(expected); if (!state || state.view !== "lesson") return { accepted: false, mission: null };
      const step = steps[state.step], exercise = exerciseAt(course, state.step);
      if (exercise && (!state.draft.checked || !state.draft.correct)) return { accepted: false, mission: null };
      const before = new Set(doc!.state.completed), at = nextStamp();
      doc!.state.visited = [...new Set([...doc!.state.visited, step.id])];
      if (exercise) doc!.state.completed = [...new Set([...doc!.state.completed, step.id])];
      const boundary = state.step === steps.length - 1 || steps[state.step + 1].mission !== step.mission;
      const mission = boundary && course.missions[step.mission].practice.every(item => doc!.state.completed.includes(item.id)) && !course.missions[step.mission].practice.every(item => before.has(item.id)) ? step.mission : null;
      if (state.step === steps.length - 1) startRun(at);
      else updateCursor({ view: "lesson", resume: "lesson", step: state.step + 1 }, at);
      return changed(at) ? { accepted: true, mission } : { accepted: false, mission: null };
    },
    nextFinal(expected: string): { accepted: boolean; firstPass: boolean } {
      const state = current(expected); if (!state || state.view !== "final" || !state.draft.checked || doc!.sync.final.answers.length !== state.finalIndex) return { accepted: false, firstPass: false };
      const at = nextStamp(), wasPassed = introPassed(course, doc!.state);
      doc!.sync.final.answers.push({ correct: state.draft.correct, assisted: state.draft.assisted });
      let firstPass = false;
      if (doc!.sync.final.answers.length === course.final.length) {
        const score = independentScore(doc!.sync.final.answers); doc!.state.best = Math.max(doc!.state.best, score);
        firstPass = !wasPassed && introPassed(course, doc!.state);
        updateCursor({ view: "result", resume: null, step: state.step }, at);
      }
      return changed(at) ? { accepted: true, firstPass } : { accepted: false, firstPass: false };
    },
    reset() {
      synchronize(); if (invalidated) return; const at = nextStamp();
      try { const target = storage(); if (!target) throw new Error("Intro storage unavailable"); target.setItem(epochKey, JSON.stringify({ version: 1, language: course.language, reset: at })); }
      catch { storageError = true; }
      doc = freshDocument(course, at); localCursor = cursorOf(doc.state); changed(at);
    },
  };
}
