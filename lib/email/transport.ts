import { Resend } from "resend";

export function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export async function send(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing — skipping email send");
    return false;
  }
  const resend = new Resend(key);
  console.log("[email] Sending email");
  try {
    const result = await resend.emails.send({
      from: "Pratiqo <onboarding@pratiqo.ca>",
      replyTo: "info@pratiqo.ca",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    console.log("[email] ✓ Sent successfully — id:", (result as { data?: { id?: string } }).data?.id ?? "unknown");
    return true;
  } catch (e) {
    console.error("[email] ✗ Send failed", e);
    // never rethrow — email failures must not block payments or bookings
    return false;
  }
}
