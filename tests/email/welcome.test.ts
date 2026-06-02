import assert from "node:assert/strict";
import { EMAIL_FALLBACK_LOCALE } from "@/lib/email/locale";
import { getWelcomeStudentCopy, getWelcomeTeacherCopy } from "@/lib/email/messages/welcome";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const REVIEW_INCENTIVE = /(\$1|1\s*\$).*(review|avis|reseña)|(?:review|avis|reseña).*(?:\$1|1\s*\$)/i;

test("welcome student subject and body differ by locale", () => {
  const fr = getWelcomeStudentCopy("fr");
  const en = getWelcomeStudentCopy("en");
  const es = getWelcomeStudentCopy("es");

  assert.match(fr.subject("Alex"), /Bienvenue chez Pratiqo/);
  assert.match(en.subject("Alex"), /Welcome to Pratiqo/);
  assert.match(es.subject("Alex"), /Bienvenido a Pratiqo/);

  assert.match(fr.bodyHtml("Alex"), /compagnon d'apprentissage/);
  assert.match(en.bodyHtml("Alex"), /learning companion/);
  assert.match(es.bodyHtml("Alex"), /compañero de aprendizaje/);

  assert.equal(fr.ctaText, "Choisir mon compagnon");
  assert.equal(en.ctaText, "Choose my companion");
  assert.equal(es.ctaText, "Elegir mi compañero");
});

test("welcome teacher subject and body differ by locale", () => {
  const fr = getWelcomeTeacherCopy("fr");
  const en = getWelcomeTeacherCopy("en");
  const es = getWelcomeTeacherCopy("es");

  assert.match(fr.subject("Sam"), /Bienvenue Professeur/);
  assert.match(en.subject("Sam"), /Welcome, teacher/);
  assert.match(es.subject("Sam"), /Bienvenido, profe/);

  assert.match(fr.bodyHtml("Sam"), /ristourne annuelle/);
  assert.match(en.bodyHtml("Sam"), /annual profit-sharing pool/);
  assert.match(es.bodyHtml("Sam"), /redistribución anual/);
  assert.match(fr.bodyHtml("Sam"), /15 % \/ 5 %/);
  assert.match(en.bodyHtml("Sam"), /15% \/ 5%/);
  assert.match(es.bodyHtml("Sam"), /15 % \/ 5 %/);
  assert.doesNotMatch(fr.bodyHtml("Sam"), /10 % \/ 5 %/);
  assert.doesNotMatch(en.bodyHtml("Sam"), /10% \/ 5%/);
  assert.doesNotMatch(es.bodyHtml("Sam"), /10 % \/ 5 %/);

  assert.equal(fr.ctaText, "Mon tableau de bord");
  assert.equal(en.ctaText, "My dashboard");
  assert.equal(es.ctaText, "Mi panel");
});

test("welcome copy falls back to fr when locale missing", () => {
  const student = getWelcomeStudentCopy(undefined);
  const teacher = getWelcomeTeacherCopy(undefined);

  assert.match(student.subject("Lee"), /Bienvenue/);
  assert.match(teacher.bodyHtml("Lee"), /Programme de fidélité/);
  assert.equal(EMAIL_FALLBACK_LOCALE, "fr");
});

test("welcome templates have no review-for-$1 incentive", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const student = getWelcomeStudentCopy(locale);
    const teacher = getWelcomeTeacherCopy(locale);
    const studentBlob = [
      student.subject("Test"),
      student.heroSubtitle,
      student.bodyHtml("Test"),
      student.ctaText,
    ].join("\n");
    const teacherBlob = [
      teacher.subject("Test"),
      teacher.heroSubtitle,
      teacher.bodyHtml("Test"),
      teacher.ctaText,
    ].join("\n");

    assert.doesNotMatch(studentBlob, REVIEW_INCENTIVE);
    assert.doesNotMatch(teacherBlob, REVIEW_INCENTIVE);
    assert.match(student.bodyHtml("Test"), /parrain|referr|referid/i);
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[email:welcome] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
