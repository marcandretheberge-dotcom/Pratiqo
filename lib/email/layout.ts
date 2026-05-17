import { SITE_URL } from "@/lib/seo/site";
import type { EmailLocale } from "@/lib/email/locale";
import { EMAIL_FOOTER_COPY } from "@/lib/email/messages/common";
import { resolveEmailLocaleFromOptional } from "@/lib/email/locale";

export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.STRIPE_CHECKOUT_BASE_URL?.trim() ||
    SITE_URL
  );
}

export function escapeHtml(s: string): string {
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

export interface TemplateOpts {
  heroEmoji?: string;
  heroTitle: string;
  heroSubtitle?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerExtra?: string;
  locale?: EmailLocale;
}

export function buildEmail(opts: TemplateOpts): string {
  const base = appBaseUrl();
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const footer = EMAIL_FOOTER_COPY[locale];
  const cta = opts.ctaText && opts.ctaUrl
    ? `<div style="text-align:center;margin:32px 0 8px;">
        <a href="${opts.ctaUrl}"
           style="background:#409A8E;color:#ffffff;text-decoration:none;
                  padding:14px 32px;border-radius:12px;font-weight:700;
                  font-size:15px;display:inline-block;letter-spacing:-0.2px;">
          ${escapeHtml(opts.ctaText)}
        </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
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
                      src="${SITE_URL}/logo-email.png"
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
          <td style="background:#2D7B72;border-radius:16px 16px 0 0;
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
            <p style="margin:0 0 4px;color:#6B6A65;">
              ${footer.questions}
              <a href="mailto:${footer.supportPrompt}"
                 style="color:#409A8E;font-weight:600;text-decoration:none;">
                ${footer.supportPrompt}
              </a>
            </p>
            <p style="margin:8px 0 0;">
              <span style="color:#409A8E;font-weight:600;">${footer.tagline}</span>
              &nbsp;·&nbsp;Pratiqo inc. © 2026
              &nbsp;·&nbsp;<a href="${base}" style="color:#409A8E;text-decoration:none;">pratiqo.ca</a>
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

export function infoTable(rows: [string, string][]): string {
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

export function tealBox(html: string): string {
  return `<div style="background:#E8F5F3;border-left:3px solid #50BEB2;
                      border-radius:8px;padding:14px 16px;margin:20px 0;
                      font-size:14px;color:#2D7B72;line-height:1.6;">
    ${html}
  </div>`;
}

