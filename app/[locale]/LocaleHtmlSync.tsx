"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n/types";
import { LOCALE_BCP47 } from "@/lib/i18n/routing";

/** Syncs `<html lang>` with the active URL locale (root layout defaults to fr-CA). */
export function LocaleHtmlSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = LOCALE_BCP47[locale];
  }, [locale]);
  return null;
}
