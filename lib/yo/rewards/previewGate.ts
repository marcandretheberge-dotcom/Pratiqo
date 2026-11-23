export function italianRewardsPreviewEnabled(env: Record<string, string | undefined>) {
  if (env.YO_ITALIAN_REWARDS_PREVIEW !== "true" || env.VERCEL || env.VERCEL_ENV === "production") return false;
  try {
    const backend = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return ["127.0.0.1", "localhost", "[::1]"].includes(backend.hostname);
  } catch { return false; }
}
