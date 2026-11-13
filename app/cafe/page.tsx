import type { Metadata } from "next";
import { Suspense } from "react";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { CafeFrontDoor } from "./CafeFrontDoor";
import { CafeCommunity } from "@/components/cafe/community/CafeCommunity";
import { isCafeCommunityEnabled } from "@/lib/cafe/communityFeatureFlag";
import { isCafeRoomProviderEnabled } from "@/lib/cafe/roomFeatureFlag";

export const metadata: Metadata = {
  title: "Café des langues",
  description: "Rencontrez des personnes, partagez vos langues et commencez par le chat au Café des langues.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CafePage() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      {isCafeCommunityEnabled() ? <CafeCommunity videoEnabled={isCafeRoomProviderEnabled()} /> : <CafeFrontDoor />}
    </Suspense>
  );
}
