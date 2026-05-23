import assert from "node:assert/strict";
import { buildProUpgradeEmail } from "@/lib/email/templates/billing";
import {
  buildIdentityFailedEmail,
  buildIdentityVerifiedEmail,
} from "@/lib/email/templates/identity";
import { buildReviewPublishedTeacherEmail } from "@/lib/email/templates/reviews";
import { buildCompanionEvolutionEmail } from "@/lib/email/templates/welcome";
import type { EmailLocale } from "@/lib/email/locale";

process.env.APP_BASE_URL = "https://www.pratiqo.ca";

const LOCALES: EmailLocale[] = ["fr", "en", "es"];

const EXPECTED_SUBJECTS = {
  companion: {
    fr: "Votre compagnon a évolué 🎉",
    en: "Your companion evolved 🎉",
    es: "Tu compañero evolucionó 🎉",
  },
  pro: {
    fr: "Votre profil Pratiqo Pro est actif",
    en: "Your Pratiqo Pro profile is active",
    es: "Tu perfil Pratiqo Pro está activo",
  },
  identityVerified: {
    fr: "Votre identité a été vérifiée",
    en: "Your identity has been verified",
    es: "Tu identidad fue verificada",
  },
  identityFailed: {
    fr: "Nous n’avons pas pu vérifier votre identité",
    en: "We couldn’t verify your identity",
    es: "No pudimos verificar tu identidad",
  },
  review: {
    fr: "Un nouvel avis a été publié sur votre profil",
    en: "A new review was published on your profile",
    es: "Se publicó una nueva reseña en tu perfil",
  },
} satisfies Record<string, Record<EmailLocale, string>>;

function assertNoRawKeys(html: string) {
  assert.doesNotMatch(
    html,
    /\b(companionEvolution|proUpgrade|identityVerified|identityFailed|reviewPublishedTeacher)\b/,
  );
}

function assertInternalCta(ctaUrl: string, path: string) {
  assert.equal(ctaUrl, `https://www.pratiqo.ca${path}`);
}

for (const locale of LOCALES) {
  const companion = buildCompanionEvolutionEmail({
    name: "Camille",
    companionName: "La Forêt",
    oldEmoji: "🌱",
    newEmoji: "🌿",
    oldStage: "La Graine",
    newStage: "La Pousse",
    locale,
  });
  assert.equal(companion.subject, EXPECTED_SUBJECTS.companion[locale]);
  assertInternalCta(companion.ctaUrl, "/student/progress");
  assertNoRawKeys(companion.html);

  const pro = buildProUpgradeEmail({ name: "Marc", locale });
  assert.equal(pro.subject, EXPECTED_SUBJECTS.pro[locale]);
  assertInternalCta(pro.ctaUrl, "/teacher/my-profile");
  assertNoRawKeys(pro.html);
  assert.doesNotMatch(
    pro.html,
    /guarantee|guaranteed|ranking|revenue|students guaranteed|garanti|garantie|classement|revenu|ingresos|garantizado/i,
  );

  const verified = buildIdentityVerifiedEmail({ name: "Ariane", locale });
  assert.equal(verified.subject, EXPECTED_SUBJECTS.identityVerified[locale]);
  assertInternalCta(verified.ctaUrl, "/dashboard");
  assertNoRawKeys(verified.html);

  const failed = buildIdentityFailedEmail({
    name: "Ariane",
    reason: "document_unreadable",
    locale,
  });
  assert.equal(failed.subject, EXPECTED_SUBJECTS.identityFailed[locale]);
  assertInternalCta(failed.ctaUrl, "/teacher/verification");
  assertNoRawKeys(failed.html);
  assert.doesNotMatch(failed.html, /fraud|fraudulent|fraude|fraudulento/i);

  const review = buildReviewPublishedTeacherEmail({
    teacherName: "Marc",
    rating: 5,
    reviewContent: "Très bon cours.",
    studentFirstName: "Sofia",
    reviewId: "review_123",
    locale,
  });
  assert.equal(review.subject, EXPECTED_SUBJECTS.review[locale]);
  assertInternalCta(review.ctaUrl, "/teacher/profile");
  assertNoRawKeys(review.html);
  assert.doesNotMatch(review.html, /\$1|1\s*\$|\b1\s*dollar\b/i);
}

console.log("Email notification localization tests passed");
