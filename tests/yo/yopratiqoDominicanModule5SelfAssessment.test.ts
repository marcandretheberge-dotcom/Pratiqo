/** Render the checklist with its real course statements; no persistence or network. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";

import { DominicanRepublicModule5SelfAssessment } from "@/components/yo/DominicanRepublicModule5SelfAssessment";
import { dominicanRepublicA2Capstone } from "@/lib/yo/dominicanRepublicA2Capstone";
import { t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://www.pratiqo.ca/yo",
  pretendToBeVisual: true,
});
const bindings = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
};
const originals = new Map(
  Object.keys(bindings).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
for (const [key, value] of Object.entries(bindings)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const { render, cleanup, fireEvent, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const items = dominicanRepublicA2Capstone.selfAssessment;
const node = (locale: YoLocale = "fr") => React.createElement(DominicanRepublicModule5SelfAssessment, { items, locale });
const cases: Array<[string, () => void]> = [];
function test(name: string, fn: () => void) { cases.push([name, fn]); }

for (const locale of ["fr", "en", "es"] as const) {
  test(`${locale}: every original statement labels an initially unchecked native checkbox`, () => {
    const view = render(node(locale));
    assert.equal(view.getAllByRole("checkbox").length, items.length);
    for (const item of items) {
      const input = view.getByRole("checkbox", { name: t(item.statement, locale) }) as HTMLInputElement;
      assert.equal(input.tagName, "INPUT");
      assert.equal(input.type, "checkbox");
      assert.equal(input.name, item.id);
      assert.equal(input.checked, false);
      assert.equal(input.disabled, false);
      assert.equal(input.tabIndex, 0);
    }
    assert.match(view.getByRole("status").textContent ?? "", new RegExp(`0/${items.length}$`));
  });
}

test("clicking statements checks and unchecks independently and updates the count", () => {
  const view = render(node());
  const first = view.getByRole("checkbox", { name: items[0].statement.fr }) as HTMLInputElement;
  const second = view.getByRole("checkbox", { name: items[1].statement.fr }) as HTMLInputElement;
  fireEvent.click(view.getByText(items[0].statement.fr));
  assert.equal(first.checked, true);
  assert.equal(second.checked, false);
  fireEvent.click(view.getByText(items[1].statement.fr));
  assert.equal(second.checked, true);
  assert.match(view.getByRole("status").textContent ?? "", new RegExp(`2/${items.length}$`));
  first.focus();
  assert.equal(document.activeElement, first);
  fireEvent.click(first);
  assert.equal(first.checked, false);
  assert.equal(second.checked, true);
  assert.match(view.getByRole("status").textContent ?? "", new RegExp(`1/${items.length}$`));
});

test("a mounted deck screen preserves the selections across hiding and locale changes", () => {
  const host = (locale: YoLocale, hidden: boolean) => React.createElement("div", {
    hidden,
    "data-yo-lesson-deck-screen-host-id": "final-mission",
    "data-yo-lesson-deck-screen-host-active": !hidden,
  }, node(locale));
  const view = render(host("fr", false));
  fireEvent.click(view.getByRole("checkbox", { name: items[0].statement.fr }));
  view.rerender(host("fr", true));
  assert.equal(view.queryAllByRole("checkbox").length, 0);
  view.rerender(host("en", false));
  assert.equal((view.getByRole("checkbox", { name: items[0].statement.en }) as HTMLInputElement).checked, true);
  assert.equal((view.getByRole("checkbox", { name: items[1].statement.en }) as HTMLInputElement).checked, false);
  view.rerender(host("es", false));
  const first = view.getByRole("checkbox", { name: items[0].statement.es! }) as HTMLInputElement;
  assert.equal(first.checked, true);
  fireEvent.click(first);
  assert.match(view.getByRole("status").textContent ?? "", new RegExp(`0/${items.length}$`));
});

test("multiple instances have distinct labels and independent selections", () => {
  const view = render(React.createElement(React.Fragment, null,
    React.createElement("div", { "data-testid": "first" }, node()),
    React.createElement("div", { "data-testid": "second" }, node()),
  ));
  const firstView = within(view.getByTestId("first"));
  const secondView = within(view.getByTestId("second"));
  const first = firstView.getByRole("checkbox", { name: items[0].statement.fr }) as HTMLInputElement;
  const second = secondView.getByRole("checkbox", { name: items[0].statement.fr }) as HTMLInputElement;
  assert.notEqual(first.id, second.id);
  fireEvent.click(secondView.getByText(items[0].statement.fr));
  assert.equal(second.checked, true);
  assert.equal(first.checked, false);
});

test("a fresh lesson starts unchecked instead of storing or treating reflection as completion", () => {
  const view = render(node());
  for (const input of view.getAllByRole("checkbox")) fireEvent.click(input);
  assert.match(view.getByRole("status").textContent ?? "", new RegExp(`${items.length}/${items.length}$`));
  assert.equal(view.queryAllByRole("button").length, 0);
  view.unmount();
  const fresh = render(node());
  for (const input of fresh.getAllByRole("checkbox")) {
    assert.equal((input as HTMLInputElement).checked, false);
  }
});

let failed = 0;
try {
  for (const [name, run] of cases) {
    try { run(); console.log(`ok - ${name}`); }
    catch (error) { failed += 1; console.error(`not ok - ${name}`, error); }
    finally { cleanup(); }
  }
} finally {
  dom.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
}
console.log(`\nModule 5 self-assessment: ${cases.length - failed}/${cases.length} passed.`);
if (failed) process.exitCode = 1;
