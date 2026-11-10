import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import CafeDesLanguesPage, { metadata } from "@/app/cafe-des-langues/page";
import { CafePilotInterest } from "@/components/cafe/CafePilotInterest";

const page = readFileSync("app/cafe-des-langues/page.tsx", "utf8");
const form = readFileSync("components/cafe/CafePilotInterest.tsx", "utf8");
const plan = readFileSync("docs/product/cafe-des-langues/pilot-v1.md", "utf8");
const rules = readFileSync("docs/product/cafe-des-langues/community-rules.md", "utf8");
const safety = readFileSync("docs/product/cafe-des-langues/moderation-privacy-checklist.md", "utf8");

async function main() {
  assert.equal(typeof metadata.robots, "object", "pilot should have explicit robots meta directives");
  if (typeof metadata.robots !== "object" || metadata.robots === null) throw new Error("missing robots directives");
  assert.equal(metadata.robots.index, false, "pilot preview must not be indexed before safety signoff");
  assert.equal(metadata.robots.follow, false);
  assert.match(page, /getYoLocale/, "language query is validated");
  assert.match(page, /lang=\$\{value\}/, "language links remain within pilot page");
  assert.match(page, /id="regles"/, "community rules must be presented before interest action");
  assert.match(page, /id="participer"/);
  assert.match(page, /href="\/yo\/langues"/, "YoPratiqo bridge exists but no premium obligation");
  assert.doesNotMatch(page + form, /\/api\/|fetch\(|\.rpc\(|getSupabaseAdmin|stripe|recordCourseAssessment|recordCourseActivity/i,
    "this preview cannot collect personal data or change learning/payment records");
  assert.doesNotMatch(form, /localStorage|sessionStorage|navigator\.sendBeacon|analytics\.|document\.cookie/i,
    "participant preferences remain only in component state until self-sent email");
  assert.match(form, /mailto:/, "interest action opens a real email client");
  assert.match(form, /window\.location\.href/, "email handoff is an explicit user action");
  assert.match(form, /if \(!adult \|\| !accepted\) return/, "cannot compose without adult and rules attestations");
  assert.match(form, /type="checkbox" required/g, "adult and rules checkboxes are required");
  assert.doesNotMatch(form, /setStatus\("success"\)|\/api\/waitlist|registrationComplete|isRegistered/,
    "opening a mailto cannot assert registration success");

  for (const locale of ["fr", "en", "es"] as const) {
    const jsx = await CafeDesLanguesPage({ searchParams: Promise.resolve({ lang: locale }) });
    const html = renderToStaticMarkup(jsx);
    assert.match(html, new RegExp(`lang="${locale}"`));
    assert.match(html, /data-cafe-pilot-page/);
    assert.match(html, /data-cafe-concept-scene/);
    assert.match(html, /href="#cafes"/, "simple conversation discovery is accessible");
    assert.match(html, /href="#fonctionnement"/);
    assert.match(html, /aria-disabled="true"/, "one-to-one must be clearly unavailable");
    assert.match(html, /data-cafe-interest/, "interest UI renders in all 3 languages");
    assert.ok(html.includes("18+"), "adult-only character must be visible");
    assert.ok(html.includes("30 min"), "pilot session has a defined format");
    assert.ok(html.includes("5"), "group capacity must be specified");
    assert.ok(html.includes("info@pratiqo.ca"), "actual support address");
    assert.ok(html.includes({ fr: "Caméra facultative", en: "Camera optional", es: "Cámara opcional" }[locale]), "camera optional is clearly presented");
    assert.ok(html.includes({ fr: "Aucune date ni réservation", en: "No dates or bookings", es: "Aún no hay fechas ni reservas" }[locale]), "no fake schedule or booking");
    assert.match(html, /href="#participer"/);
    assert.match(html, /href="#fonctionnement"/);
    assert.ok(html.includes(`href="/cafe-des-langues?lang=${locale}"`), "language toggle is navigable");
    assert.ok(!html.includes('name="password"'), "no authentication required");
    assert.ok(!html.includes("inscription confirmée"), "no fake successful registration");
    assert.match(html, /href="mailto:info@pratiqo\.ca"/, "visible fallback when email client is unavailable");

    const interest = renderToStaticMarkup(<CafePilotInterest locale={locale}/>);
    assert.match(interest, /data-cafe-interest/);
    assert.equal((interest.match(/type="checkbox"/g) ?? []).length, 2);
    assert.equal((interest.match(/<select /g) ?? []).length, 2);
    assert.ok(interest.includes("disabled"), "interested visitors must accept adult/rules conditions to compose");
    assert.ok(interest.includes('href="#regles"'));
    const expected = {
      fr: "Être informé du lancement",
      en: "Keep me updated",
      es: "Quiero recibir noticias",
    }[locale];
    assert.ok(html.includes(expected.replace("&", "&amp;").replace("'", "&#x27;")) ||
      html.includes(expected.replace("'", "&#x27;")) || html.includes(expected),
      `clear CTA for ${locale}`);
  }

  assert.match(plan, /8 semaines/);
  assert.match(plan, /30 minutes/);
  assert.match(plan, /5 à 8/);
  assert.match(plan, /français–espagnol/);
  assert.match(plan, /Aucune messagerie privée/);
  assert.match(plan, /aucun lancement public/);
  assert.match(rules, /18 ans/);
  assert.match(rules, /info@pratiqo\.ca/);
  assert.match(rules, /aucun enregistrement/i);
  assert.match(safety, /EFVP/);
  assert.match(safety, /Ne pas lancer des inscriptions réelles/);
  assert.match(safety, /Hors Québec|hors Québec/);
  console.log("Language Café pilot: FR/EN/ES UI, 18+ guard, no fake registration, no backend writes, hosted safety and 8-week plan PASS");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
