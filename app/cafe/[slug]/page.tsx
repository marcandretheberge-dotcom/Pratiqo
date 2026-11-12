import type { Metadata } from "next";
import { Suspense } from "react";
import { CafeSessionDetails } from "./CafeSessionDetails";

export const metadata: Metadata = {
  title: "Table — Café des langues",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function CafeSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={null}>
      <CafeSessionDetails slug={slug} />
    </Suspense>
  );
}
