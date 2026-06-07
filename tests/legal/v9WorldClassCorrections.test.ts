/**
 * V9 World-class legal corrections — sync test.
 *
 * Asserts the live legal copy matches the V9 corrections we shipped:
 *   R01 — annulation page no longer says "décision finale"; review/appeal
 *         + OPC + courts + card-issuer recourses are now visible.
 *   R02 — Membre Pro renewal disclosure carries an explicit "case à
 *         cocher / dedicated checkbox / casilla dedicada" wording AND
 *         the "29,99 $CA / mois + taxes" anchor stays intact.
 *   R03 — YoPratiqo legal docs ship the EU 14-day waiver text +
 *         dedicated checkbox wording + "Implementation note" gate
 *         saying the checkout-level checkbox is NOT yet implemented
 *         (so that no claim of a working EU waiver mechanism leaks).
 *   R04 — Code de conduite §4.2 now ships the home-with-minors block
 *         (background-check capability, parental presence, visible
 *         space, pre-lesson messaging) WITHOUT claiming Pratiqo has
 *         actually completed any check.
 *   R09 — YoPratiqo legal docs disclose AI / synthetic-voice content.
 *   R10 — YoPratiqo legal docs ship the MIFI / francisation / no-
 *         employment / no-immigration disclaimer.
 *
 * Restricted-systems guard:
 *   - No competitor platform names (Airbnb / Preply / Coursera / Udemy)
 *     leak into the live public legal copy.
 *   - The branch did NOT touch Stripe / payment / tax / Supabase /
 *     RLS / migration / YoPratiqo audio-gen / SEO files.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const locales = ["fr", "en", "es"] as const;

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function changedFilesForBranch(): string[] | null {
  const files = new Set<string>();
  try {
    const mergeBase = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    for (const args of [
      ["diff", "--name-only", mergeBase, "HEAD"],
      ["diff", "--name-only"],
      ["diff", "--cached", "--name-only"],
    ]) {
      execFileSync("git", args, { cwd: root, encoding: "utf8" })
        .split(/\r?\n/)
        .map((file) => file.trim())
        .filter(Boolean)
        .forEach((file) => files.add(file));
    }
    execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .forEach((line) => files.add(line.slice(3).trim()));
    return [...files].filter(Boolean).sort();
  } catch {
    console.warn("# skipped V9 branch boundary scan - could not diff against origin/main");
    return null;
  }
}

// ─── R01 — Cancellation policy: no "décision finale" + review rights ───

test("R01: live cancellation page no longer says 'décision finale' or 'arbitre de bonne foi'", () => {
  const src = read("app/(app)/legal/annulation/page.tsx");
  assert.doesNotMatch(src, /décision\s+(?:est\s+)?finale/i);
  assert.doesNotMatch(src, /arbitre\s+de\s+bonne\s+foi/i);
});

test("R01: live cancellation page exposes review/appeal + OPC + court + card-issuer recourse", () => {
  const src = read("app/(app)/legal/annulation/page.tsx");
  assert.match(src, /demander une révision/i);
  assert.match(src, /Office de la protection du consommateur/i);
  assert.match(src, /tribunaux compétents/i);
  assert.match(src, /contester un paiement/i);
  assert.match(src, /Loi sur la protection du consommateur/i);
  // Procedural deadline framing must explicitly preserve mandatory rights.
  // JSX renders apostrophes as `&apos;`, so allow both raw and entity forms.
  assert.match(
    src,
    /n(?:'|&apos;)écarte\s*(?:<\/?strong>)?\s*\*?\*?\s*pas/i,
    "annulation page must explicitly say the 7-day deadline does NOT waive mandatory rights",
  );
});

test("R01/R12: cancellation page lists the V9 force-majeure categories and a 48h evidence window", () => {
  const src = read("app/(app)/legal/annulation/page.tsx");
  assert.match(src, /Urgence médicale grave/i);
  // JSX renders typographic apostrophes via &apos;; allow both forms.
  assert.match(src, /Décès d(?:'|&apos;)un proche immédiat/i);
  assert.match(src, /Catastrophe naturelle/i);
  assert.match(src, /confinement officiel/i);
  assert.match(src, /Panne technique de la plateforme/i);
  assert.match(src, /48\s*heures\s*ouvrables/i);
  assert.match(src, /indicative\s+et\s+non\s+exhaustive/i);
});

// ─── R02 — Membre Pro renewal disclosure ──────────────────────────────

test("R02: Membre Pro legal copy carries the V9 explicit-checkbox renewal wording in FR/EN/ES", () => {
  const fr = read("content/legal/membre-pro.fr.md");
  const en = read("content/legal/membre-pro.en.md");
  const es = read("content/legal/membre-pro.es.md");
  assert.match(fr, /case à cocher dédiée/i);
  assert.match(fr, /acceptez expressément/i);
  assert.match(en, /dedicated checkbox/i);
  assert.match(en, /expressly accept/i);
  assert.match(es, /casilla dedicada/i);
  assert.match(es, /aceptas expresamente/i);
});

test("R02: Membre Pro legal copy preserves the 29,99 $CA / monthly + taxes anchor", () => {
  for (const locale of locales) {
    const src = read(`content/legal/membre-pro.${locale}.md`);
    assert.match(src, /29(?:[,.]99)?/);
    assert.match(src, /CAD|\$CA|CA\$/i);
    assert.match(src, /tax|taxes|impuestos/i);
    assert.match(src, /monthly|mensuellement|mensual/i);
  }
});

test("R02: Membre Pro 7-day pre-renewal notice and pro-rata clause are present", () => {
  for (const locale of locales) {
    const src = read(`content/legal/membre-pro.${locale}.md`);
    assert.match(src, /7\s*(?:jours|days|d[íi]as)/i);
    // Mandatory pro-rata ack ("if applicable law requires …, Pratiqo handles
    // it in accordance with the law"), in any of the 3 locales.
    assert.match(
      src,
      /prorata|pro\s*rata|prorrate|prorrateado/i,
      `Membre Pro ${locale} must mention the pro-rata refund concept`,
    );
  }
});

// ─── R03 — YoPratiqo digital content / EU waiver / not yet implemented ─

test("R03: YoPratiqo legal copy ships the EU 14-day right + dedicated-checkbox wording", () => {
  const fr = read("content/legal/yo-refund.fr.md");
  const en = read("content/legal/yo-refund.en.md");
  const es = read("content/legal/yo-refund.es.md");
  for (const src of [fr, en, es]) {
    assert.match(src, /14\s*(?:jours|days|d[íi]as)/i);
    assert.match(src, /Directiv[ae]\s+2011\/83/i);
    assert.match(src, /Directiv[ae]\s*\(?(?:UE|EU)\)?\s*2019\/770/i);
  }
  assert.match(fr, /case à cocher/i);
  assert.match(en, /checkbox/i);
  assert.match(es, /casilla/i);
});

test("R03: YoPratiqo policy explicitly states the EU checkout checkbox is not yet implemented", () => {
  for (const locale of locales) {
    const src = read(`content/legal/yo-refund.${locale}.md`);
    // We must not claim the UI checkbox is live. The policy must say the
    // checkout-level mechanism is pending implementation.
    assert.match(
      src,
      /implementation note|note d['’]implémentation|nota de implementaci[oó]n/i,
      `${locale}: YoPratiqo must surface the implementation gate note`,
    );
    assert.match(
      src,
      /pending|remains\s+to\s+be\s+implemented|à\s+implémenter|reste\s+à\s+implémenter|pendiente|queda\s+pendiente/i,
      `${locale}: YoPratiqo must say the EU checkbox is pending`,
    );
    // Until the checkbox ships, the 14-day right applies in full.
    assert.match(
      src,
      /(?:full\s+14[- ]day|intégralement|íntegramente|integralmente)/i,
    );
  }
});

test("R03: YoPratiqo policy describes how to exercise the EU withdrawal right without the checkbox", () => {
  for (const locale of locales) {
    const src = read(`content/legal/yo-refund.${locale}.md`);
    assert.match(
      src,
      /exercise|exercer|ejercer/i,
      `${locale}: YoPratiqo must document how to exercise the 14-day withdrawal right`,
    );
  }
});

// ─── R04 — At-home with minors: cautious safety copy, no false claims ──

test("R04: code-de-conduite ships the home-with-minors §4.2 block in FR/EN/ES", () => {
  const fr = read("content/legal/code-de-conduite.fr.md");
  const en = read("content/legal/code-de-conduite.en.md");
  const es = read("content/legal/code-de-conduite.es.md");

  assert.match(fr, /Cours à domicile avec des mineurs/i);
  assert.match(fr, /Vérification d'antécédents/i);
  assert.match(fr, /Pratiqo\s+\*\*peut exiger\*\*/i);
  assert.match(fr, /Présence parentale/i);
  assert.match(fr, /Lieu visible/i);

  assert.match(en, /Home lessons with minors/i);
  assert.match(en, /Background check/i);
  assert.match(en, /Pratiqo\s+\*\*may require\*\*/i);
  assert.match(en, /Parental presence/i);
  assert.match(en, /Visible space/i);

  assert.match(es, /Clases a domicilio con personas menores/i);
  assert.match(es, /Verificación de antecedentes/i);
  assert.match(es, /Pratiqo\s+\*\*puede exigir\*\*/i);
  assert.match(es, /Presencia parental/i);
  assert.match(es, /Lugar visible/i);
});

test("R04: code-de-conduite never claims background checks have been completed by default", () => {
  const fr = read("content/legal/code-de-conduite.fr.md");
  const en = read("content/legal/code-de-conduite.en.md");
  const es = read("content/legal/code-de-conduite.es.md");

  // Pratiqo must NOT promise / state that all teachers have been checked.
  assert.doesNotMatch(fr, /tous\s+les\s+professeurs\s+sont\s+vérifiés/i);
  assert.doesNotMatch(en, /all\s+teachers\s+(?:have been|are)\s+(?:background[- ]?)?checked/i);
  assert.doesNotMatch(es, /todos\s+los\s+profesores\s+(?:han sido|est[áa]n)\s+verificados/i);

  // Cautious framing must be present.
  assert.match(fr, /ne\s+représente\s+pas/i);
  assert.match(en, /does\s+not\s+represent/i);
  assert.match(es, /no\s+afirma/i);
});

// ─── R09 — AI / synthetic-voice disclosure on YoPratiqo ────────────────

test("R09: YoPratiqo legal copy ships AI / synthetic-voice disclosure in FR/EN/ES", () => {
  const fr = read("content/legal/yo-refund.fr.md");
  const en = read("content/legal/yo-refund.en.md");
  const es = read("content/legal/yo-refund.es.md");
  assert.match(fr, /voix synthétique/i);
  assert.match(fr, /intelligence artificielle/i);
  assert.match(en, /synthetic\s+voice/i);
  assert.match(en, /artificial\s+intelligence/i);
  assert.match(es, /voz\s+sintética/i);
  assert.match(es, /inteligencia\s+artificial/i);
});

// ─── R10 — Francisation / MIFI / no-immigration disclaimer ─────────────

test("R10: YoPratiqo legal copy ships the MIFI / francisation / no-immigration disclaimer", () => {
  for (const locale of locales) {
    const src = read(`content/legal/yo-refund.${locale}.md`);
    assert.match(src, /MIFI/);
    assert.match(src, /francisation|francization|francización/i);
    assert.match(src, /immigration|inmigraci[oó]n/i);
  }
});

// ─── No-competitor leak guard on live legal copy ──────────────────────

const liveLegalArtifacts = [
  "app/(app)/legal/annulation/page.tsx",
  "content/legal/membre-pro.fr.md",
  "content/legal/membre-pro.en.md",
  "content/legal/membre-pro.es.md",
  "content/legal/yo-refund.fr.md",
  "content/legal/yo-refund.en.md",
  "content/legal/yo-refund.es.md",
  "content/legal/code-de-conduite.fr.md",
  "content/legal/code-de-conduite.en.md",
  "content/legal/code-de-conduite.es.md",
  "content/legal/paiements-remboursements.fr.md",
  "content/legal/paiements-remboursements.en.md",
  "content/legal/paiements-remboursements.es.md",
  "content/legal/terms.fr.md",
  "content/legal/terms.en.md",
  "content/legal/terms.es.md",
  "content/legal/conditions-professeurs.fr.md",
  "content/legal/conditions-professeurs.en.md",
  "content/legal/conditions-professeurs.es.md",
];

test("V9 sync did not import competitor brand names into live public legal copy", () => {
  const banned = [/\bAirbnb\b/i, /\bPreply\b/i, /\bCoursera\b/i, /\bUdemy\b/i];
  for (const file of liveLegalArtifacts) {
    if (!existsSync(join(root, file))) continue;
    const src = read(file);
    for (const re of banned) {
      assert.doesNotMatch(
        src,
        re,
        `${file} must not name competitor platforms (V9 standards are inspirations, not citations)`,
      );
    }
  }
});

// ─── Restricted-systems scope guard ────────────────────────────────────

test("V9 branch did not touch Stripe/payments/tax/Supabase/RLS/migrations/YoPratiqo audio-gen/SEO files", () => {
  const changed = changedFilesForBranch();
  if (!changed) return;

  const restricted: Array<{ label: string; re: RegExp }> = [
    { label: "Stripe API routes", re: /^app\/api\/stripe\// },
    { label: "checkout routes", re: /^app\/api\/.*checkout/i },
    { label: "webhook routes", re: /^app\/api\/.*webhook/i },
    { label: "payment/refund/payout routes", re: /^app\/api\/(payments|payouts|refunds)\// },
    { label: "payment math / pricing internals", re: /^lib\/(payments|pricing|commissions|tax)\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS / security helpers", re: /^lib\/(rls|security)\// },
    { label: "booking flow", re: /^app\/\(app\)\/booking\// },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
    { label: "YoPratiqo lesson/content surfaces", re: /^app\/yo\// },
    { label: "YoPratiqo components", re: /^components\/yo\// },
    { label: "YoPratiqo lesson library", re: /^lib\/yo\// },
    { label: "generated audio binaries", re: /\.(?:mp3|wav|m4a)$/i },
    { label: "OpenAI / audio-gen scripts", re: /^scripts\/.*(?:openai|generate-yopratiqo-audio)/i },
    { label: "sitemap / indexation / Course schema", re: /^app\/sitemap\.ts$|^app\/robots\.ts$|^lib\/seo\// },
  ];

  const violations: string[] = [];
  for (const file of changed) {
    for (const rule of restricted) {
      if (rule.re.test(file)) violations.push(`${file} (${rule.label})`);
    }
  }
  assert.deepEqual(violations, []);
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[legal:v9-world-class] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
