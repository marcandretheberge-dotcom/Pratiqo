import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CafeConversationRoomLive } from "./CafeConversationRoomLive";
import { isCafeV1Enabled } from "@/lib/cafe/featureFlag";
import { isCafeRoomProviderEnabled } from "@/lib/cafe/roomFeatureFlag";

export const metadata: Metadata = {
  title: "Salle — Café des langues",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CafeSessionRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Live room stays closed until both café and room-provider gates are on.
  if (!isCafeV1Enabled() || !isCafeRoomProviderEnabled()) notFound();

  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const yoReturn =
    typeof query.yoReturn === "string" && query.yoReturn.startsWith("/")
      ? query.yoReturn
      : null;
  const title =
    typeof query.title === "string" && query.title.trim()
      ? query.title.trim().slice(0, 120)
      : slug;

  return (
    <Suspense fallback={null}>
      <CafeConversationRoomLive
        slug={slug}
        sessionTitle={title}
        courseReturnHref={yoReturn}
      />
    </Suspense>
  );
}
