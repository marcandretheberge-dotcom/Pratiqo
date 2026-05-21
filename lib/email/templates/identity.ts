import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";

// ─── 7. Identity Verified ────────────────────────────────────────────────────

export async function sendIdentityVerified(email: string, name: string) {
  const base = appBaseUrl();
  await send({
    to: email,
    subject: "✓ Identité vérifiée — Pratiqo",
    html: buildEmail({
      heroEmoji: "✅",
      heroTitle: "Ton identité est vérifiée !",
      heroSubtitle: "Le badge « Identité vérifiée » est maintenant visible sur ton profil.",
      bodyHtml: `
        <p>Bonne nouvelle ${escapeHtml(name)}&nbsp;!</p>
        <p>Ton identité a été vérifiée avec succès par Stripe. Ton profil affiche maintenant le badge <strong>Identité vérifiée</strong>.</p>
        ${tealBox(`
          <strong>Ce que ça change :</strong><br>
          · Ton profil apparaît plus haut dans les recherches<br>
          · Les élèves te font davantage confiance<br>
          · Ton taux de réservation augmente en moyenne de 40 %
        `)}
        <p style="font-size:14px;color:#6B6A65;">D'ici, pour ici.</p>
      `,
      ctaText: "Voir mon profil",
      ctaUrl: `${base}/teacher/verification`,
    }),
  });
}

// ─── 8. Identity Failed ──────────────────────────────────────────────────────

export async function sendIdentityFailed(email: string, name: string, reason: string) {
  const base = appBaseUrl();
  await send({
    to: email,
    subject: "Vérification d'identité — action requise",
    html: buildEmail({
      heroEmoji: "🔄",
      heroTitle: "On doit reprendre la vérification",
      heroSubtitle: "La vérification n'a pas pu être complétée.",
      bodyHtml: `
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>La vérification n'a pas pu être complétée.</p>
        ${tealBox(`<strong>Raison :</strong> ${escapeHtml(reason)}`)}
        <p>Tu peux relancer la vérification depuis ton tableau de bord.</p>
      `,
      ctaText: "Reprendre la vérification",
      ctaUrl: `${base}/teacher/verification`,
    }),
  });
}
