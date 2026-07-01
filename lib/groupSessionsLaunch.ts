import { isEnabled } from "@/lib/features";

function parseCheckoutEnvOverride(): boolean | null {
  const normalized = String(process.env.GROUP_SESSIONS_CHECKOUT_ENABLED ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return null;
}

/**
 * Launch gate for group-session checkout and SEO indexation.
 * Env override wins when set; otherwise falls back to the product feature flag.
 */
export function isGroupSessionsCheckoutEnabled(): boolean {
  const envOverride = parseCheckoutEnvOverride();
  if (envOverride !== null) return envOverride;
  return isEnabled("group_sessions");
}

/** When false, marketplace/detail pages must not be indexed or advertised as purchasable. */
export function isGroupSessionsMarketplaceIndexable(): boolean {
  return isGroupSessionsCheckoutEnabled();
}
