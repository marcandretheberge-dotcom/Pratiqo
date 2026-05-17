import { send } from "@/lib/email/transport";
import { appBaseUrl, escapeHtml } from "@/lib/email/layout";

export async function sendReviewPublishedTeacherEmail(opts: {
  email: string;
  teacherName: string;
  rating: number;
  reviewContent: string | null;
  studentFirstName: string;
  reviewId: string;
}) {
  const previewRaw = (opts.reviewContent ?? "").trim();
  const preview = previewRaw.length > 200 ? `${previewRaw.slice(0, 200)}...` : previewRaw;
  const base = appBaseUrl();
  const dashboardUrl = `${base}/dashboard/reviews/${encodeURIComponent(opts.reviewId)}`;
  const standardsUrl = `${base}/charte-de-confiance`;

  await send({
    to: opts.email,
    subject: `Nouvelle evaluation recue - ${opts.rating}/5`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .review-box { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5; }
    .review-content { font-size: 16px; font-style: italic; color: #555; margin: 10px 0; }
    .review-author { font-size: 14px; color: #999; }
    .rating { font-size: 24px; margin: 10px 0; }
    .cta-button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: 600; }
    .footer { font-size: 12px; color: #999; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Nouvelle evaluation recue</h2>
    </div>

    <p>Bonjour <strong>${escapeHtml(opts.teacherName)}</strong>,</p>
    <p>Un eleve vient de partager son retour suite a votre dernier cours.</p>

    <div class="review-box">
      <div class="rating">${escapeHtml(String(opts.rating))} / 5</div>
      <div class="review-content">"${escapeHtml(preview || "Aucun commentaire ajoute.")}"</div>
      <div class="review-author">- ${escapeHtml(opts.studentFirstName || "Un eleve")}</div>
    </div>

    <p><strong>Que faire maintenant ?</strong></p>
    <p>Vous pouvez <strong>repondre a cet avis</strong> directement sur Pratiqo. Votre reponse montre a vos futurs eleves que vous ecoutez les retours.</p>

    <center>
      <a href="${dashboardUrl}" class="cta-button">Voir dans mon tableau de bord</a>
    </center>

    <p style="font-size: 14px; color: #666;">
      <strong>Cet avis vous semble injuste ?</strong><br>
      Signalez-le via le lien dans votre tableau de bord.
    </p>

    <div class="footer">
      <p>L'equipe Pratiqo<br>
      <a href="${standardsUrl}" style="color: #4f46e5; text-decoration: none;">Standards de la Communaute</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
