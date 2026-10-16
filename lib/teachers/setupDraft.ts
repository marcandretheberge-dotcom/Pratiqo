type DraftValue = string | boolean | number | string[];
type DraftFields = Record<string, { base: DraftValue; value: DraftValue }>;
type Draft = { version: 1; expiresAt: number; fields: DraftFields };

const TTL = 7 * 24 * 60 * 60 * 1000;
const equal = (a: DraftValue, b: DraftValue) => JSON.stringify(a) === JSON.stringify(b);
const validValue = (v: unknown): v is DraftValue =>
  typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)) ||
  (Array.isArray(v) && v.every(item => typeof item === "string"));

export function setupDraftKey(userId: string, teacherId: string, step: string) {
  return `pratiqo:teacher-draft:v1:${userId}:${teacherId}:${step}`;
}

export function parseSetupDraft(raw: string | null, now = Date.now()): DraftFields {
  try {
    const draft: Draft = JSON.parse(raw || "null");
    if (draft?.version !== 1 || !Number.isFinite(draft.expiresAt) || draft.expiresAt <= now || !draft.fields) return {};
    return Object.fromEntries(Object.entries(draft.fields).filter(([key, field]) =>
      /^[a-zA-Z][a-zA-Z0-9]*$/.test(key) && field && validValue(field.base) && validValue(field.value)));
  } catch { return {}; }
}

/** Restore only against the same server value. A newer server edit always wins. */
export function restoreSetupField<T extends DraftValue>(fields: DraftFields, key: string, serverValue: T): T {
  const field = fields[key];
  return field && equal(field.base, serverValue) && typeof field.value === typeof serverValue &&
    Array.isArray(field.value) === Array.isArray(serverValue) ? field.value as T : serverValue;
}

export function readSetupDraft(key: string | null): DraftFields {
  if (!key || typeof window === "undefined") return {};
  try { return parseSetupDraft(window.localStorage.getItem(key)); } catch { return {}; }
}

export function clearSetupDraft(key: string | null): void {
  if (!key || typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch { /* Saved server values still take precedence. */ }
}

/** Public profile fields only: never store credentials, consents or private addresses. */
export function writeSetupField(key: string | null, field: string, base: DraftValue, value: DraftValue): boolean {
  if (!key || typeof window === "undefined") return false;
  try {
    const fields = readSetupDraft(key);
    if (equal(base, value)) delete fields[field];
    else fields[field] = { base, value };
    if (Object.keys(fields).length) window.localStorage.setItem(key, JSON.stringify({ version: 1, expiresAt: Date.now() + TTL, fields }));
    else window.localStorage.removeItem(key);
    return true;
  } catch {
    window.dispatchEvent(new Event("teacher-setup-storage-unavailable"));
    return false;
  }
}
