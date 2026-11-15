import { notFound } from "next/navigation";
import { CafeModerationQueue } from "@/components/cafe/community/CafeModerationQueue";
import { isCafeCommunityEnabled } from "@/lib/cafe/communityFeatureFlag";

export const metadata = { title: "Café · Modération", robots: { index: false, follow: false } };

export default function CafeCommunityModerationPage() {
  if (!isCafeCommunityEnabled()) notFound();
  return <CafeModerationQueue />;
}
