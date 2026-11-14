import type { Metadata } from "next";
import { Suspense } from "react";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { getCafeSocialFlags } from "@/lib/cafe/socialFeatureFlags";
import { CafeFrontDoor } from "./CafeFrontDoor";

export const metadata: Metadata = {
  title: "Café des langues",
  description: "Une racine. Mille langues. Le plaisir de pratiquer — Café des langues Pratiqo.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CafePage() {
  const socialFlags = getCafeSocialFlags();
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <CafeFrontDoor socialFlags={socialFlags} />
    </Suspense>
  );
}
