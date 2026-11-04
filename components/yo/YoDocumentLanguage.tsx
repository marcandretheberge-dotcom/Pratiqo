"use client";

import { useEffect } from "react";
import type { YoLocale } from "@/lib/yo/types";

/** SSR content owns its lang attribute; this also updates browser-level hints. */
export function YoDocumentLanguage({ locale }: { locale: YoLocale }) {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  }, [locale]);
  return null;
}
