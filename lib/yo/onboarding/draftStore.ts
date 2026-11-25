/** On-device UI continuity only. This store has no outcome, reward, access or network writer. */
export const ONBOARDING_DRAFT_PREFIX = "yo.onboarding-draft.v1.";
export const ONBOARDING_DRAFT_LIMIT = 24000;
export type WelcomeStorage = Pick<Storage, "getItem" | "setItem">;
export type OnboardingSnapshot<T> = {
  state: T; token: string; ready: boolean; storageError: boolean;
  changedElsewhere: boolean; invalidated: boolean; consumed: boolean;
};
type Document<T> = { version: 1; revision: string; context: string; token: string; consumed: boolean; state: T };
export const draftObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
export const draftInteger = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
export const sameDraft = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function createOnboardingDraftStore<T>({ key, revision, fresh, parse, context, restore = value => value, watchKeys, storage = () => typeof window === "undefined" ? null : window.localStorage }: {
  key: string; revision: string; fresh: (storage: WelcomeStorage | null) => T;
  parse: (value: unknown) => T | null; context: (storage: WelcomeStorage) => string;
  restore?: (state: T) => T; watchKeys: string[]; storage?: () => WelcomeStorage | null;
}) {
  const actor = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "tab-" + Math.random().toString(36).slice(2);
  let sequence = 0;
  const token = () => actor + "-" + ++sequence;
  let doc: Document<T> = { version: 1, revision, context: "", token: token(), consumed: false, state: fresh(null) };
  let ready = false, loaded = false, storageError = false, invalidated = false, changedElsewhere = false, pending = false;
  let lastRaw: string | null = null;
  const listeners = new Set<() => void>();
  const project = (): OnboardingSnapshot<T> => ({ state: doc.state, token: doc.token, ready, storageError, changedElsewhere, invalidated, consumed: doc.consumed });
  let snapshot = project(); const serverSnapshot = snapshot;
  function publish() { const next = project(); if (!sameDraft(next, snapshot)) { snapshot = next; listeners.forEach(listener => listener()); } }
  function decode(raw: string | null): Document<T> | null {
    if (!raw || raw.length > ONBOARDING_DRAFT_LIMIT) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (!draftObject(value) || value.version !== 1 || typeof value.revision !== "string" || typeof value.context !== "string" ||
          typeof value.token !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(value.token) || typeof value.consumed !== "boolean") return null;
      const state = parse(value.state);
      return state ? { version: 1, revision: value.revision, context: value.context, token: value.token, consumed: value.consumed, state } : null;
    } catch { return null; }
  }
  function save(target: WelcomeStorage) {
    const raw = JSON.stringify(doc);
    if (raw.length > ONBOARDING_DRAFT_LIMIT) throw new Error("Onboarding draft exceeds its bound");
    target.setItem(key, raw); lastRaw = raw; pending = false; storageError = false;
  }
  function refresh() {
    if (invalidated) return;
    try {
      const target = storage(); if (!target) throw new Error("Storage unavailable");
      const currentContext = context(target), raw = target.getItem(key);
      if (loaded && currentContext !== doc.context) { invalidated = true; return; }
      if (!loaded) {
        const incoming = decode(raw);
        // Do not let an older page downgrade a future storage schema.
        if (raw && raw.length <= ONBOARDING_DRAFT_LIMIT) {
          try { const value = JSON.parse(raw); if (draftObject(value) && typeof value.version === "number" && value.version > 1) { invalidated = true; return; } } catch { /* Invalid drafts start fresh. */ }
        }
        if (incoming && incoming.revision === revision && incoming.context === currentContext && !incoming.consumed) {
          doc = { ...incoming, state: restore(incoming.state) }; changedElsewhere = pending;
        } else {
          doc = { version: 1, revision, context: currentContext, token: token(), consumed: false,
            state: pending && raw === null ? doc.state : fresh(target) };
        }
        loaded = true; lastRaw = raw; save(target);
      } else if (raw !== lastRaw) {
        const incoming = decode(raw);
        if (!incoming || incoming.revision !== revision || incoming.context !== currentContext) { invalidated = true; return; }
        doc = { ...incoming, state: restore(incoming.state) }; lastRaw = raw; pending = false;
        changedElsewhere = true; storageError = false;
      } else if (pending) save(target);
      else storageError = false;
    } catch { storageError = true; }
    finally { ready = true; publish(); }
  }
  function update(expected: string, change: (state: T) => T | null, consume = false): T | null {
    refresh();
    if (invalidated || doc.consumed || expected !== doc.token) { changedElsewhere ||= !invalidated; publish(); return null; }
    const proposed = change(doc.state), next = proposed === null ? null : parse(proposed);
    if (!next) return null;
    doc = { ...doc, token: token(), state: next, consumed: consume }; pending = true; changedElsewhere = false;
    try { const target = storage(); if (!target) throw new Error("Storage unavailable"); save(target); }
    catch { storageError = true; }
    publish(); return next;
  }
  return {
    key, watchKeys: [key, ...watchKeys], getSnapshot: () => snapshot, getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh, update,
    consume(expected: string) { return update(expected, state => state, true); },
  };
}
