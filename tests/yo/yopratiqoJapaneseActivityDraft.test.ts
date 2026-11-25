import assert from "node:assert/strict";
import test from "node:test";
import { createJapaneseActivityDraftStore, JAPANESE_DRAFT_LIMIT, japaneseActivityDraftKey } from "@/lib/yo/japaneseActivityDraft";
import { JAPANESE_PROGRESS_KEY, emptyJapaneseProgress } from "@/lib/yo/japaneseCourseProgress";
import { japaneseCourseUnits } from "@/lib/yo/japaneseCourse";
import type { JapaneseReadingActivity } from "@/lib/yo/japaneseCourseTypes";

const unit = japaneseCourseUnits[8], activities = unit.activities;
const first = activities.find(item => item.id === "jp-9-recall-negative") as JapaneseReadingActivity;
const second = activities.find(item => item.id === "jp-9-recall-quantity") as JapaneseReadingActivity;
class MemoryStorage {
  values = new Map<string, string>(); writes: string[] = []; fail = false;
  getItem(key: string) { if (this.fail) throw new Error("blocked"); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error("blocked"); this.values.set(key, value); this.writes.push(key); }
  removeItem(key: string) { this.values.delete(key); }
}
function setup() {
  const storage = new MemoryStorage(); storage.setItem(JAPANESE_PROGRESS_KEY, JSON.stringify(emptyJapaneseProgress()));
  const store = (actor: string, authored = activities, id = unit.id) => createJapaneseActivityDraftStore(id, authored, () => storage, () => 1700000000000, actor);
  return { storage, store };
}
function type(store: ReturnType<typeof createJapaneseActivityDraftStore>, id: string, answer: string) {
  const { states, tokens } = store.getSnapshot();
  return store.edit(id, tokens[id], states[id], { ...states[id], answer });
}

test("independent tabs retain distinct activities and latest same-activity editing with sticky help", () => {
  const { storage, store } = setup(), a = store("tab-a"), b = store("tab-b"); a.refresh(); b.refresh();
  type(a, first.id, "高く"); type(b, second.id, "二つ");
  a.refresh(); assert.equal(a.getSnapshot().states[second.id].answer, "二つ");
  const old = a.getSnapshot();
  b.edit(first.id, b.getSnapshot().tokens[first.id], b.getSnapshot().states[first.id], { ...b.getSnapshot().states[first.id], showHint: true, assisted: true });
  a.edit(first.id, old.tokens[first.id], old.states[first.id], { ...old.states[first.id], answer: first.answer });
  b.refresh(); assert.equal(b.getSnapshot().states[first.id].answer, first.answer); assert.equal(b.getSnapshot().states[first.id].assisted, true);
  const c = store("reloaded"); c.refresh(); assert.equal(c.getSnapshot().states[second.id].answer, "二つ");
  assert.deepEqual(JSON.parse(storage.getItem(JAPANESE_PROGRESS_KEY)!).results, {}, "drafts are not outcomes");
});

test("checked answers are restored once; only deliberate restart clears help and rejects old callbacks", () => {
  const { store } = setup(), a = store("tab-a"), b = store("tab-b"); a.refresh(); b.refresh();
  type(a, first.id, first.answer);
  const old = a.getSnapshot();
  const checked = a.check(first.id, old.tokens[first.id], old.states[first.id], true); assert.ok(checked?.correct && checked.assisted);
  b.refresh(); assert.equal(b.getSnapshot().states[first.id].checked, true);
  assert.equal(b.check(first.id, old.tokens[first.id], old.states[first.id], false), null);
  const feedback = b.getSnapshot();
  b.edit(first.id, feedback.tokens[first.id], feedback.states[first.id], { ...feedback.states[first.id], showHint: true });
  a.refresh(); assert.equal(a.getSnapshot().states[first.id].showHint, true, "reading feedback after Check cannot be undone by another tab's older display");
  assert.equal(b.restart(first.id, b.getSnapshot().tokens[first.id]), true);
  assert.equal(a.edit(first.id, old.tokens[first.id], old.states[first.id], { ...old.states[first.id], answer: "old" }), false);
  assert.equal(a.check(first.id, old.tokens[first.id], old.states[first.id], false), null);
  assert.equal(a.getSnapshot().states[first.id].answer, ""); assert.equal(a.getSnapshot().states[first.id].assisted, false);
});

test("a changed authored revision clears current drafts and prevents an old open store from writing back", () => {
  const { storage, store } = setup(), a = store("old"); a.refresh(); type(a, first.id, first.answer);
  const old = a.getSnapshot();
  const revised = activities.map(item => item.id === first.id ? { ...item, prompt: { ...item.prompt, en: "A revised task" } } : item);
  const b = store("new", revised); b.refresh(); assert.equal(b.getSnapshot().states[first.id].answer, "");
  type(b, first.id, "新"); const raw = storage.getItem(a.key);
  assert.equal(a.check(first.id, old.tokens[first.id], old.states[first.id], false), null);
  assert.equal(a.getSnapshot().contentChanged, true); assert.equal(storage.getItem(a.key), raw);
});

test("course removal and unit-draft removal dominate stale writes without touching other course keys", () => {
  const { storage, store } = setup(), a = store("a"), b = store("b"); a.refresh(); b.refresh(); type(a, first.id, first.answer);
  const before = a.getSnapshot(); storage.setItem("yopratiqo:mandarin-foundations:v1", "other-language");
  storage.removeItem(JAPANESE_PROGRESS_KEY);
  assert.equal(a.check(first.id, before.tokens[first.id], before.states[first.id], false), null);
  assert.equal(a.getSnapshot().states[first.id].answer, ""); assert.equal(storage.getItem(JAPANESE_PROGRESS_KEY), null);
  assert.equal(b.edit(first.id, before.tokens[first.id], before.states[first.id], { ...before.states[first.id], answer: "stale" }), false);
  type(a, first.id, "fresh"); const fresh = a.getSnapshot(); storage.removeItem(a.key);
  assert.equal(a.edit(first.id, fresh.tokens[first.id], fresh.states[first.id], { ...fresh.states[first.id], answer: "stale" }), false);
  assert.equal(storage.getItem("yopratiqo:mandarin-foundations:v1"), "other-language");
});

test("parsing is bounded, validates actual choice/token IDs, and never grades stored answers", () => {
  const { storage, store } = setup(), a = store("a"); a.refresh();
  const raw = JSON.parse(storage.getItem(a.key)!);
  raw.entries[first.id] = { run: { at: 0, actor: "initial" }, changed: { at: 0, actor: "initial" }, state: { ...a.getSnapshot().states[first.id], answer: "x".repeat(101), checked: true, correct: true } };
  raw.entries["jp-fake"] = raw.entries[first.id];
  storage.setItem(a.key, JSON.stringify(raw));
  const b = store("b"); b.refresh(); assert.equal(b.getSnapshot().states[first.id].answer, ""); assert.equal(b.getSnapshot().states["jp-fake"], undefined);
  storage.setItem(a.key, "x".repeat(JAPANESE_DRAFT_LIMIT + 1));
  const c = store("c"); c.refresh(); assert.equal(c.getSnapshot().states[first.id].checked, false);
  const elsewhere = store("other-module", activities, "jp-foundation-10"); elsewhere.refresh(); type(elsewhere, first.id, "別");
  assert.notEqual(japaneseActivityDraftKey(unit.id), elsewhere.key); assert.equal(c.getSnapshot().states[first.id].answer, "");
});

test("blocked local storage keeps an honest session-only draft without effects outside that store", () => {
  const { storage, store } = setup(); storage.fail = true;
  const a = store("offline"); a.refresh(); assert.equal(a.getSnapshot().storageError, true);
  type(a, first.id, first.answer);
  const before = a.getSnapshot(); assert.equal(a.check(first.id, before.tokens[first.id], before.states[first.id], true)?.correct, true);
  assert.equal(a.getSnapshot().storageError, true); assert.equal(a.getSnapshot().states[first.id].assisted, true);
  assert.equal(storage.writes.filter(key => key === JAPANESE_PROGRESS_KEY).length, 1);
});
