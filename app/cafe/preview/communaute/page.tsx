import { notFound } from "next/navigation";
import { CafeCommunityDemo } from "@/components/cafe/community/CafeCommunityDemo";
import { isCafeCommunityEnabled } from "@/lib/cafe/communityFeatureFlag";

export const metadata = { title: "DÉMO · Communauté Café", robots: { index: false, follow: false } };

/** Deliberate fixture-only preview. Never linked from production navigation. */
export default function CafeCommunityPreviewPage() {
  if (!isCafeCommunityEnabled() || process.env.CAFE_COMMUNITY_PREVIEW_ENABLED !== "true") notFound();
  return <CafeCommunityDemo />;
}
