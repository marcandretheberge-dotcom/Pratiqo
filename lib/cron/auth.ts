/**
 * Shared auth for scheduled jobs (Vercel Cron, manual ops).
 * Set `CRON_SECRET` in the deployment environment.
 */
export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (bearer === secret) return true;

  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  return headerSecret === secret;
}
