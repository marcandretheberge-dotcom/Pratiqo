import type { ItalianChoiceActivity } from "../../lib/yo/italian/italianModuleTypes";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activities,
  cultureSources,
  grammarTips,
  moduleCopy,
  objectives,
  vocabulary,
} from "../../lib/yo/italian/italianModuleData";
import type { ItalianOption } from "../../lib/yo/italian/italianModuleTypes";

function checkOptions(options: ItalianOption[], correctId: string, label: string) {
  assert.ok(options.length >= 3, `${label}: at least three meaningful choices`);
  assert.equal(new Set(options.map((option) => option.id)).size, options.length, `${label}: unique option ids`);
  assert.equal(options.filter((option) => option.id === correctId).length, 1, `${label}: one authored answer`);
  for (const option of options) {
    assert.ok(option.it?.trim() || option.label, `${label}/${option.id}: visible answer`);
    assert.ok(option.feedback.fr.trim() && option.feedback.en.trim() && option.feedback.es.trim());
  }
}

test("Italian module contains a complete, unique beginner sequence", () => {
  assert.equal(vocabulary.length, 24);
  assert.equal(new Set(vocabulary.map((item) => item.id)).size, 24);
  assert.equal(activities.length, 16);
  assert.equal(new Set(activities.map((item) => item.id)).size, 16);
  assert.equal(activities.at(-1)?.category, "final");
  assert.equal(objectives.length, 4);
  assert.equal(grammarTips.length, 3);
  const mechanics = new Set(activities.map((item) => item.kind === "culture" ? "choice" : item.kind));
  assert.deepEqual([...mechanics].sort(), ["cafe", "choice", "dialogue", "listen", "map", "match", "order", "type"]);
});

test("Every teaching text is present in French, English and Spanish", () => {
  let localizedCount = 0;
  function visit(value: unknown, path: string) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    const entry = value as Record<string, unknown>;
    if ("fr" in entry || "en" in entry || "es" in entry) {
      localizedCount += 1;
      for (const locale of ["fr", "en", "es"]) {
        assert.equal(typeof entry[locale], "string", `${path}.${locale}`);
        assert.ok((entry[locale] as string).trim().length > 0, `${path}.${locale} is nonempty`);
      }
    }
    Object.entries(entry).forEach(([key, child]) => visit(child, `${path}.${key}`));
  }
  visit({ vocabulary, activities, grammarTips, moduleCopy, objectives, cultureSources }, "module");
  assert.ok(localizedCount > 150);
});

test("Each activity has two distinct hints and an explanation", () => {
  for (const activity of activities) {
    for (const locale of ["fr", "en", "es"] as const) {
      assert.notEqual(activity.hint[locale], activity.hint2[locale], `${activity.id}/${locale}`);
      assert.ok(activity.explanation[locale].length > 25);
    }
  }
});

test("All choice and dialogue answers reference visible, unique options", () => {
  for (const activity of activities) {
    if (activity.kind === "choice" || activity.kind === "culture" || activity.kind === "listen") {
      checkOptions(activity.options, activity.correctId, activity.id);
    }
    if (activity.kind === "dialogue") {
      assert.ok(activity.turns.length >= 3);
      activity.turns.forEach((turn, index) => checkOptions(turn.options, turn.correctId, `${activity.id}/${index}`));
    }
  }
});

test("Matching games reuse taught vocabulary without duplicate pairs", () => {
  const vocabularyById = new Map(vocabulary.map((item) => [item.id, item]));
  for (const activity of activities) {
    if (activity.kind !== "match") continue;
    assert.ok(activity.pairs.length >= 3);
    assert.equal(new Set(activity.pairs.map((pair) => pair.id)).size, activity.pairs.length);
    for (const pair of activity.pairs) {
      assert.equal(pair.it, vocabularyById.get(pair.id)?.it);
      assert.deepEqual(pair.meaning, vocabularyById.get(pair.id)?.meaning);
    }
  }
});

test("Phrase construction has exactly the tokens needed for its canonical model", () => {
  for (const activity of activities) {
    if (activity.kind !== "order") continue;
    assert.deepEqual([...activity.tokens].sort(), [...activity.answer].sort());
    assert.equal(activity.answer.join(" "), activity.it);
    for (const distractor of activity.distractors ?? []) {
      assert.ok(!activity.answer.includes(distractor));
    }
  }
});

test("The café order is affordable, exact and calculated in integer cents", () => {
  const activity = activities.find((item) => item.kind === "cafe");
  assert.ok(activity?.kind === "cafe");
  const menu = new Map(activity.menu.map((item) => [item.id, item]));
  assert.equal(menu.size, activity.menu.length);
  let total = 0;
  for (const item of activity.menu) assert.ok(Number.isInteger(item.priceCents) && item.priceCents > 0);
  for (const item of activity.order) {
    const menuItem = menu.get(item.itemId);
    assert.ok(menuItem, item.itemId);
    assert.ok(Number.isInteger(item.quantity) && item.quantity > 0);
    total += menuItem.priceCents * item.quantity;
  }
  assert.equal(total, 450);
  assert.equal(activity.budgetCents - total, 50);
  assert.ok(total <= activity.budgetCents);
});

test("The authored map route stays inside the grid and reaches the piazza", () => {
  const activity = activities.find((item) => item.kind === "map");
  assert.ok(activity?.kind === "map");
  let { row, col } = activity.start;
  for (const direction of activity.path) {
    if (direction === "up") row -= 1;
    if (direction === "down") row += 1;
    if (direction === "left") col -= 1;
    if (direction === "right") col += 1;
    assert.ok(row >= 0 && row < activity.gridSize);
    assert.ok(col >= 0 && col < activity.gridSize);
  }
  assert.deepEqual({ row, col }, activity.goal);
  assert.equal(activity.instructions.length, 2);
  assert.match(activity.prompt.fr, /fictif/);
  assert.match(activity.prompt.en, /fictional/);
  assert.match(activity.prompt.es, /ficticio/);
});

test("Listening stimuli and typed models preserve meaningful Italian accents", () => {
  const listening = activities.filter((activity): activity is ItalianChoiceActivity => activity.kind === "listen");
  assert.equal(listening.length, 2);
  for (const activity of listening) assert.ok(activity.stimulus?.trim());
  assert.equal(listening[0].stimulus, "Vorrei un tè, per favore.");
  for (const activity of activities) {
    if (activity.kind !== "type") continue;
    assert.ok(activity.accepted.includes(activity.model));
  }
  assert.ok(vocabulary.some((item) => item.it === "Un caffè."));
  assert.ok(vocabulary.some((item) => item.it === "Può ripetere, per favore?"));
});

test("Cultural activities cite known primary sources and identify fiction", () => {
  const sources = new Map(cultureSources.map((source) => [source.id, source]));
  for (const activity of activities) {
    if (activity.kind !== "culture") continue;
    assert.ok(activity.sourceIds?.length);
    for (const id of activity.sourceIds) assert.ok(sources.has(id), id);
  }
  for (const source of cultureSources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:");
    assert.ok(["www.raiscuola.rai.it", "www.bolognawelcome.com"].includes(url.hostname));
  }
  assert.match(moduleCopy.fictionNotice.fr, /prix.*fictifs/);
  assert.match(moduleCopy.fictionNotice.en, /prices.*fictional/);
  assert.match(moduleCopy.fictionNotice.es, /precios.*ficticios/);
});
