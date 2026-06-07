/**
 * YoPratiqo Dominican Republic Module 3 curriculum regression tests.
 *
 * Static/data tests only. No browser, network, audio generation, Stripe, or
 * Supabase.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import { dominicanRepublicFoodCulture } from "@/lib/yo/dominicanRepublicFoodCulture";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const CONTENT_FILE = "lib/yo/dominicanRepublicFoodCulture.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule3Content.tsx";
const INTERACTIVE_FILE = "components/yo/DominicanRepublicModule3Interactive.tsx";
const PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const MODULE_2_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const INTRO_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";

test("Module 3 source files exist", () => {
  for (const file of [CONTENT_FILE, COMPONENT_FILE, INTERACTIVE_FILE, PAGE_FILE]) {
    assert.ok(exists(file), `Missing ${file}`);
  }
});

test("existing intro and Module 2 routes remain intact", () => {
  assert.ok(exists(INTRO_PAGE_FILE), "Dominican intro page was removed");
  assert.ok(exists(MODULE_2_PAGE_FILE), "Dominican Module 2 page was removed");
  assert.match(read(INTRO_PAGE_FILE), /RepubliqueDominicaineContent/);
  assert.match(read(MODULE_2_PAGE_FILE), /DominicanRepublicModule2Content/);
});

test("hero copy exists in FR, EN, and ES", () => {
  const { moduleLabel, heroTitle, heroSubtitle } = dominicanRepublicFoodCulture;
  assert.equal(moduleLabel.fr, "Module 3 — Manger, commander et payer comme un local");
  assert.equal(moduleLabel.en, "Module 3 — Eat, order, and pay like a local");
  assert.equal(moduleLabel.es, "Módulo 3 — Comer, pedir y pagar como un local");
  assert.equal(heroTitle.fr, "Manger, commander et payer comme un local");
  assert.equal(heroTitle.en, "Eat, order, and pay like a local");
  assert.equal(heroTitle.es, "Comer, pedir y pagar como un local");
  assert.match(heroSubtitle.fr, /vraie expérience dominicaine/);
  assert.match(heroSubtitle.en, /real Dominican experience/);
  assert.match(heroSubtitle.es ?? "", /experiencia dominicana/);
});

test("culture passport has 6 stops", () => {
  assert.equal(dominicanRepublicFoodCulture.missionStops.length, 6);
  const titles = dominicanRepublicFoodCulture.missionStops.map((stop) => stop.title.fr);
  for (const title of [
    "Petit-dejeuner dominicain",
    "Commander un plat typique",
    "Boissons et cafe",
    "Payer simplement",
    "Musique et ambiance",
    "Defi culture dominicaine",
  ]) {
    assert.ok(titles.includes(title), `Missing passport stop: ${title}`);
  }
});

test("food identity cards include 11 required Dominican food anchors", () => {
  assert.equal(dominicanRepublicFoodCulture.foodCards.length, 11);
  const names = dominicanRepublicFoodCulture.foodCards.map((card) => card.name);
  for (const name of [
    "Mangú con los tres golpes",
    "La Bandera Dominicana",
    "Sancocho",
    "Mofongo",
    "Tostones",
    "Pescado frito",
    "Habichuelas con dulce",
    "Morir soñando",
    "Jugos naturales / batidas",
    "Café dominicano",
    "Cacao / chocolate",
  ]) {
    assert.ok(names.includes(name), `Missing food card: ${name}`);
  }
});

test("culture cards include 15 required Dominican culture anchors", () => {
  assert.equal(dominicanRepublicFoodCulture.cultureCards.length, 15);
  const names = dominicanRepublicFoodCulture.cultureCards.map((card) => card.name);
  for (const name of [
    "Merengue",
    "Bachata",
    "Colmado",
    "Guagua",
    "Zona Colonial",
    "Los Haitises",
    "Samaná",
    "Pico Duarte / Jarabacoa",
    "Bahía de las Águilas",
    "Larimar",
    "Ámbar dominicano",
    "Cacao",
    "Café",
    "Muñecas sin rostro",
    "Arte taíno",
  ]) {
    assert.ok(names.includes(name), `Missing culture card: ${name}`);
  }
});

test("phrase bank has all 35 required Spanish phrases", () => {
  assert.ok(dominicanRepublicFoodCulture.phraseBank.length >= 35);
  const phrases = dominicanRepublicFoodCulture.phraseBank.map((phrase) => phrase.target);
  for (const phrase of [
    "¿Qué me recomienda?",
    "Quiero probar algo típico.",
    "¿Tiene mangú?",
    "¿Qué viene con la bandera?",
    "¿Tiene sancocho hoy?",
    "¿Qué trae este plato?",
    "¿Es picante?",
    "Sin picante, por favor.",
    "Un poco picante está bien.",
    "¿Tiene jugo natural?",
    "¿Qué sabores tiene?",
    "Quiero un jugo de chinola.",
    "Quiero un morir soñando.",
    "Un café, por favor.",
    "¿Tiene leche?",
    "Sin azúcar, por favor.",
    "Con hielo, por favor.",
    "Para comer aquí.",
    "Para llevar, por favor.",
    "¿Me trae la cuenta, por favor?",
    "¿Cuánto cuesta?",
    "¿Acepta tarjeta?",
    "¿Puedo pagar en efectivo?",
    "¿Está incluido el servicio?",
    "¿Me puede dar un recibo?",
    "Está muy bueno.",
    "Gracias, muy amable.",
    "¿Me puede repetir, por favor?",
    "Más despacio, por favor.",
    "No entendí la última parte.",
    "¿Cómo se dice eso?",
    "Soy alérgico/alérgica a...",
    "No como carne.",
    "¿Tiene una opción vegetariana?",
    "¿Dónde hay un colmado cerca?",
  ]) {
    assert.ok(phrases.includes(phrase), `Missing phrase: ${phrase}`);
  }
});

test("all three required dialogues exist with target lines", () => {
  const byId = new Map(dominicanRepublicFoodCulture.dialogues.map((dialogue) => [dialogue.id, dialogue]));
  assert.ok(byId.has("comedor"), "Missing comedor dialogue");
  assert.ok(byId.has("beach-kiosk"), "Missing beach kiosk dialogue");
  assert.ok(byId.has("payment"), "Missing payment dialogue");

  const allLines = dominicanRepublicFoodCulture.dialogues.flatMap((dialogue) =>
    dialogue.lines.map((line) => line.target),
  );
  for (const line of [
    "Hola, buenos días. ¿Qué me recomienda?",
    "Hoy tenemos la bandera, pollo guisado y sancocho.",
    "Quiero probar algo típico. ¿Qué viene con la bandera?",
    "Arroz, habichuelas, carne y ensalada.",
    "Perfecto. Una bandera, por favor.",
    "¿Para comer aquí o para llevar?",
    "Para comer aquí.",
    "Muy bien.",
    "Hola. ¿Tiene jugo natural?",
    "Sí. Tenemos chinola, mango y piña.",
    "Quiero un jugo de chinola, por favor.",
    "¿Con hielo?",
    "Sí, con hielo.",
    "Gracias, muy amable.",
    "¿Me trae la cuenta, por favor?",
    "Claro. Son quinientos pesos.",
    "¿Acepta tarjeta?",
    "Sí, aceptamos tarjeta.",
    "Perfecto. ¿Me puede dar un recibo?",
  ]) {
    assert.ok(allLines.includes(line), `Missing dialogue line: ${line}`);
  }
});

test("Dominican ears and micro-grammar coverage exists", () => {
  assert.equal(dominicanRepublicFoodCulture.earCards.length, 5);
  assert.equal(dominicanRepublicFoodCulture.grammarCards.length, 9);
  const patterns = dominicanRepublicFoodCulture.grammarCards.map((card) => card.pattern);
  for (const pattern of [
    "Quiero + noun",
    "¿Tiene...?",
    "¿Qué viene con...?",
    "¿Cuánto cuesta...?",
    "¿Acepta...?",
    "Para comer aquí / para llevar",
    "Sin / con",
    "¿Me trae...?",
    "¿Me puede...?",
  ]) {
    assert.ok(patterns.includes(pattern), `Missing grammar pattern: ${pattern}`);
  }
});

test("flashcards, quiz, final game, and printables meet required counts", () => {
  assert.ok(dominicanRepublicFoodCulture.flashcards.length >= 30);
  assert.ok(dominicanRepublicFoodCulture.quizQuestions.length >= 12);
  assert.equal(dominicanRepublicFoodCulture.finalGame.rounds.length, 8);
  assert.equal(dominicanRepublicFoodCulture.printableSheets.length, 4);
});

test("quiz contains required food/payment/culture questions", () => {
  const prompts = dominicanRepublicFoodCulture.quizQuestions.map((question) => question.prompt.en).join("\n");
  for (const fragment of [
    "ask for a recommendation",
    "accept card",
    "ask for the bill",
    "to go",
    "rice/beans/meat",
    "guagua",
    "speak more slowly",
  ]) {
    assert.match(prompts, new RegExp(fragment, "i"), `Missing quiz topic: ${fragment}`);
  }
});

test("Modules 2, 3, 4, and 5 are all live in the Dominican path (capstone reached)", () => {
  // Module 5 (A2 capstone) went live in feat/yo-dominican-module-5-a2-capstone.
  // The full Dominican RD series is now reachable end-to-end. There is no
  // Module 6 in the lesson path, so the lesson-path length must remain 5.
  const steps = dominicanRepublicA1.lessonPath;
  const module2 = steps.find((step) => step.position === 2);
  const module3 = steps.find((step) => step.position === 3);
  const module4 = steps.find((step) => step.position === 4);
  const module5 = steps.find((step) => step.position === 5);
  assert.equal(module2?.status, "available");
  assert.equal(module2?.href, "/yo/langues/espagnol/pays/republique-dominicaine/module-2");
  assert.equal(module3?.status, "available");
  assert.equal(module3?.href, "/yo/langues/espagnol/pays/republique-dominicaine/module-3");
  assert.equal(module4?.status, "available");
  assert.equal(module4?.href, "/yo/langues/espagnol/pays/republique-dominicaine/module-4");
  assert.equal(module5?.status, "available");
  assert.equal(module5?.href, "/yo/langues/espagnol/pays/republique-dominicaine/module-5");
  assert.equal(steps.length, 5, "Dominican path must have exactly 5 lessons (no fake Module 6).");
});

test("Spanish target phrases are rendered with lang markers", () => {
  const component = read(COMPONENT_FILE);
  const interactive = read(INTERACTIVE_FILE);
  assert.match(component, /lang="es"/);
  assert.match(interactive, /lang="es"/);
});

test("Module 3 files do not import restricted systems or audio assets", () => {
  for (const file of [CONTENT_FILE, COMPONENT_FILE, INTERACTIVE_FILE, PAGE_FILE]) {
    const src = stripComments(read(file));
    for (const forbidden of [
      "stripe",
      "Stripe",
      "supabase",
      "Supabase",
      "createPaymentIntent",
      "checkout_session",
      ".mp3",
      "generateAudio",
      "synthesize",
      "openai",
      "OpenAI",
      "membrePro",
      "commission",
      "sitemap",
      "courseSchema",
    ]) {
      assert.ok(!src.includes(forbidden), `Forbidden pattern "${forbidden}" in ${file}`);
    }
  }
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 3\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed · ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
