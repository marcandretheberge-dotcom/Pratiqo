import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const source = readFileSync("components/yo/journey/map/MapYoppo.tsx", "utf8");
// Approved c4cd16e7 geometry/color attributes, independent of grouping or paint order.
const shapes = source.match(/<(?:path|ellipse|rect)\b[^>]*\/>/g)!.sort();
assert.equal(shapes.length, 37);
assert.equal(createHash("sha256").update(JSON.stringify(shapes)).digest("hex"),
  "3207d17679aac4aec486e592d7c7024260fb92815531a4eb8c005898171a0b2d",
  "Approved silhouette, face, proportions and colors must not be redrawn");
assert.ok(source.indexOf('className="yo-map-back-arm"') > source.indexOf('d="M35 66'),
  "Both arms paint above the backpack/body instead of disappearing behind them");
assert.equal((source.match(/className="yo-map-quills"/g) ?? []).length, 2);
const css = readFileSync("components/yo/journey/map/travelerStyles.ts", "utf8");
assert.ok(css.includes('data-active="false"] *'));
assert.ok(css.includes('data-reduced="true"] *'));
assert.ok(css.includes("prefers-reduced-motion:reduce"));
assert.ok(css.includes('.yo-map-companion[data-motion="walking"]:not([data-pose="riding"]) .yo-map-back-arm'),
  "Walking limb cycles must not override the riding pose");
console.log("PASS: 37 approved vector shapes/colors preserved, both arm layers visible, quills articulated, motion gates present");
