import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";

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
