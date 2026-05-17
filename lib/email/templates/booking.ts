import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, infoTable, tealBox } from "@/lib/email/layout";

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
          · Après le cours, partagez votre expérience — votre avis aide la communauté Pratiqo
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

export async function sendPostClassReviewRequest(opts: {
  email: string;
  studentName: string;
  teacherName: string;
  bookingId: string;
}): Promise<boolean> {
  const base = appBaseUrl();
  return send({
    to: opts.email,
    subject: `Comment s'est passé votre cours avec ${opts.teacherName} ?`,
    html: buildEmail({
      heroEmoji: "⭐",
      heroTitle: "Votre avis compte",
      heroSubtitle: `Cours avec ${opts.teacherName}`,
      bodyHtml: `
        <p>Bonjour ${escapeHtml(opts.studentName)},</p>
        <p>Votre cours avec <strong>${escapeHtml(opts.teacherName)}</strong> vient d'être marqué comme terminé.</p>
        <p>Votre avis aide la communauté Pratiqo à choisir les bons professeurs. Prenez une minute pour partager votre expérience.</p>
      `,
      ctaText: "Laisser un avis",
      ctaUrl: `${base}/student/progress?review=${encodeURIComponent(opts.bookingId)}`,
    }),
  });
}

// ─── Lesson reminders (cron) ───────────────────────────────────────────────────

export async function sendLessonReminderStudent(opts: {
  email: string;
  studentName: string;
  teacherName: string;
  discipline: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  window: "24h" | "1h";
}): Promise<boolean> {
  const base = appBaseUrl();
  const is24h = opts.window === "24h";
  const subject = is24h
    ? `Rappel : cours demain avec ${opts.teacherName}`
    : `Rappel : cours dans 1 h avec ${opts.teacherName}`;
  const heroTitle = is24h ? "Votre cours approche" : "Cours dans 1 heure";
  const intro = is24h
    ? `<p>Bonjour ${escapeHtml(opts.studentName)},</p>
       <p>Petit rappel : votre cours avec <strong>${escapeHtml(opts.teacherName)}</strong> a lieu <strong>demain</strong>.</p>`
    : `<p>Bonjour ${escapeHtml(opts.studentName)},</p>
       <p>Votre cours avec <strong>${escapeHtml(opts.teacherName)}</strong> commence dans environ <strong>une heure</strong>.</p>`;

  return send({
    to: opts.email,
    subject,
    html: buildEmail({
      heroEmoji: is24h ? "📅" : "⏰",
      heroTitle,
      heroSubtitle: `${opts.dateLabel} à ${escapeHtml(opts.timeLabel)}`,
      bodyHtml: `
        ${intro}
        ${infoTable([
          ["Professeur", opts.teacherName],
          ["Discipline", opts.discipline],
          ["Date", opts.dateLabel],
          ["Heure", opts.timeLabel],
          ["Format", opts.location],
        ])}
      `,
      ctaText: "Voir mon cours",
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

export async function sendLessonReminderTeacher(opts: {
  email: string;
  teacherName: string;
  studentName: string;
  discipline: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  window: "24h" | "1h";
}): Promise<boolean> {
  const base = appBaseUrl();
  const is24h = opts.window === "24h";
  const subject = is24h
    ? `Rappel : cours demain avec ${opts.studentName}`
    : `Rappel : cours dans 1 h avec ${opts.studentName}`;
  const heroTitle = is24h ? "Cours demain" : "Cours dans 1 heure";
  const intro = is24h
    ? `<p>Bonjour ${escapeHtml(opts.teacherName)},</p>
       <p>Rappel : vous avez un cours avec <strong>${escapeHtml(opts.studentName)}</strong> <strong>demain</strong>.</p>`
    : `<p>Bonjour ${escapeHtml(opts.teacherName)},</p>
       <p>Votre cours avec <strong>${escapeHtml(opts.studentName)}</strong> commence dans environ <strong>une heure</strong>.</p>`;

  return send({
    to: opts.email,
    subject,
    html: buildEmail({
      heroEmoji: is24h ? "📅" : "⏰",
      heroTitle,
      heroSubtitle: `${opts.dateLabel} à ${escapeHtml(opts.timeLabel)}`,
      bodyHtml: `
        ${intro}
        ${infoTable([
          ["Élève", opts.studentName],
          ["Discipline", opts.discipline],
          ["Date", opts.dateLabel],
          ["Heure", opts.timeLabel],
          ["Format", opts.location],
        ])}
      `,
      ctaText: "Voir le cours",
      ctaUrl: `${base}/dashboard`,
    }),
  });
}
