import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, tealBox } from "@/lib/email/layout";

// ─── 6. Pro Upgrade ──────────────────────────────────────────────────────────

export async function sendProUpgrade(email: string, name: string) {
  const base = appBaseUrl();
  await send({
    to: email,
    subject: "Bienvenue dans Pratiqo Pro 💎",
    html: buildEmail({
      heroEmoji: "💎",
      heroTitle: `${name}, tu es maintenant Pratiqo Pro !`,
      heroSubtitle: "Merci de croire en notre mission. Ce plan change tout.",
      bodyHtml: `
        <h2 style="font-size:17px;font-weight:700;margin:4px 0 16px;color:#2C2C2A;">
          ✅ Tes avantages Pro, activés maintenant
        </h2>
        ${tealBox(`
          · Commission réduite à <strong>5 %</strong> (vs 10 % gratuit)<br>
          · <strong>Élèves illimités</strong> — finis les plafonds<br>
          · Accès prioritaire aux <strong>cours de groupe</strong> (Phase 2)<br>
          · Éligibilité à la <strong>ristourne annuelle</strong> dès le premier mois Pro
        `)}

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🚀 Prochaines étapes recommandées
        </h2>
        <ol style="padding-left:20px;line-height:2;font-size:15px;margin:0 0 20px;">
          <li>Enrichis tes <strong>disponibilités</strong> pour maximiser tes réservations</li>
          <li>Ajoute une <strong>photo de profil professionnelle</strong> — ça triple les conversions</li>
          <li>Complète ta <strong>vérification d'identité</strong> pour le badge de confiance</li>
          <li>Rédige une <strong>bio complète</strong> avec ta spécialité et ton approche</li>
        </ol>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🌍 Pourquoi Pratiqo est différent
        </h2>
        <p>Chez la majorité des plateformes, les profits vont aux actionnaires. Chez Pratiqo, une partie des profits nets revient aux professeurs — la <strong>ristourne annuelle</strong>. Plus tu enseignes, plus tu contribues au pool, plus tu en reçois.</p>
        <p>On publie un <strong>rapport de transparence financière</strong> chaque année. Parce que tu mérites de savoir où va ton argent.</p>

        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          Des questions sur ton abonnement Pro? Réponds à cet email directement.
        </p>
      `,
      ctaText: "Mon tableau de bord",
      ctaUrl: `${base}/dashboard`,
      footerExtra: "Abonnement Pro · Peut être annulé en tout temps depuis Paramètres → Paiements",
    }),
  });
}
