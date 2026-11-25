import { emptyProgress, MANDARIN_PROGRESS_LIMIT, validMandarinActor } from "./progress";
import type { Attempt, AttemptCounter, Progress, ProgressStamp, ProgressSync } from "./types";

const ZERO: ProgressStamp = [0, ""];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const stamp = (value: Progress, field: string): ProgressStamp => value.sync?.marks[field] ?? ZERO;
const compare = (a: ProgressStamp, b: ProgressStamp) => a[0] - b[0] || a[1].localeCompare(b[1]);
const epoch = (value: Progress): ProgressStamp => [value.resetAt ?? 0, value.resetBy ?? ""];
export const sameMandarinEpoch = (a: Progress, b: Progress) => compare(epoch(a), epoch(b)) === 0;
const keys = (...values: Record<string, unknown>[]) => [...new Set(values.flatMap(value => Object.keys(value)))].sort();

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, ordered(item)]));
  return value;
}
export const mandarinSnapshot = (value: unknown) => JSON.stringify(ordered(value)) ?? "undefined";
const same = (a: unknown, b: unknown) => mandarinSnapshot(a) === mandarinSnapshot(b);

function pick<T>(left: Progress, right: Progress, field: string, a: T, b: T): T {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const order = compare(stamp(left, field), stamp(right, field));
  return order > 0 ? a : order < 0 ? b : mandarinSnapshot(a) >= mandarinSnapshot(b) ? a : b;
}
const total = (counter: AttemptCounter) => Math.min(999, counter.base + Object.values(counter.actors).reduce((sum, count) => sum + count, 0));

function mergeCounter(left: Progress, right: Progress, id: string): AttemptCounter | undefined {
  const a = left.sync?.attempts[id], b = right.sync?.attempts[id];
  if (!a && !b) return;
  const counter: AttemptCounter = { base: Math.max(a?.base ?? 0, b?.base ?? 0), actors: {} };
  for (const actor of keys(a?.actors ?? {}, b?.actors ?? {})) counter.actors[actor] = Math.max(a?.actors[actor] ?? 0, b?.actors[actor] ?? 0);
  // A legacy snapshot has an aggregate, not another independent batch of attempts.
  const legacy = Math.max(!a ? left.results[id]?.attempts ?? 0 : 0, !b ? right.results[id]?.attempts ?? 0 : 0);
  counter.base += Math.max(0, legacy - total(counter));
  return counter;
}

function mergeDraft(left: Progress, right: Progress, id: string): Attempt {
  const a = left.drafts[id], b = right.drafts[id];
  if (!a) return { ...b, heard: false };
  if (!b) return copy(a);
  const generation = (a.generation ?? 0) - (b.generation ?? 0);
  const selected = generation > 0 ? a : generation < 0 ? b : a.checked !== b.checked ? a.checked ? a : b : pick(left, right, `d:${id}`, a, b);
  const sameRun = (a.generation ?? 0) === (b.generation ?? 0);
  return {
    ...copy(selected),
    assisted: sameRun ? a.assisted || b.assisted : selected.assisted,
    hint: sameRun ? a.hint || b.hint : selected.hint,
    // Playback evidence belongs to this mounted document, never another tab.
    heard: a.heard && (a.generation ?? 0) === (selected.generation ?? 0) && same(a.answer, selected.answer),
  };
}

/** Commutative durable facts; a reset epoch dominates every older snapshot. */
export function mergeMandarinProgress(left: Progress, right: Progress): Progress {
  const epochOrder = compare(epoch(left), epoch(right));
  if (epochOrder) return copy(epochOrder > 0 ? left : right);
  const merged = emptyProgress();
  if (left.resetAt) { merged.resetAt = left.resetAt; merged.resetBy = left.resetBy ?? ""; }
  const sync: ProgressSync = { clock: Math.max(left.sync?.clock ?? 0, right.sync?.clock ?? 0), marks: {}, attempts: {} };
  for (const key of keys(left.sync?.marks ?? {}, right.sync?.marks ?? {})) sync.marks[key] = copy(compare(stamp(left, key), stamp(right, key)) >= 0 ? stamp(left, key) : stamp(right, key));
  merged.unit = pick(left, right, "unit", left.unit, right.unit);
  merged.pinyin = pick(left, right, "pinyin", left.pinyin, right.pinyin);
  merged.translation = pick(left, right, "translation", left.translation, right.translation);
  merged.trivia = Math.max(left.trivia, right.trivia);
  for (const id of keys(left.steps, right.steps)) merged.steps[id] = pick(left, right, `s:${id}`, left.steps[id], right.steps[id]);
  for (const id of keys(left.selfAssessment, right.selfAssessment)) merged.selfAssessment[id] = pick(left, right, `a:${id}`, left.selfAssessment[id], right.selfAssessment[id]);
  for (const id of keys(left.drafts, right.drafts)) merged.drafts[id] = mergeDraft(left, right, id);
  for (const id of keys(left.results, right.results)) {
    const a = left.results[id], b = right.results[id], counter = mergeCounter(left, right, id);
    if (counter) sync.attempts[id] = counter;
    const passed = Boolean(a?.passed || b?.passed);
    merged.results[id] = {
      passed,
      independent: passed && Boolean(a?.independent || b?.independent),
      attempts: counter ? total(counter) : Math.max(a?.attempts ?? 0, b?.attempts ?? 0),
      review: pick(left, right, `r:${id}`, a?.review, b?.review) ?? true,
    };
  }
  if (left.sync || right.sync) merged.sync = sync;
  return merged;
}

/** Apply only the user's changed fields after merging storage, retaining other tabs' work. */
export function stampMandarinUpdate(current: Progress, candidate: Progress, source: Progress, actor: string): Progress {
  if (!validMandarinActor(actor)) throw new Error("Invalid Mandarin progress actor");
  if (!sameMandarinEpoch(current, source)) return current;
  const next = copy(current);
  const sync: ProgressSync = next.sync ?? { clock: 0, marks: {}, attempts: {} };
  const revision: ProgressStamp = [Math.max(Date.now(), sync.clock + 1, (source.sync?.clock ?? 0) + 1), actor];
  let changed = false;
  const mark = (field: string) => { sync.marks[field] = revision; changed = true; };
  for (const field of ["unit", "pinyin", "translation"] as const) if (!same(candidate[field], source[field])) {
    if (field === "unit") next.unit = candidate.unit;
    else next[field] = candidate[field];
    mark(field);
  }
  if (candidate.trivia !== source.trivia) { next.trivia = Math.min(100_000, Math.max(current.trivia, current.trivia + candidate.trivia - source.trivia)); mark("trivia"); }
  for (const id of Object.keys(candidate.steps)) if (candidate.steps[id] !== source.steps[id]) { next.steps[id] = candidate.steps[id]; mark(`s:${id}`); }
  for (const id of Object.keys(candidate.selfAssessment)) if (candidate.selfAssessment[id] !== source.selfAssessment[id]) { next.selfAssessment[id] = candidate.selfAssessment[id]; mark(`a:${id}`); }
  for (const id of Object.keys(candidate.drafts)) if (!same(candidate.drafts[id], source.drafts[id])) {
    const draft = candidate.drafts[id], existing = current.drafts[id];
    const sameRun = existing && (existing.generation ?? 0) === (draft.generation ?? 0);
    next.drafts[id] = { ...copy(draft), assisted: draft.assisted || Boolean(sameRun && existing.assisted), hint: draft.hint || Boolean(sameRun && existing.hint) };
    if (existing && (existing.generation ?? 0) > (draft.generation ?? 0)) next.drafts[id] = copy(existing);
    else if (sameRun && existing.checked && !draft.checked) next.drafts[id] = { ...copy(existing), assisted: existing.assisted || draft.assisted, hint: existing.hint || draft.hint };
    mark(`d:${id}`);
  }
  for (const id of Object.keys(candidate.results)) if (!same(candidate.results[id], source.results[id])) {
    const result = candidate.results[id], existing = current.results[id];
    const added = Math.max(0, result.attempts - (source.results[id]?.attempts ?? 0));
    const counter: AttemptCounter = copy(sync.attempts[id] ?? { base: existing?.attempts ?? 0, actors: {} });
    if (added && total(counter) < 999) counter.actors[actor] = Math.min(999, (counter.actors[actor] ?? 0) + added);
    sync.attempts[id] = counter;
    const passed = Boolean(existing?.passed || result.passed);
    next.results[id] = { passed, independent: passed && Boolean(existing?.independent || result.independent), attempts: total(counter), review: result.review };
    mark(`r:${id}`);
  }
  if (!changed) return current;
  sync.clock = revision[0];
  next.sync = sync;
  return next;
}

export function resetMandarinProgress(current: Progress, actor: string, now = Date.now()): Progress {
  if (!validMandarinActor(actor)) throw new Error("Invalid Mandarin progress actor");
  const resetAt = Math.max(now, (current.resetAt ?? 0) + 1, (current.sync?.clock ?? 0) + 1);
  return { ...emptyProgress(), resetAt, resetBy: actor, sync: { clock: resetAt, marks: {}, attempts: {} } };
}

export function serializeMandarinProgress(value: Progress): string | null {
  const serialized = mandarinSnapshot({ ...value, drafts: Object.fromEntries(Object.entries(value.drafts).map(([id, draft]) => [id, { ...draft, heard: false }])) });
  return serialized.length <= MANDARIN_PROGRESS_LIMIT ? serialized : null;
}
