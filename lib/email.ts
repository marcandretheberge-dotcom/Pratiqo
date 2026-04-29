import { Resend } from "resend";

// ─── Infrastructure ──────────────────────────────────────────────────────────

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.STRIPE_CHECKOUT_BASE_URL?.trim() ||
    "https://pratiqo.ca"
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

async function send(opts: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing — skipping email to:", opts.to, "subject:", opts.subject);
    return;
  }
  const resend = new Resend(key);
  console.log("[email] Sending to:", opts.to, "| subject:", opts.subject);
  try {
    const result = await resend.emails.send({
      from: "Pratiqo <onboarding@pratiqo.ca>",
      replyTo: "support@pratiqo.ca",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    console.log("[email] ✓ Sent successfully — id:", (result as { data?: { id?: string } }).data?.id ?? "unknown");
  } catch (e) {
    console.error("[email] ✗ Send failed — to:", opts.to, "subject:", opts.subject, "error:", e);
    // never rethrow — email failures must not block payments or bookings
  }
}

// ─── HTML template ───────────────────────────────────────────────────────────

interface TemplateOpts {
  heroEmoji?: string;
  heroTitle: string;
  heroSubtitle?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerExtra?: string;
}

function buildEmail(opts: TemplateOpts): string {
  const base = appBaseUrl();
  const cta = opts.ctaText && opts.ctaUrl
    ? `<div style="text-align:center;margin:32px 0 8px;">
        <a href="${opts.ctaUrl}"
           style="background:#1D9E75;color:#ffffff;text-decoration:none;
                  padding:14px 32px;border-radius:12px;font-weight:700;
                  font-size:15px;display:inline-block;letter-spacing:-0.2px;">
          ${escapeHtml(opts.ctaText)}
        </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.heroTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#F1EFE8;
             font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
             color:#2C2C2A;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
       style="background:#F1EFE8;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" width="100%" style="max-width:600px;"
             cellspacing="0" cellpadding="0">

        <!-- LOGO -->
        <tr>
          <td style="padding-bottom:20px;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center">
                  <a href="${base}" style="text-decoration:none;display:block;">
                    <img
                      src="https://pratiqo.ca/logo-email.png"
                      alt="Pratiqo"
                      width="160"
                      height="48"
                      style="display:block;border:0;max-width:160px;height:auto;"
                    />
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td style="background:#0F6E56;border-radius:16px 16px 0 0;
                     padding:36px 32px 28px;text-align:center;color:#ffffff;">
            ${opts.heroEmoji
              ? `<div style="font-size:48px;line-height:1;margin-bottom:16px;">${opts.heroEmoji}</div>`
              : ""}
            <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;
                        line-height:1.3;letter-spacing:-0.5px;color:#ffffff;">
              ${escapeHtml(opts.heroTitle)}
            </h1>
            ${opts.heroSubtitle
              ? `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);line-height:1.6;">
                   ${escapeHtml(opts.heroSubtitle)}
                 </p>`
              : ""}
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;border-radius:0 0 16px 16px;
                     padding:32px 32px 36px;">
            <div style="font-size:15px;line-height:1.7;color:#2C2C2A;">
              ${opts.bodyHtml}
            </div>
            ${cta}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:28px 16px 8px;text-align:center;
                     color:#6B6A65;font-size:12px;line-height:1.8;">
            ${opts.footerExtra
              ? `<p style="margin:0 0 8px;">${opts.footerExtra}</p>`
              : ""}
            <p style="margin:0 0 4px;font-weight:600;color:#2C2C2A;">
              Marc-André Théberge<br>
              <span style="font-weight:400;color:#6B6A65;">Fondateur de Pratiqo</span>
            </p>
            <p style="margin:8px 0 0;">
              <span style="color:#1D9E75;font-weight:600;">D&apos;ici, pour ici</span>
              &nbsp;·&nbsp;Pratiqo inc. © 2026
              &nbsp;·&nbsp;<a href="${base}" style="color:#1D9E75;text-decoration:none;">pratiqo.ca</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;border-bottom:1px solid #F1EFE8;font-size:14px;">
      <span style="color:#6B6A65;">${escapeHtml(label)}</span>
    </td>
    <td style="padding:7px 0;border-bottom:1px solid #F1EFE8;
               font-size:14px;font-weight:600;text-align:right;">
      ${escapeHtml(value)}
    </td>
  </tr>`;
}

function infoTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                 style="margin:20px 0;border-radius:10px;overflow:hidden;
                        background:#F9F8F5;border:1px solid #E8E6DF;">
    <tr><td style="padding:4px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${rows.map(([l, v]) => infoRow(l, v)).join("")}
      </table>
    </td></tr>
  </table>`;
}

function tealBox(html: string): string {
  return `<div style="background:#E1F5EE;border-left:3px solid #1D9E75;
                      border-radius:8px;padding:14px 16px;margin:20px 0;
                      font-size:14px;color:#0F6E56;line-height:1.6;">
    ${html}
  </div>`;
}

// ─── 1. Welcome Student ──────────────────────────────────────────────────────

export async function sendWelcomeStudent(email: string, name: string) {
  const base = appBaseUrl();
  await send({
    to: email,
    subject: `Bienvenue chez Pratiqo, ${name} — ici, ta progression compte vraiment 🌱`,
    html: buildEmail({
      heroEmoji: "🌱",
      heroTitle: `Bienvenue chez Pratiqo, ${name}!`,
      heroSubtitle: "La plateforme de cours privés 100 % québécoise",
      bodyHtml: `
        <p>On est vraiment contents de t'avoir ici.</p>
        <p>Pratiqo, c'est une plateforme fondée au Québec, pour le Québec. Chaque cours que tu réserves ici soutient un professeur local — un voisin, un artiste, un expert de ta communauté. <strong>C'est ça, acheter local.</strong></p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🐉 Ton compagnon d'apprentissage t'attend
        </h2>
        <p>Commence par choisir ton compagnon — il évoluera avec toi au fil de tes cours et te motivera à progresser.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          💰 Tes crédits Pratiqo
        </h2>
        <p>Chez Pratiqo, tes cours te rapportent des crédits que tu peux utiliser sur tes prochaines réservations&nbsp;:</p>
        ${tealBox(`
          <strong>Jalons du compagnon</strong><br>
          · Étape 2 → <strong>+5 $</strong><br>
          · Étape 3 → <strong>+10 $</strong><br>
          · Étape 4 → <strong>+15 $</strong><br>
          · Étape 5 → <strong>+25 $</strong><br><br>
          <strong>+1 $</strong> par avis laissé à un professeur<br>
          <strong>+1 $</strong> par ami parrainé (toi et ton ami, cap 20 $/an)
        `)}

        <p>Ces crédits s'appliquent directement à ta prochaine réservation, automatiquement.</p>
        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          Des questions? Réponds à cet email, on est là.
        </p>
      `,
      ctaText: "Choisir mon compagnon",
      ctaUrl: `${base}/student/choose-companion`,
    }),
  });
}

// ─── 2. Welcome Teacher ──────────────────────────────────────────────────────

export async function sendWelcomeTeacher(email: string, name: string) {
  const base = appBaseUrl();
  await send({
    to: email,
    subject: `Bienvenue Professeur — ici, ton expertise est valorisée à sa juste valeur 🎓`,
    html: buildEmail({
      heroEmoji: "🎓",
      heroTitle: `Bienvenue, ${name}!`,
      heroSubtitle: "Tu rejoins la plateforme qui redistribue ses profits aux profs.",
      bodyHtml: `
        <p>On a construit Pratiqo parce qu'on trouvait franchement injuste qu'un professeur qui travaille fort se fasse couper 25 % ou 30 % de commission par des plateformes qui ne comprennent pas leur réalité. Tu mérites mieux.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📉 Des commissions qui baissent avec ton volume
        </h2>
        ${tealBox(`
          <strong>Programme de fidélité Pratiqo</strong><br><br>
          🥉 Bronze (0–5 000 $) → commission <strong>10 % / 5 %</strong> (gratuit / pro)<br>
          🥈 Argent (5–15 000 $) → <strong>9 % / 4,5 %</strong><br>
          🥇 Or (15–30 000 $) → <strong>8 % / 4 %</strong><br>
          🏆 Platine (30 000 $+) → <strong>7 % / 3,5 %</strong>
        `)}

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📊 Ristourne annuelle
        </h2>
        <p>Chaque année, on redistribue une partie de nos profits nets aux professeurs éligibles — proportionnellement à leur volume. C'est la <strong>ristourne Pratiqo</strong> : de l'argent qui revient dans ta poche, pas dans celle d'actionnaires.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🇨🇦 D'ici, pour ici
        </h2>
        <p>Pratiqo, c'est une initiative québécoise. Chaque professeur sur notre plateforme contribue à bâtir un écosystème éducatif local, équitable et transparent. On publie un rapport annuel de nos finances — parce que la transparence, ça devrait être la norme.</p>

        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          Questions ou suggestions? Réponds directement à cet email — je lis tout personnellement.
        </p>
      `,
      ctaText: "Mon tableau de bord",
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

// ─── 3. Companion Evolution ──────────────────────────────────────────────────

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
          <strong style="color:#1D9E75;">${escapeHtml(newStage)}</strong>
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

// ─── 4. Booking Confirmed — Student ─────────────────────────────────────────

export async function sendBookingConfirmedStudent(opts: {
  email: string;
  name: string;
  teacherName: string;
  discipline: string;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  creditsApplied: number;
  location: string;
}) {
  const base = appBaseUrl();
  const net = opts.price - opts.creditsApplied;
  const rows: [string, string][] = [
    ["Professeur", opts.teacherName],
    ["Discipline", opts.discipline],
    ["Date", opts.date],
    ["Heure", opts.time],
    ["Durée", `${opts.durationMinutes} min`],
    ["Lieu", opts.location],
    ["Montant total", `${opts.price.toFixed(2)} $`],
  ];
  if (opts.creditsApplied > 0) {
    rows.push(["Crédits appliqués", `−${opts.creditsApplied.toFixed(2)} $`]);
    rows.push(["Payé par carte", `${net.toFixed(2)} $`]);
  }

  await send({
    to: opts.email,
    subject: `Cours réservé avec ${opts.teacherName} ✓`,
    html: buildEmail({
      heroEmoji: "✅",
      heroTitle: "Cours confirmé !",
      heroSubtitle: `Avec ${opts.teacherName} — ${opts.date} à ${opts.time}`,
      bodyHtml: `
        <p>Bonne nouvelle, ${escapeHtml(opts.name)} — ton cours est officiellement confirmé !</p>
        ${infoTable(rows)}
        ${tealBox(`
          <strong>Rappels importants</strong><br>
          · Annulation gratuite jusqu'à <strong>24h avant</strong> le cours<br>
          · Tu peux envoyer un message à ton professeur via l'application<br>
          · Après le cours, laisse un avis pour <strong>gagner +1 $ de crédit</strong>
        `)}
        <p style="font-size:14px;color:#6B6A65;">
          Merci de faire confiance à Pratiqo et à nos professeurs locaux. 🌱
        </p>
      `,
      ctaText: "Voir les détails",
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

// ─── 5. Booking Confirmed — Teacher ─────────────────────────────────────────

export async function sendBookingConfirmedTeacher(opts: {
  email: string;
  name: string;
  studentName: string;
  discipline: string;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  commissionRate: number;
  location: string;
}) {
  const base = appBaseUrl();
  const commission = Math.round(opts.price * opts.commissionRate * 100) / 100;
  const net = Math.round((opts.price - commission) * 100) / 100;
  const commissionPct = Math.round(opts.commissionRate * 100);

  await send({
    to: opts.email,
    subject: `Nouveau cours avec ${opts.studentName} ! 🎉`,
    html: buildEmail({
      heroEmoji: "🎉",
      heroTitle: "Nouveau cours confirmé !",
      heroSubtitle: `${opts.studentName} · ${opts.date} à ${opts.time}`,
      bodyHtml: `
        <p>Excellent, ${escapeHtml(opts.name)} — une nouvelle réservation vient d'être confirmée !</p>
        ${infoTable([
          ["Élève", opts.studentName],
          ["Discipline", opts.discipline],
          ["Date", opts.date],
          ["Heure", opts.time],
          ["Durée", `${opts.durationMinutes} min`],
          ["Lieu", opts.location],
          ["Revenu brut", `${opts.price.toFixed(2)} $`],
          [`Commission Pratiqo (${commissionPct} %)`, `−${commission.toFixed(2)} $`],
          ["Ton revenu net", `${net.toFixed(2)} $`],
        ])}
        ${tealBox(`
          <strong>Quelques conseils</strong><br>
          · Présente-toi par message à ton élève avant le cours<br>
          · Prépare un plan de leçon adapté à son niveau<br>
          · Ajoute des notes après le cours pour suivre sa progression
        `)}
        <p style="font-size:14px;color:#6B6A65;">
          Merci d'être sur Pratiqo. Ensemble, on bâtit l'écosystème éducatif que le Québec mérite. 🇨🇦
        </p>
      `,
      ctaText: "Voir le cours",
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

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

// ─── Admin verification alert (unchanged) ────────────────────────────────────

export async function sendTeacherVerificationRequestToAdmin(opts: {
  teacherName: string;
  teacherEmail: string;
  teacherId: string;
  userId: string;
  kind: "identity" | "diploma";
  description?: string;
}) {
  const to =
    process.env.ADMIN_VERIFICATION_EMAIL?.trim() ||
    process.env.RESEND_ADMIN_EMAIL?.trim();
  if (!to) {
    console.warn("[email] ADMIN_VERIFICATION_EMAIL missing; skipping verification alert");
    return { skipped: true as const };
  }
  const resend = resendClient();
  if (!resend) return { skipped: true as const };

  const base = appBaseUrl();
  const kindFr = opts.kind === "identity" ? "Pièce d'identité" : "Diplôme / certificat";
  try {
    await resend.emails.send({
      from: "Pratiqo <onboarding@pratiqo.ca>",
      replyTo: "support@pratiqo.ca",
      to,
      subject: `[Pratiqo] Demande de vérification — ${kindFr} — ${opts.teacherName}`,
      html: buildEmail({
        heroTitle: "Nouvelle demande de vérification",
        heroSubtitle: kindFr,
        bodyHtml: `
          ${infoTable([
            ["Type", kindFr],
            ["Professeur", opts.teacherName],
            ["Email", opts.teacherEmail],
            ["teacher.id", opts.teacherId],
            ["user.id", opts.userId],
          ])}
          ${opts.description
            ? `<p><strong>Message :</strong><br>${escapeHtml(opts.description)}</p>`
            : ""}
          <p><a href="${base}/teacher/verification" style="color:#1D9E75;font-weight:600;">
            Voir dans l'admin (traitement manuel)
          </a></p>
        `,
      }),
    });
  } catch (e) {
    console.error("[email] Verification alert failed:", e);
  }
}
