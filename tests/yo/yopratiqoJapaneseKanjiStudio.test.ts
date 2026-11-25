/** Real rendered ink/recall interactions and provenance checks; no network or handwriting grading. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { JapaneseKanjiStudio } from "@/components/yo/japanese/JapaneseKanjiStudio";
import { japaneseKanjiCards, getJapaneseKanji } from "@/lib/yo/japaneseKanji";
import geometry from "@/public/kanjivg/70a0b7ae/strokes.json";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://pratiqo.example/yo", pretendToBeVisual: true });
let prefersReducedMotion = false;
Object.defineProperty(dom.window, "matchMedia", { configurable: true, value: () => ({ matches: prefersReducedMotion, addEventListener() {}, removeEventListener() {} }) });
class TestPointerEvent extends dom.window.MouseEvent {
  constructor(type: string, init: MouseEventInit & { pointerId?: number; isPrimary?: boolean; pointerType?: string } = {}) {
    super(type, init);
    Object.defineProperties(this, {
      pointerId: { value: init.pointerId ?? 1 },
      isPrimary: { value: init.isPrimary ?? true },
      pointerType: { value: init.pointerType ?? "pen" },
    });
  }
}
dom.window.PointerEvent = TestPointerEvent;
const bindings = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, SVGElement: dom.window.SVGElement, PointerEvent: TestPointerEvent, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(bindings)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { render, fireEvent, cleanup, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const cases: Array<[string, () => void | Promise<void>]> = [];
function test(name: string, run: () => void | Promise<void>) { cases.push([name, run]); }
const node = (locale: YoLocale = "en", characters = ["人", "日"], onPractice?: (character: string) => void) => React.createElement(JapaneseKanjiStudio, { locale, characters, onPractice });

function prepareGrid(container: HTMLElement) {
  const grid = container.querySelector<SVGSVGElement>("[data-kanji-grid]")!;
  const captured = new Set<number>();
  Object.defineProperty(grid, "getBoundingClientRect", { value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 109, bottom: 109, width: 109, height: 109, toJSON: () => ({}) }) });
  Object.assign(grid, { setPointerCapture: (id: number) => captured.add(id), hasPointerCapture: (id: number) => captured.has(id), releasePointerCapture: (id: number) => captured.delete(id) });
  return { grid, captured };
}
function draw(grid: SVGSVGElement, id = 1) {
  fireEvent.pointerDown(grid, { pointerId: id, clientX: 20, clientY: 10, button: 0, isPrimary: true });
  fireEvent.pointerMove(grid, { pointerId: id, clientX: 45, clientY: 65, button: 0 });
  fireEvent.pointerUp(grid, { pointerId: id, clientX: 80, clientY: 95, button: 0 });
}
const drawnCount = (container: HTMLElement) => container.querySelectorAll("[data-kanji-ink-stroke]").length;
const modelCount = (container: HTMLElement) => container.querySelectorAll("[data-kanji-model-stroke]").length;

test("exactly 40 contextual cards reference authentic ordered KanjiVG strokes and unchanged originals", () => {
  assert.deepEqual(japaneseKanjiCards.map((c) => c.character), [..."人名日本語一二三四五上下中右左食飲米茶円月火水木金家友学生先出入口電車読書行来見"]);
  assert.equal(new Set(japaneseKanjiCards.map((c) => c.character)).size, 40);
  const sources: Record<string, { sourceFile: string; sourceBlob: string; strokes: string[] }> = geometry.characters;
  for (const card of japaneseKanjiCards) {
    assert.equal(getJapaneseKanji(card.character), card);
    assert.ok(card.word.ja.includes(card.character));
    assert.ok(card.word.kana.length > 0 && card.word.romaji.length > 0);
    for (const locale of ["fr", "en", "es"] as const) {
      assert.ok(card.meaning[locale].trim());
      assert.ok(card.word.meaning[locale].trim());
      assert.ok(card.mnemonic[locale].trim());
    }
    const source = sources[card.character];
    const original = fs.readFileSync(path.join(process.cwd(), "public", card.sourceFile));
    const blob = createHash("sha1").update(`blob ${original.length}\0`).update(original).digest("hex");
    assert.equal(blob, source.sourceBlob, `${card.character}: original source bytes must stay intact`);
    const xml = original.toString("utf8");
    assert.match(xml, /Ulrich Apel/);
    assert.match(xml, /Attribution-Share Alike 3\.0/);
    const paths = [...xml.matchAll(/<path\b([^>]+)\/>/g)].map((match, index) => {
      assert.match(match[1], new RegExp(`id="kvg:[0-9a-f]{5}-s${index + 1}"`));
      return match[1].match(/\bd="([^"]+)"/)![1];
    });
    assert.deepEqual(card.strokes, paths);
    assert.ok(card.strokes.length > 0);
    for (const d of card.strokes) assert.match(d, /^[MmLlHhVvCcSsQqTtAaZzEe0-9.,+\s-]+$/);
  }
  assert.equal(getJapaneseKanji("未知"), undefined);
  assert.equal(geometry.revision, "70a0b7ae0c18ceb5cb358274b029cce0234a43bc");
  assert.equal(geometry.license, "CC-BY-SA-3.0");
  assert.ok(fs.readFileSync("public/kanjivg/70a0b7ae/COPYING.txt", "utf8").includes("CREATIVE COMMONS"));
});

for (const [locale, title, gridName, record] of [
  ["fr", "Atelier kanji", "Grille de tracé", "J’ai pratiqué ce kanji"],
  ["en", "Kanji studio", "Drawing grid", "I practised this kanji"],
  ["es", "Taller de kanji", "Cuadrícula de trazado", "He practicado este kanji"],
] as const) {
  test(`${locale}: localized studio, safe Japanese markup and attribution are accessible`, () => {
    const view = render(node(locale));
    assert.ok(view.getByRole("heading", { name: title }));
    assert.ok(view.getByRole("img", { name: `${gridName} · 人` }));
    assert.equal((view.getByRole("button", { name: record }) as HTMLButtonElement).disabled, true);
    assert.equal(view.getByRole("button", { name: "人" }).getAttribute("aria-pressed"), "true");
    assert.ok(view.container.querySelector("ruby[lang='ja'] rt"));
    assert.equal(view.getByRole("link", { name: "KanjiVG" }).getAttribute("href"), "https://kanjivg.tagaini.net/");
    assert.equal(view.getByRole("link", { name: "CC BY-SA 3.0" }).getAttribute("href"), "https://creativecommons.org/licenses/by-sa/3.0/");
    assert.ok(view.container.querySelector("[data-no-deck-swipe='true'][data-no-deck-tap='true']"));
  });
}

test("pointer capture draws separate strokes, undo removes one and clear removes ink without touching model", () => {
  const view = render(node());
  const { grid, captured } = prepareGrid(view.container);
  fireEvent.pointerDown(grid, { pointerId: 4, clientX: 20, clientY: 10, button: 0 });
  assert.equal(captured.has(4), true);
  fireEvent.pointerMove(grid, { pointerId: 4, clientX: 25, clientY: 30 });
  fireEvent.pointerUp(grid, { pointerId: 4, clientX: 40, clientY: 50 });
  assert.equal(captured.size, 0);
  assert.equal(drawnCount(view.container), 1);
  draw(grid, 5);
  assert.equal(drawnCount(view.container), 2);
  fireEvent.click(view.getByRole("button", { name: "Undo last stroke" }));
  assert.equal(drawnCount(view.container), 1);
  fireEvent.click(view.getByRole("button", { name: "Clear my drawing" }));
  assert.equal(drawnCount(view.container), 0);
  assert.equal(modelCount(view.container), 2);
  assert.equal((view.getByRole("button", { name: "Undo last stroke" }) as HTMLButtonElement).disabled, true);
});

test("cancelled or secondary pointers cannot commit ink, and the active pointer is bounded to the grid", () => {
  const view = render(node());
  const { grid } = prepareGrid(view.container);
  fireEvent.pointerDown(grid, { pointerId: 8, clientX: 20, clientY: 10, button: 0, isPrimary: false });
  assert.equal(view.container.querySelector("[data-kanji-draft]"), null);
  fireEvent.pointerDown(grid, { pointerId: 1, clientX: 20, clientY: 10, button: 0 });
  fireEvent.pointerMove(grid, { pointerId: 2, clientX: 100, clientY: 100 });
  fireEvent.pointerUp(grid, { pointerId: 2, clientX: 100, clientY: 100 });
  assert.equal(drawnCount(view.container), 0);
  fireEvent.pointerCancel(grid, { pointerId: 1 });
  assert.equal(view.container.querySelector("[data-kanji-draft]"), null);
  assert.equal(drawnCount(view.container), 0);
  fireEvent.pointerDown(grid, { pointerId: 3, clientX: -20, clientY: 200, button: 0 });
  fireEvent.pointerUp(grid, { pointerId: 3, clientX: 200, clientY: -20 });
  assert.equal(view.container.querySelector("[data-kanji-ink-stroke]")!.getAttribute("d"), "M1.00,108.00 L108.00,1.00");
});

test("show/hide and manual stroke stepping affect only the model, preserving learner ink", () => {
  const view = render(node());
  draw(prepareGrid(view.container).grid);
  fireEvent.click(view.getByRole("button", { name: "Hide model" }));
  assert.equal(modelCount(view.container), 0);
  assert.equal(drawnCount(view.container), 1);
  fireEvent.click(view.getByRole("button", { name: "Show model" }));
  fireEvent.click(view.getByRole("button", { name: "Previous stroke" }));
  assert.equal(modelCount(view.container), 1);
  fireEvent.click(view.getByRole("button", { name: "Previous stroke" }));
  assert.equal(modelCount(view.container), 0);
  fireEvent.click(view.getByRole("button", { name: "Next stroke" }));
  assert.equal(modelCount(view.container), 1);
  fireEvent.click(view.getByRole("button", { name: "All strokes" }));
  assert.equal(modelCount(view.container), 2);
  assert.equal(drawnCount(view.container), 1);
});

test("ink never self-grades or records practice; an explicit learner action reports only the character", () => {
  const reported: string[] = [];
  const view = render(node("en", ["人"], (character) => reported.push(character)));
  draw(prepareGrid(view.container).grid);
  assert.deepEqual(reported, []);
  fireEvent.click(view.getByRole("button", { name: "I practised this kanji" }));
  assert.deepEqual(reported, ["人"]);
  const recorded = view.getByRole("button", { name: "Practice recorded for this session." }) as HTMLButtonElement;
  assert.equal(recorded.disabled, true);
  fireEvent.click(recorded);
  assert.deepEqual(reported, ["人"]);
  assert.match(view.getByRole("status").textContent ?? "", /Practice recorded/);
  assert.ok(view.getByText("This practice does not grade calligraphy or measure kanji mastery."));
});

test("keyboard-accessible observe/recall alternative works through native focusable buttons without pointer drawing", () => {
  const reported: string[] = [];
  const view = render(node("en", ["日"], (character) => reported.push(character)));
  const observe = view.getByRole("button", { name: "Observe and recall" }) as HTMLButtonElement;
  assert.equal(observe.tagName, "BUTTON");
  assert.equal(observe.tabIndex, 0);
  observe.focus();
  assert.equal(document.activeElement, observe);
  fireEvent.click(observe);
  assert.equal(observe.getAttribute("aria-pressed"), "true");
  const recall = view.getByRole("button", { name: "Hide and recall" }) as HTMLButtonElement;
  recall.focus();
  assert.equal(document.activeElement, recall);
  fireEvent.click(recall);
  assert.equal(modelCount(view.container), 0);
  assert.equal((view.getByRole("button", { name: "I practised this kanji" }) as HTMLButtonElement).disabled, true);
  fireEvent.click(view.getByRole("button", { name: "Compare with model" }));
  assert.equal(modelCount(view.container), 4);
  fireEvent.click(view.getByRole("button", { name: "I practised this kanji" }));
  assert.deepEqual(reported, ["日"]);
  assert.equal(drawnCount(view.container), 0);
});

test("character switches isolate ink and unsupported characters are omitted safely", () => {
  const view = render(node("en", ["人", "人", "not-a-kanji", "日"]));
  assert.equal(view.getAllByRole("button", { name: "人" }).length, 1);
  assert.equal(view.queryByRole("button", { name: "not-a-kanji" }), null);
  draw(prepareGrid(view.container).grid);
  fireEvent.click(view.getByRole("button", { name: "日" }));
  assert.equal(drawnCount(view.container), 0);
  assert.equal(modelCount(view.container), 4);
  assert.equal(view.getByRole("button", { name: "日" }).getAttribute("aria-pressed"), "true");
  assert.equal((view.getByRole("button", { name: "I practised this kanji" }) as HTMLButtonElement).disabled, true);
  view.rerender(node("en", []));
  assert.ok(view.getByRole("status").textContent?.includes("No kanji"));
});

test("reduced motion avoids automatic stroke animation while keeping manual controls", () => {
  prefersReducedMotion = true;
  const view = render(node());
  fireEvent.click(view.getByRole("button", { name: "Replay strokes" }));
  assert.equal(modelCount(view.container), 2);
  assert.equal(view.queryByRole("button", { name: "Stop animation" }), null);
  assert.match(view.getByRole("status").textContent ?? "", /Reduced motion/);
  assert.equal(view.container.querySelector("[data-kanji-model-stroke][style]"), null);
  fireEvent.click(view.getByRole("button", { name: "Previous stroke" }));
  assert.equal(modelCount(view.container), 1);
});

test("replay reveals strokes in order and stop cancels further progression", async () => {
  const view = render(node("en", ["日"]));
  fireEvent.click(view.getByRole("button", { name: "Replay strokes" }));
  assert.equal(modelCount(view.container), 1);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 800)); });
  assert.equal(modelCount(view.container), 2);
  fireEvent.click(view.getByRole("button", { name: "Stop animation" }));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 800)); });
  assert.equal(modelCount(view.container), 2);
});

test("mounted hidden lessons preserve ink but stop model playback", async () => {
  const host = (hidden: boolean) => React.createElement("div", { hidden }, node("en", ["日"]));
  const view = render(host(false));
  draw(prepareGrid(view.container).grid);
  fireEvent.click(view.getByRole("button", { name: "Replay strokes" }));
  view.rerender(host(true));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 800)); });
  view.rerender(host(false));
  assert.equal(drawnCount(view.container), 1);
  assert.equal(modelCount(view.container), 1);
  assert.equal(view.queryByRole("button", { name: "Stop animation" }), null);
});

async function main() {
  let failed = 0;
  try {
    for (const [name, run] of cases) {
      try { await run(); console.log(`ok - ${name}`); }
      catch (error) { failed += 1; console.error(`not ok - ${name}`, error); }
      finally { cleanup(); prefersReducedMotion = false; }
    }
  } finally {
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
  console.log(`\nJapanese kanji studio: ${cases.length - failed}/${cases.length} passed.`);
  if (failed) process.exitCode = 1;
}
void main();
