import assert from "node:assert/strict";
import { parseSetupDraft, restoreSetupField, setupDraftKey, writeSetupField, readSetupDraft } from "../../lib/teachers/setupDraft";
import { hasTeacherSetupProgress, resumeTeacherSetupHref, finishTeacherSetup } from "../../lib/teachers/guidedSetup";

const fields = { name: { base: "Known name", value: "Unsaved edit" } };
const raw = JSON.stringify({ version: 1, expiresAt: 200, fields });
assert.equal(restoreSetupField(parseSetupDraft(raw, 100), "name", "Known name"), "Unsaved edit");
assert.equal(restoreSetupField(parseSetupDraft(raw, 100), "name", "New server name"), "New server name");
assert.deepEqual(parseSetupDraft(raw, 200), {});
assert.deepEqual(parseSetupDraft("broken", 100), {});
assert.deepEqual(parseSetupDraft('{"version":1,"expiresAt":300,"fields":{"name":{"base":null,"value":{}}}}', 100), {});
assert.notEqual(setupDraftKey("a", "teacher", "course"), setupDraftKey("b", "teacher", "course"));
assert.notEqual(setupDraftKey("a", "teacher", "course"), setupDraftKey("a", "other", "course"));

const store = new Map<string, string>();
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
} } });
const key = setupDraftKey("a", "teacher", "course");
assert.equal(writeSetupField(key, "name", "Known name", "Unsaved edit"), true);
assert.equal(restoreSetupField(readSetupDraft(key), "name", "Known name"), "Unsaved edit");
assert.equal(restoreSetupField(readSetupDraft(key), "name", "Unsaved edit"), "Unsaved edit");
writeSetupField(key, "name", "Unsaved edit", "Unsaved edit");
assert.equal(store.size, 0);
assert.equal(hasTeacherSetupProgress("a"), false);
store.set("pratiqo:teacher-setup:a", "payments");
assert.equal(hasTeacherSetupProgress("a"), true);
assert.equal(hasTeacherSetupProgress("b"), false);
assert.equal(resumeTeacherSetupHref("a"), "/teacher/setup-payments?setup=1");
finishTeacherSetup("a");
assert.equal(hasTeacherSetupProgress("a"), false);
let storageWarning = false;
Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: (event: Event) => { storageWarning = event.type === "teacher-setup-storage-unavailable"; }, get localStorage() { throw new Error("storage disabled"); } } });
assert.equal(writeSetupField(key, "name", "A", "B"), false);
assert.equal(storageWarning, true);
assert.deepEqual(readSetupDraft(key), {});
Reflect.deleteProperty(globalThis, "window");
console.log("PASS: setup drafts restore, expire, isolate accounts and preserve newer server data");
