import { isCafeV1Enabled } from "./featureFlag";

/** Separate release gate: the community migration must land before this flag is enabled. */
export function isCafeCommunityEnabled(): boolean {
  return isCafeV1Enabled() && process.env.CAFE_COMMUNITY_ENABLED?.trim().toLowerCase() === "true";
}
