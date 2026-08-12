import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

let pass = 0;
const ok = (label: string) => {
  pass += 1;
  console.log(`  ok  ${label}`);
};

const fontContract = read("lib/yo/appLandingFonts.ts");
const globals = read("app/globals.css");
const layout = read("app/layout.tsx");
const appShell = read("components/yo/YoAppLandingShell.tsx");
const courseShell = read("components/yo/YoCourseHomeShell.tsx");

assert.doesNotMatch(
  fontContract,
  /from\s+["']next\/font\/google["']/,
  "YoPratiqo app landing fonts must not import next/font/google",
);
assert.doesNotMatch(
  fontContract,
  /\b(?:Newsreader|Caveat)\s*\(/,
  "YoPratiqo app landing fonts must not call Google font loaders",
);
ok("1) YoPratiqo app font contract does not use next/font/google");

assert.match(fontContract, /export\s+const\s+appDisplayFont/);
assert.match(fontContract, /export\s+const\s+appScriptFont/);
assert.match(fontContract, /className:\s*"font-yo-app-display"/);
assert.match(fontContract, /variable:\s*"yo-app-display-font-variable"/);
assert.match(fontContract, /className:\s*"font-yo-app-script"/);
assert.match(fontContract, /variable:\s*"yo-app-script-font-variable"/);
ok("2) appLandingFonts preserves the className and variable contract");

assert.match(globals, /\.yo-app-display-font-variable\s*\{/);
assert.match(globals, /--yo-app-display:\s*Georgia,\s*"Times New Roman",\s*serif;/);
assert.match(globals, /\.yo-app-script-font-variable\s*\{/);
assert.match(
  globals,
  /--yo-app-script:\s*"Segoe Print",\s*"Bradley Hand",\s*"Comic Sans MS",\s*cursive;/,
);
assert.match(globals, /\.font-yo-app-display\s*\{/);
assert.match(globals, /\.font-yo-app-script\s*\{/);
ok("3) globals.css defines fallback font variables and utility classes");

for (const [label, source] of [
  ["YoAppLandingShell", appShell],
  ["YoCourseHomeShell", courseShell],
] as const) {
  assert.match(
    source,
    /appDisplayFont\.variable/,
    `${label} must still apply the display font variable class`,
  );
  assert.match(
    source,
    /appScriptFont\.variable/,
    `${label} must still apply the script font variable class`,
  );
}
ok("4) YoPratiqo shells still apply the font variable classes");

assert.match(layout, /from\s+["']next\/font\/local["']/);
assert.match(layout, /src:\s*"..\/public\/fonts\/inter\.woff2"/);
assert.doesNotMatch(layout, /next\/font\/google/);
ok("5) global Pratiqo Inter font remains local and unchanged");

console.log(`\n${pass} YoPratiqo Google font build guard assertions passed`);
