/**
 * Regression suite for the public-facing Pratiqo testimonials.
 *
 * What we guard against (and why):
 *
 *  1. Testimonial avatar/label mismatch on the landing page
 *     (`SocialProofTestimonials`). The illustrative avatar at
 *     `/images/testimonials/testimonial-language-student.webp` reads as
 *     masculine to most viewers; using the feminine "Étudiante" label
 *     looked unprofessional. We assert the FR/EN/ES labels stay
 *     gender-neutral.
 *
 *  2. Unsupported launch disciplines on `/devenir-enseignant` and
 *     `/become-teacher`. Pratiqo currently ships only musique /
 *     langues / tutorat académique / related skills. References to
 *     Danse / Dance / Danza / Arts Martiaux / Martial Arts / Judo in
 *     public testimonials are misleading and we forbid them at the
 *     source level.
 *
 *  3. Risky / unverified business claims in public testimonials —
 *     fabricated growth metrics ("doublé mes élèves en 3 mois"),
 *     guaranteed visibility ("la visibilité est incroyable"), and
 *     guaranteed-income / guaranteed-ranking wording. The declining
 *     commission model (régressive / decreciente / declining) is now
 *     canonical — see lib/config/membrePro `MEMBRE_PRO_COMMISSION_MODEL`
 *     and tests/marketing/membreProCommissionModel.test.ts — so those
 *     terms are intentionally no longer flagged here.
 *
 *  4. Fabricated growth metrics in the hero strip ("2 400+ profs"):
 *     Pratiqo is pre-launch and cannot ship that number publicly.
 *
 * Static-source style — matches `tests/search/segmentedSearchFields.test.ts`.
 * No browser automation, no payments / Supabase / RLS / migration code.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();

const fr = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "fr.json"), "utf8"),
) as Record<string, string>;
const en = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "en.json"), "utf8"),
) as Record<string, string>;
const es = JSON.parse(
  readFileSync(join(root, "lib", "i18n", "locales", "es.json"), "utf8"),
) as Record<string, string>;

const devenirEnseignantSrc = readFileSync(
  join(root, "app", "(marketing)", "devenir-enseignant", "DevenirEnseignantContent.tsx"),
  "utf8",
);
const becomeTeacherSrc = readFileSync(
  join(root, "app", "become-teacher", "page.tsx"),
  "utf8",
);

// ── Landing page: socialProofTestimonial2 author/alt parity ────────────
test("Landing language testimonial uses gender-neutral labels in fr/en/es", () => {
  // FR: explicitly neutral. The image reads as masculine; the prior
  // "Étudiante" label produced a credibility-breaking mismatch.
  assert.equal(
    fr.socialProofTestimonial2Author,
    "Apprenant en langues",
    "FR author label must be gender-neutral",
  );
  assert.ok(
    !/étudiante/i.test(fr.socialProofTestimonial2Author!),
    "FR author label must not use the feminine 'Étudiante'",
  );

  assert.equal(
    en.socialProofTestimonial2Author,
    "Language learner",
    "EN author label must be 'Language learner'",
  );

  // ES "Estudiante de idiomas" is grammatically gender-neutral and
  // already passes the credibility bar; the alt text used a feminine
  // article ("una estudiante") which we replace with a neutral phrase.
  assert.equal(es.socialProofTestimonial2Author, "Estudiante de idiomas");
});

test("Landing language testimonial alt text is gender-neutral in fr/en/es", () => {
  assert.equal(
    fr.testimonialLanguageStudentAlt,
    "Portrait illustratif d’un apprenant en langues",
    "FR alt text must be gender-neutral",
  );
  assert.ok(
    !/d['’]une étudiante/i.test(fr.testimonialLanguageStudentAlt!),
    "FR alt text must not use feminine wording",
  );

  assert.equal(
    en.testimonialLanguageStudentAlt,
    "Illustrative portrait of a language learner",
  );

  assert.equal(
    es.testimonialLanguageStudentAlt,
    "Retrato ilustrativo de una persona aprendiendo idiomas",
  );
  assert.ok(
    !/una estudiante/i.test(es.testimonialLanguageStudentAlt!),
    "ES alt text must not use feminine wording",
  );
});

test("Landing testimonial body keeps the proper-noun 'Facebook' capitalisation", () => {
  assert.ok(
    /groupes Facebook/.test(fr.socialProofTestimonial2Body!),
    "FR body must say 'groupes Facebook' (capital F)",
  );
  assert.ok(
    !/groupes facebook/.test(fr.socialProofTestimonial2Body!),
    "FR body must not contain a lowercase 'groupes facebook'",
  );
});

// ── Public teacher recruitment pages: launch-scope discipline guard ────
const FORBIDDEN_DISCIPLINES = [
  // FR
  /\bDanse\b/,
  /\bArts\s*Martiaux\b/i,
  /\bJudo\b/,
  // EN
  /\bDance\b/,
  /\bMartial\s*Arts\b/i,
  // ES
  /\bDanza\b/,
  /\bArtes\s*Marciales\b/i,
];

function publicSlice(src: string, marker: RegExp): string {
  // Limit the regex check to the testimonials block so we don't accidentally
  // collide with feature/copy text elsewhere on the page.
  const idx = src.search(marker);
  if (idx < 0) return src; // marker absent → fall back to whole-file scan
  return src.slice(idx, idx + 4000);
}

test("/devenir-enseignant testimonials avoid disciplines Pratiqo does not yet offer", () => {
  const block = publicSlice(devenirEnseignantSrc, /testimonials:\s*\[/);
  for (const re of FORBIDDEN_DISCIPLINES) {
    assert.ok(
      !re.test(block),
      `DevenirEnseignantContent testimonials must not mention ${re}`,
    );
  }
});

test("/become-teacher testimonials avoid disciplines Pratiqo does not yet offer", () => {
  // The legacy become-teacher page still ships hardcoded FR strings
  // for its testimonial cards. Even there we must not reference
  // disciplines that aren't on the platform.
  const block = publicSlice(becomeTeacherSrc, /TESTIMONIALS/);
  for (const re of FORBIDDEN_DISCIPLINES) {
    assert.ok(
      !re.test(block),
      `become-teacher testimonials must not mention ${re}`,
    );
  }
});

// ── Public teacher recruitment pages: claim-safety guard ───────────────
//
// We only flag claims that would be misleading regardless of plan
// (fabricated growth, guaranteed income/visibility/ranking). Declining
// commission language is canonical (see membreProCommissionModel.test.ts)
// and is intentionally not in this list.
const RISKY_CLAIMS = [
  /doubl(é|ed)\s+(mes\s+élèves|my\s+students)/i,
  /dupliqu(é|ed)\s+mis\s+alumnos/i,
  /visibilit(é|y)\s+(est\s+)?incroyable/i,
  /visibilidad\s+(es\s+)?incre[ií]ble/i,
  /incredible\s+visibility/i,
  /revenus\s+garantis/i,
  /guaranteed\s+income/i,
  /visibilit[éy]?\s+garantie/i,
  /guaranteed\s+visibility/i,
  /ingresos\s+garantizados/i,
  /guaranteed\s+(ranking|bookings)/i,
  /posicionamiento\s+garantizado/i,
  /positionnement\s+garanti/i,
];

test("/devenir-enseignant testimonials carry no unsupported business claims", () => {
  const block = publicSlice(devenirEnseignantSrc, /testimonials:\s*\[/);
  for (const re of RISKY_CLAIMS) {
    assert.ok(
      !re.test(block),
      `DevenirEnseignantContent testimonials must not contain ${re}`,
    );
  }
});

test("/become-teacher testimonial cards carry no unsupported business claims", () => {
  const block = publicSlice(becomeTeacherSrc, /TESTIMONIALS/);
  for (const re of RISKY_CLAIMS) {
    assert.ok(
      !re.test(block),
      `become-teacher testimonials must not contain ${re}`,
    );
  }
});

// ── Hero metric guard: no fabricated growth numbers ────────────────────
test("/devenir-enseignant hero strip drops the fabricated '2 400+' profs metric", () => {
  assert.ok(
    !/2[\s\u202F\u00A0]?400\+/.test(devenirEnseignantSrc),
    "DevenirEnseignantContent hero must not advertise a 2 400+ teacher count pre-launch",
  );
});

// ── Plans summary card: no contradiction with the canonical model ─────
test("/devenir-enseignant plans-summary does not advertise commission as flat/fixed/permanent", () => {
  // Pratiqo's canonical commission is *régressive / declining* — see
  // lib/config/membrePro `MEMBRE_PRO_COMMISSION_MODEL`. Marketing copy
  // must not contradict that with "flat", "fixed", "permanent" or
  // "guaranteed" wording.
  for (const re of [
    /flat\s+(commission|5\s*%|10\s*%)/i,
    /fixed\s+commission/i,
    /commission\s+fixe/i,
    /comisi[oó]n\s+fija/i,
    /permanent\s+(5\s*%|10\s*%|reduction)/i,
    /guaranteed\s+commission/i,
    /pour\s+toujours/i,
    /\bforever\s+(5\s*%|10\s*%)/i,
  ]) {
    assert.ok(
      !re.test(devenirEnseignantSrc),
      `Plans summary must not include ${re}`,
    );
  }
});

test("/devenir-enseignant plans-summary uses canonical $29 monthly price (not stale 29.99)", () => {
  // Stripe charges the canonical price exposed by lib/config/membrePro
  // (`proMonthlyPriceCad`). Marketing summary cards must not display
  // the legacy 29.99 figure that contradicts /upgrade.
  assert.ok(
    !/29[,.]99/.test(devenirEnseignantSrc),
    "Plans summary must not display the stale 29.99 / 29,99 monthly price",
  );
});

// ── Run ─────────────────────────────────────────────────────────────────
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
  console.log(`[marketing:testimonialsLaunchScope] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
