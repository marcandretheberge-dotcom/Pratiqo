import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { YoLanguageQuickStart } from "@/components/yo/YoLanguageQuickStart";
import { yopratiqoProductConfig } from "@/lib/yo/yopratiqoProductConfig";
import { getYoPublicLanguages } from "@/lib/yo/publicCatalog";

const read = (file: string) => readFileSync(file, "utf8");
const catalog = read("app/yo/langues/page.tsx");
const quick = read("components/yo/YoLanguageQuickStart.tsx");
const publicCatalog = read("lib/yo/publicCatalog.ts");
const { JSDOM } = createRequire(import.meta.url)("jsdom");
const expected = ["/yo/langues/anglais/intro", "/yo/langues/francais-quebec/intro",
 "/yo/langues/espagnol/intro", "/yo/langues/japonais/parcours", "/yo/langues/italien/parcours",
 "/yo/langues/allemand/parcours", "/yo/langues/portugais-bresil/parcours", "/yo/langues/mandarin/parcours"];

for (const locale of ["fr", "en", "es"] as const) test(`${locale}: all available languages are real SSR links, without a welcome gate`, () => {
 const html = renderToStaticMarkup(React.createElement(YoLanguageQuickStart, {locale}));
 const document = new JSDOM(html).window.document as Document;
 const cards = Array.from(document.querySelectorAll("ul > li"));
 const hrefs = cards.map(card => card.querySelector("a")!.getAttribute("href")!);
 assert.equal(hrefs.length, getYoPublicLanguages().length);
 for (const [index, card] of cards.entries()) {
   const program = card.querySelectorAll("a")[1];
   assert.ok(program, "optional program link must not replace direct learning");
   assert.equal(program.getAttribute("href")!.split("?")[0], getYoPublicLanguages()[index].landingRoute);
 }
 assert.deepEqual(hrefs.map(href=>href.split("?")[0]).sort(), [...expected].sort());
 for (const href of hrefs) {
   const url = new URL(href, "https://www.pratiqo.ca");
   assert.equal(url.searchParams.get("lang"), locale === "fr" ? null : locale);
   assert.ok(existsSync(`app${url.pathname}/page.tsx`), href);
 }
 assert.match(html, /Yoppo/);
 assert.equal(document.querySelector("a[hidden], a[aria-disabled=true], a[href*=checkout]"), null);
 assert.match(html, /min-w-0/);
 assert.match(html, /md:grid-cols-2/);
 assert.match(html, /break-words/);
});
test("catalog uses a real viewport shell, a scrollable list, shared header and desktop workspace", () => {
 for (const component of ["YoAppShell", "YoAppShellScroller", "YoAppHeader", "YoDesktopAppWorkspace", "YoLanguageQuickStart"])
   assert.match(catalog, new RegExp("<"+component+"\\b"));
 assert.doesNotMatch(catalog, /YoStepNavigator|YoAdaptiveStepShell|YoScreenPager/);
 assert.match(catalog, /backHref=\{\x60\/yo\$\{langSuffix\}\x60\}/);
 const header = read("components/yo/YoAppHeader.tsx");
 assert.match(header, /<YoPratiqoLogo/);
 assert.match(header, /<YoLanguageSelector/);
});
test("public home and signed-in learner hub expose the same language choice before supplementary content", () => {
 const home=read("app/yo/page.tsx"), student=read("components/yo/YoStudentHubContent.tsx");
 assert.ok(home.indexOf("<YoLanguageQuickStart") < home.indexOf("<details"));
 assert.ok(student.indexOf("<YoLanguageQuickStart") < student.indexOf("<YoStepNavigator"));
 assert.match(home, /<YoLanguageSelector locale=\{locale\}/);
});
test("the live catalog keeps francisation within Quebec French and never advertises unfinished languages", () => {
 for(const label of ["Français québécois / Francisation","Quebec French / Francization","Francés quebequense / Francización"]) assert.ok(publicCatalog.includes(label));
 assert.ok(!getYoPublicLanguages().some(course => course.slug === "musique" || course.slug === "portugais"));
 assert.match(publicCatalog, /isAccessibleForFree/);
 assert.equal(yopratiqoProductConfig.premiumModulesEnabled,false);
});
test("catalog remains free of privileged APIs, payment code and generated audio", () => {
 for(const source of [catalog,quick]) assert.doesNotMatch(source,/from\s+["'](?:stripe|@supabase|openai|@\/lib\/(?:stripe|payments|tax|membrePro)|@\/scripts\/)|service[_-]?role/i);
});
