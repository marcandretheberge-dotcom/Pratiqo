import type { Metadata } from "next";
import { Suspense } from "react";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { CafeFrontDoor } from "./CafeFrontDoor";

export const metadata: Metadata = {
  title: "Café des langues",
  description: "Un espace calme pour pratiquer une langue en groupe avec Pratiqo.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CafePage() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <CafeFrontDoor />
    </Suspense>
  );
}
