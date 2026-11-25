import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isCafeCommunityEnabled } from "@/lib/cafe/communityFeatureFlag";
import { isCafeRoomProviderEnabled } from "@/lib/cafe/roomFeatureFlag";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import { communityUuid } from "@/lib/cafe/communityValidation";
import { CafeCommunityCallLive } from "./CafeCommunityCallLive";

export const metadata: Metadata = { title: "Appel — Café des langues", robots: { index: false, follow: false } };
export default async function CommunityCallPage({ params, searchParams }: {
  params: Promise<{ callId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isCafeCommunityEnabled() || !isCafeRoomProviderEnabled()) notFound();
  const { callId } = await params;
  if (!communityUuid(callId)) notFound();
  const query = await searchParams;
  return <CafeCommunityCallLive callId={callId} courseReturnHref={resolveCafeRoomCourseReturn(query.yoReturn)} />;
}
