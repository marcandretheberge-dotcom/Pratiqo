"use client";
import { useCafeIdentity } from "@/components/cafe/community/useCafeIdentity";
import { useLocale } from "@/lib/locale-context";
import { CafeCommunityCall } from "./CafeCommunityCall";

export function CafeCommunityCallLive(props: { callId: string; courseReturnHref: string | null }) {
  const { identity } = useCafeIdentity();
  const { locale } = useLocale();
  return <CafeCommunityCall {...props} identity={identity} locale={locale === "en" || locale === "es" ? locale : "fr"} />;
}
