import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";
import { getWelcomeStudentCopy, getWelcomeTeacherCopy } from "@/lib/email/messages/welcome";

// ─── 1. Welcome Student ──────────────────────────────────────────────────────

export async function sendWelcomeStudent(email: string, name: string, locale?: EmailLocale) {
  const resolved = resolveEmailLocaleFromOptional(locale);
  const copy = getWelcomeStudentCopy(resolved);
  const base = appBaseUrl();
  await send({
    to: email,
    subject: copy.subject(name),
    html: buildEmail({
      locale: resolved,
      heroEmoji: "🌱",
      heroTitle: copy.heroTitle(name),
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: copy.bodyHtml(name),
      ctaText: copy.ctaText,
      ctaUrl: `${base}/student/choose-companion`,
    }),
  });
}

// ─── 2. Welcome Teacher ──────────────────────────────────────────────────────

export async function sendWelcomeTeacher(email: string, name: string, locale?: EmailLocale) {
  const resolved = resolveEmailLocaleFromOptional(locale);
  const copy = getWelcomeTeacherCopy(resolved);
  const base = appBaseUrl();
  await send({
    to: email,
    subject: copy.subject(name),
    html: buildEmail({
      locale: resolved,
      heroEmoji: "🎓",
      heroTitle: copy.heroTitle(name),
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: copy.bodyHtml(name),
      ctaText: copy.ctaText,
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

// ─── 3. Companion Evolution ──────────────────────────────────────────────────
// Follow-up: localize sendCompanionEvolution (FR-only today).

export async function sendCompanionEvolution(
  email: string,
  name: string,
  companionName: string,
  oldEmoji: string,
  newEmoji: string,
  oldStage: string,
  newStage: string,
  creditAmount: number,
) {
  const base = appBaseUrl();
  await send({
    to: email,
    subject: `${newEmoji} Ton compagnon a évolué ! +${creditAmount} $ de crédit`,
    html: buildEmail({
      heroTitle: `${name}, ton compagnon a évolué !`,
      heroSubtitle: `${oldEmoji} ${oldStage} → ${newEmoji} ${newStage}`,
      bodyHtml: `
        <div style="text-align:center;font-size:56px;margin:8px 0 24px;">
          ${newEmoji}
        </div>
        <p style="text-align:center;font-size:17px;font-weight:700;color:#2C2C2A;">
          ${escapeHtml(companionName)} vient de franchir une nouvelle étape!
        </p>
        <p style="text-align:center;">
          <strong>${escapeHtml(oldStage)}</strong>
          &nbsp;→&nbsp;
          <strong style="color:#409A8E;">${escapeHtml(newStage)}</strong>
        </p>
        ${tealBox(`
          <strong>+${creditAmount} $ de crédit</strong> ont été ajoutés à ton solde Pratiqo.<br>
          Ces crédits s'appliquent automatiquement à ta prochaine réservation.
        `)}
        <p>Chaque cours que tu prends fait progresser ton compagnon. Continue comme ça — la maîtrise, ça se construit un cours à la fois.</p>
        <p style="font-size:14px;color:#6B6A65;">
          Tu peux voir la progression de ton compagnon et ton solde de crédits dans ton profil.
        </p>
      `,
      ctaText: "Voir mon compagnon",
      ctaUrl: `${base}/student/progress`,
    }),
  });
}
