"use client";
import { useSyncExternalStore } from "react";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/types";
const subscribe = () => () => {};
export function LearnerFinderLocalizedText({ values, initialLocale }: { values: Record<Locale,string>; initialLocale: Locale }) {
  const { locale } = useLocale();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return <>{values[hydrated ? locale : initialLocale]}</>;
}
