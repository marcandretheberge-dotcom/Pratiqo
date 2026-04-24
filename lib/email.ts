import { Resend } from "resend";

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromEmail(): string {
  return "Pratiqo <onboarding@pratiqo.ca>";
}

function appBaseUrl(): string {
  return process.env.APP_BASE_URL?.trim() || process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || "https://pratiqo.ca";
}

export async function sendWelcomeTeacher(email: string, name: string) {
  console.log("[email] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  const resend = resendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing; skipping teacher welcome email");
    return;
  }

  const base = appBaseUrl();
  const onboardingUrl = `${base}/onboarding`;
  const becomeTeacherUrl = `${base}/become-teacher`;

  const subject = `Bienvenue sur Pratiqo, ${name}!`;
  const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#2C2C2A">
    <h2 style="margin:0 0 12px 0;">Bienvenue sur Pratiqo, ${escapeHtml(name)}!</h2>
    <p style="margin:0 0 14px 0;">
      Merci de rejoindre la communauté. Ton profil est presque prêt — complète-le pour apparaître dans la recherche.
    </p>
    <p style="margin:0 0 14px 0;">
      <a href="${onboardingUrl}" style="display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;padding:10px 16px;border-radius:12px;font-weight:700;">
        Compléter mon profil
      </a>
    </p>
    <p style="margin:0 0 14px 0;">
      Tu peux aussi relire la page “Devenir professeur”:
      <a href="${becomeTeacherUrl}" style="color:#1D9E75;font-weight:600;text-decoration:underline;">${becomeTeacherUrl}</a>
    </p>
    <p style="margin:22px 0 0 0;color:#888780;font-size:12px;">
      Besoin d’aide? Réponds à cet email ou écris à support@pratiqo.app
    </p>
  </div>`;

  try {
    const result = await resend.emails.send({
      from: fromEmail(),
      to: email,
      subject,
      html,
    });
    console.log("[resend] Success:", result);
    return result;
  } catch (error) {
    console.error("[resend] Error:", error);
    throw error;
  }
}

export async function sendWelcomeStudent(email: string, name: string) {
  console.log("[email] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  const resend = resendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing; skipping student welcome email");
    return;
  }

  const base = appBaseUrl();
  const searchUrl = `${base}/student/search`;

  const subject = "Trouve ton prof idéal sur Pratiqo";
  const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#2C2C2A">
    <h2 style="margin:0 0 12px 0;">Salut ${escapeHtml(name)}!</h2>
    <p style="margin:0 0 14px 0;">
      Bienvenue sur Pratiqo. Trouve un professeur, réserve, et progresse plus vite.
    </p>
    <p style="margin:0 0 14px 0;">
      <a href="${searchUrl}" style="display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;padding:10px 16px;border-radius:12px;font-weight:700;">
        Trouver un prof
      </a>
    </p>
    <p style="margin:22px 0 0 0;color:#888780;font-size:12px;">
      Besoin d’aide? support@pratiqo.app
    </p>
  </div>`;

  try {
    const result = await resend.emails.send({
      from: fromEmail(),
      to: email,
      subject,
      html,
    });
    console.log("[resend] Success:", result);
    return result;
  } catch (error) {
    console.error("[resend] Error:", error);
    throw error;
  }
}

export async function sendTeacherVerificationRequestToAdmin(opts: {
  teacherName: string;
  teacherEmail: string;
  teacherId: string;
  userId: string;
  kind: "identity" | "diploma";
  description?: string;
}) {
  const to = process.env.ADMIN_VERIFICATION_EMAIL?.trim() || process.env.RESEND_ADMIN_EMAIL?.trim();
  if (!to) {
    console.warn("[email] ADMIN_VERIFICATION_EMAIL / RESEND_ADMIN_EMAIL missing; skipping admin verification alert");
    return { skipped: true as const };
  }
  const resend = resendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing; skipping admin verification alert");
    return { skipped: true as const };
  }
  const base = appBaseUrl();
  const kindFr = opts.kind === "identity" ? "Pièce d'identité" : "Diplôme / certificat";
  const subject = `[Pratiqo] Demande de vérification — ${kindFr} — ${opts.teacherName}`;
  const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#2C2C2A">
    <h2 style="margin:0 0 12px 0;">Nouvelle demande de vérification</h2>
    <p><strong>Type :</strong> ${escapeHtml(kindFr)}</p>
    <p><strong>Professeur :</strong> ${escapeHtml(opts.teacherName)} (${escapeHtml(opts.teacherEmail)})</p>
    <p><strong>teacher.id :</strong> ${escapeHtml(opts.teacherId)}</p>
    <p><strong>user.id :</strong> ${escapeHtml(opts.userId)}</p>
    ${opts.description ? `<p><strong>Message :</strong><br/>${escapeHtml(opts.description)}</p>` : ""}
    <p style="margin-top:16px"><a href="${base}/teacher/verification" style="color:#1D9E75;font-weight:600;">Ouvrir l’admin (à traiter manuellement)</a></p>
  </div>`;
  try {
    const result = await resend.emails.send({
      from: fromEmail(),
      to,
      subject,
      html,
    });
    console.log("[resend] Verification request alert:", result);
    return result;
  } catch (error) {
    console.error("[resend] Verification request error:", error);
    throw error;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}

