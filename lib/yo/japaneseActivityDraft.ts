import type { JapaneseActivity } from "./japaneseCourseTypes";
import { checkJapaneseAnswer, type JapaneseAnswer } from "./japaneseCourseProgress";
import { exerciseDraftRevision } from "./foundations/typedDraft";
import { readJapaneseSession, type JapaneseLocalStorage } from "./japaneseSession";

export const JAPANESE_DRAFT_LIMIT = 40000;
export const JAPANESE_ANSWER_LIMIT = 100;
export const japaneseActivityDraftKey = (unitId: string) => `yopratiqo:japanese-activity-drafts:v1:${unitId}`;
export const japaneseActivityRevision = (activities: readonly JapaneseActivity[]) => exerciseDraftRevision(activities);
export interface JapaneseActivityState {
  answer: JapaneseAnswer; checked: boolean; correct: boolean; assisted: boolean;
  showHint: boolean; showTranscript: boolean; matchLeft: string | null; revision: number;
}
export function initialJapaneseActivityState(activity: JapaneseActivity, revision = 0): JapaneseActivityState {
  return { answer: activity.kind === "build" ? [] : activity.kind === "match" ? {} : "", checked: false, correct: false,
    assisted: false, showHint: false, showTranscript: false, matchLeft: null, revision };
}
type Stamp = { at: number; actor: string };
type Entry = { run: Stamp; changed: Stamp; checkedAt?: Stamp; state: JapaneseActivityState };
type DraftDocument = { version: 1; unit: string; revision: string; epoch: string; cleared: Stamp; entries: Record<string, Entry> };
export interface JapaneseDraftSnapshot {
  ready: boolean; states: Record<string, JapaneseActivityState>; tokens: Record<string, string>;
  epoch: string; storageError: boolean; contentChanged: boolean;
}
const ZERO: Stamp = { at: 0, actor: "initial" };
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const compare = (left: Stamp, right: Stamp) => left.at - right.at || left.actor.localeCompare(right.actor);
const integer = (value: unknown, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
function stamp(value: unknown, now: number): Stamp | null {
  return object(value) && integer(value.at, now + 60000) && typeof value.actor === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value.actor)
    ? { at: value.at, actor: value.actor } : null;
}
function validAnswer(value: unknown, activity: JapaneseActivity): JapaneseAnswer | null {
  if (activity.kind === "reading") return typeof value === "string" && value.length <= JAPANESE_ANSWER_LIMIT ? value : null;
  if (activity.kind === "build") return Array.isArray(value) && value.length <= 20 && new Set(value).size === value.length &&
    value.every(id => activity.tokens.some(token => token.id === id)) ? [...value] as string[] : null;
  if (activity.kind === "match") {
    if (!object(value) || Object.keys(value).length > activity.pairs.length) return null;
    const ids = activity.pairs.map(pair => pair.id);
    if (!Object.entries(value).every(([id, answer]) => ids.includes(id) && typeof answer === "string" && ids.includes(answer))) return null;
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) as Record<string, string>;
  }
  return typeof value === "string" && (value === "" || activity.choices.some(choice => choice.id === value)) ? value : null;
}
function validState(value: unknown, activity: JapaneseActivity): JapaneseActivityState | null {
  if (!object(value) || !["checked", "correct", "assisted", "showHint", "showTranscript"].every(key => typeof value[key] === "boolean") || !integer(value.revision, 1000000)) return null;
  const answer = validAnswer(value.answer, activity);
  if (answer === null || !(value.matchLeft === null || activity.kind === "match" && activity.pairs.some(pair => pair.id === value.matchLeft))) return null;
  return { answer, checked: value.checked as boolean, correct: Boolean(value.checked && value.correct),
    assisted: Boolean(value.assisted || !value.checked && (value.showHint || value.showTranscript)), showHint: value.showHint as boolean,
    showTranscript: Boolean(activity.kind === "listening" && value.showTranscript), matchLeft: value.matchLeft as string | null, revision: value.revision };
}
function answerReady(activity: JapaneseActivity, answer: JapaneseAnswer) {
  return activity.kind === "build" ? Array.isArray(answer) && answer.length === activity.answerOrder.length :
    activity.kind === "match" ? object(answer) && activity.pairs.every(pair => answer[pair.id]) : typeof answer === "string" && answer.trim().length > 0;
}
function mergeEntry(a: Entry, b: Entry): Entry {
  if (compare(a.run, b.run)) return compare(a.run, b.run) > 0 ? a : b;
  const latest = compare(a.changed, b.changed) || JSON.stringify(a.state).localeCompare(JSON.stringify(b.state));
  const recent = latest >= 0 ? a : b;
  let winner = recent;
  // The first accepted check is immutable until an explicit new attempt.
  if (a.state.checked || b.state.checked) winner = !a.state.checked ? b : !b.state.checked ? a : compare(a.checkedAt ?? a.changed, b.checkedAt ?? b.changed) <= 0 ? a : b;
  return { ...winner, changed: recent.changed, state: { ...winner.state,
    showHint: recent.state.showHint, showTranscript: recent.state.showTranscript, assisted: a.state.assisted || b.state.assisted } };
}

/** No result ledger, review queue, audio evidence, or provider is touched here. */
export function createJapaneseActivityDraftStore(unit: string, activities: readonly JapaneseActivity[],
  storage: () => JapaneseLocalStorage | null = () => typeof window === "undefined" ? null : window.localStorage,
  clock = () => Date.now(), actor = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "tab-" + Math.random().toString(36).slice(2)) {
  const revision = japaneseActivityRevision(activities), key = japaneseActivityDraftKey(unit);
  const byId = new Map(activities.map(activity => [activity.id, activity]));
  if (!/^jp[-a-z0-9]{1,100}$/.test(unit) || activities.length > 40 || byId.size !== activities.length) throw new Error("Invalid Japanese draft scope");
  const empty = (epoch = "", cleared = ZERO): DraftDocument => ({ version: 1, unit, revision, epoch, cleared, entries: {} });
  let doc = empty(), ready = false, storageError = false, contentChanged = false, observedRevision: string | null = null, observedPresent = false;
  const listeners = new Set<() => void>();
  const tokenFor = (id: string) => JSON.stringify([unit, revision, doc.epoch, doc.cleared, id, doc.entries[id]?.run ?? ZERO]);
  function project(): JapaneseDraftSnapshot {
    return { ready, states: Object.fromEntries(activities.map(activity => [activity.id, doc.entries[activity.id]?.state ?? initialJapaneseActivityState(activity)])),
      tokens: Object.fromEntries(activities.map(activity => [activity.id, tokenFor(activity.id)])), epoch: doc.epoch, storageError, contentChanged };
  }
  let snapshot = project(); const serverSnapshot = snapshot;
  function publish() { const next = project(); if (!same(next, snapshot)) { snapshot = next; listeners.forEach(listener => listener()); } }
  function nextStamp(): Stamp { return { at: Math.max(1, clock(), doc.cleared.at + 1, ...Object.values(doc.entries).flatMap(entry => [entry.run.at + 1, entry.changed.at + 1])), actor }; }
  function decode(raw: string | null, epoch: string): DraftDocument {
    const result = empty(epoch);
    if (!raw || raw.length > JAPANESE_DRAFT_LIMIT) return result;
    try {
      const value: unknown = JSON.parse(raw);
      if (!object(value) || value.version !== 1 || value.unit !== unit || value.revision !== revision || value.epoch !== epoch) return result;
      result.cleared = stamp(value.cleared, clock()) ?? ZERO;
      if (!object(value.entries)) return result;
      for (const activity of activities) {
        const entry = Object.hasOwn(value.entries, activity.id) ? value.entries[activity.id] : null;
        if (!object(entry)) continue;
        const run = stamp(entry.run, clock()), changed = stamp(entry.changed, clock()), state = validState(entry.state, activity);
        if (run && changed && state) result.entries[activity.id] = { run, changed, state, ...(state.checked ? { checkedAt: stamp(entry.checkedAt, clock()) ?? changed } : {}) };
      }
    } catch { /* Malformed local drafts do not change historical results. */ }
    return result;
  }
  function persist(target: JapaneseLocalStorage) {
    const raw = JSON.stringify(doc);
    if (raw.length > JAPANESE_DRAFT_LIMIT) throw new Error("Japanese draft storage limit");
    if (target.getItem(key) !== raw) target.setItem(key, raw);
    observedPresent = true; observedRevision = revision;
  }
  function reconcile() {
    if (contentChanged) return;
    try {
      const target = storage(); if (!target) throw new Error("Local storage unavailable");
      const { epoch } = readJapaneseSession(target), raw = target.getItem(key);
      let diskRevision = "";
      if (raw && raw.length <= JAPANESE_DRAFT_LIMIT) try {
        const value = JSON.parse(raw);
        if (value?.unit === unit && typeof value.version === "number" && value.version > 1) { contentChanged = true; ready = true; return; }
        if (value?.version === 1 && value.unit === unit && typeof value.revision === "string") diskRevision = value.revision;
      } catch { /* decode handles malformed JSON. */ }
      if (observedRevision === null) observedRevision = diskRevision;
      if (diskRevision && diskRevision !== revision && diskRevision !== observedRevision) { contentChanged = true; return; }
      let remote = decode(raw, epoch);
      if (raw === null && observedPresent && doc.epoch === epoch) remote = empty(epoch, nextStamp());
      if (!ready || doc.epoch !== epoch || diskRevision && diskRevision !== revision) doc = remote;
      else if (compare(doc.cleared, remote.cleared)) doc = compare(doc.cleared, remote.cleared) > 0 ? doc : remote;
      else {
        const entries = { ...doc.entries };
        for (const [id, entry] of Object.entries(remote.entries)) entries[id] = Object.hasOwn(entries, id) ? mergeEntry(entries[id], entry) : entry;
        doc = { ...doc, entries: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))) };
      }
      ready = true;
      persist(target); storageError = false;
    } catch { storageError = true; ready = true; }
  }
  function commit() {
    try { const target = storage(); if (!target) throw new Error("Local storage unavailable"); persist(target); storageError = false; }
    catch { storageError = true; }
    publish();
  }
  function current(id: string, token: string) {
    reconcile(); publish();
    if (contentChanged || !byId.has(id) || token !== tokenFor(id)) return null;
    return doc.entries[id] ?? { run: ZERO, changed: ZERO, state: initialJapaneseActivityState(byId.get(id)!) };
  }
  return {
    key, getSnapshot: () => snapshot, getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh() { reconcile(); publish(); },
    edit(id: string, token: string, before: JapaneseActivityState, proposed: JapaneseActivityState): boolean {
      const entry = current(id, token), activity = byId.get(id);
      if (!entry || !activity || before.revision !== entry.state.revision || before.checked !== entry.state.checked) return false;
      const next = validState(proposed, activity); if (!next || next.checked !== entry.state.checked || next.revision !== entry.state.revision) return false;
      const state = { ...entry.state };
      if (!state.checked && !same(before.answer, next.answer)) state.answer = next.answer;
      if (before.matchLeft !== next.matchLeft && !state.checked) state.matchLeft = next.matchLeft;
      if (before.showHint !== next.showHint) state.showHint = next.showHint;
      if (before.showTranscript !== next.showTranscript) state.showTranscript = next.showTranscript;
      if (!state.checked) state.assisted ||= next.assisted || state.showHint || state.showTranscript;
      if (same(state, entry.state)) return true;
      doc.entries[id] = { ...entry, state, changed: nextStamp() }; commit(); return true;
    },
    check(id: string, token: string, rendered: JapaneseActivityState, visibleHelp: boolean): JapaneseActivityState | null {
      const entry = current(id, token), activity = byId.get(id);
      if (!entry || !activity || entry.state.checked || rendered.checked || rendered.revision !== entry.state.revision ||
        !same(validAnswer(rendered.answer, activity), entry.state.answer) || !answerReady(activity, entry.state.answer)) return null;
      const state = { ...entry.state, checked: true, correct: checkJapaneseAnswer(activity, entry.state.answer), assisted: entry.state.assisted || rendered.assisted || visibleHelp };
      const checkedAt = nextStamp();
      doc.entries[id] = { ...entry, state, changed: checkedAt, checkedAt }; commit(); return state;
    },
    restart(id: string, token: string): boolean {
      const entry = current(id, token), activity = byId.get(id);
      if (!entry || !activity || !entry.state.checked) return false;
      const run = nextStamp();
      doc.entries[id] = { run, changed: run, state: initialJapaneseActivityState(activity, Math.min(1000000, entry.state.revision + 1)) };
      commit(); return true;
    },
  };
}
