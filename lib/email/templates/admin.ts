import { resendClient } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, infoTable } from "@/lib/email/layout";

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
      replyTo: "info@pratiqo.ca",
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
          <p><a href="${base}/admin/credentials" style="color:#409A8E;font-weight:600;">
            Voir les demandes dans l'espace admin
          </a></p>
        `,
      }),
    });
  } catch (e) {
    console.error("[email] Verification alert failed:", e);
  }
}

export async function sendReviewFlaggedAdminAlert(opts: {
  reviewId: string;
  reporterId: string;
  reason: string;
  details?: string | null;
}) {
  const to =
    process.env.ADMIN_VERIFICATION_EMAIL?.trim() ||
    process.env.RESEND_ADMIN_EMAIL?.trim();
  if (!to) {
    console.warn("[email] admin email missing; skipping review flag alert");
    return { skipped: true as const };
  }
  const resend = resendClient();
  if (!resend) return { skipped: true as const };

  try {
    await resend.emails.send({
      from: "Pratiqo <onboarding@pratiqo.ca>",
      replyTo: "info@pratiqo.ca",
      to,
      subject: `[Pratiqo] Avis signale - ${opts.reason}`,
      html: buildEmail({
        heroTitle: "Avis signale",
        heroSubtitle: "Revision manuelle recommandee",
        bodyHtml: `
          ${infoTable([
            ["review.id", opts.reviewId],
            ["reporter.id", opts.reporterId],
            ["Raison", opts.reason],
          ])}
          ${opts.details
            ? `<p><strong>Details :</strong><br>${escapeHtml(opts.details)}</p>`
            : ""}
          <p>Le commentaire a ete masque du public en attendant revision.</p>
        `,
      }),
    });
  } catch (e) {
    console.error("[email] Review flag alert failed:", e);
  }
}

export async function sendSupportCaseAdminAlert(opts: {
  caseId: string;
  bookingId: string;
  category: string;
  role: string;
  userId: string;
  description: string;
  payoutHold: boolean;
}) {
  const to =
    process.env.ADMIN_VERIFICATION_EMAIL?.trim() ||
    process.env.RESEND_ADMIN_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim();
  if (!to) {
    console.warn("[email] admin/support email missing; skipping support case alert");
    return { skipped: true as const };
  }
  const resend = resendClient();
  if (!resend) return { skipped: true as const };

  const base = appBaseUrl();
  try {
    await resend.emails.send({
      from: "Pratiqo <onboarding@pratiqo.ca>",
      replyTo: "info@pratiqo.ca",
      to,
      subject: `[Pratiqo] Nouveau dossier de resolution - ${opts.category}`,
      html: buildEmail({
        heroTitle: "Nouveau dossier de resolution",
        heroSubtitle: opts.payoutHold ? "Versement a reviser avant transfert" : "Suivi support",
        bodyHtml: `
          ${infoTable([
            ["case.id", opts.caseId],
            ["booking.id", opts.bookingId],
            ["Categorie", opts.category],
            ["Role", opts.role],
            ["user.id", opts.userId],
            ["payout_hold", opts.payoutHold ? "true" : "false"],
          ])}
          <p><strong>Description :</strong><br>${escapeHtml(opts.description)}</p>
          <p><a href="${base}/resolution/${encodeURIComponent(opts.caseId)}" style="color:#409A8E;font-weight:600;">
            Voir le dossier
          </a></p>
          <p style="font-size:13px;color:#6B6A65;">Si aucun admin dashboard n'est disponible, traiter depuis Supabase.</p>
        `,
      }),
    });
  } catch (e) {
    console.error("[email] Support case alert failed:", e);
  }
}
