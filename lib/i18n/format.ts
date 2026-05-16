import type { Locale, TranslationKey } from "./types";
import { t } from "./server";

/** Replace `{name}`-style placeholders in a translated string. */
export function tFormat(
  locale: Locale | string | null | undefined,
  key: TranslationKey,
  vars: Record<string, string | number>,
): string {
  let out = t(locale, key);
  for (const [name, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${name}}`, String(value));
  }
  return out;
}

export function getOpenGraphLocale(locale: import("./types").Locale): string {
  if (locale === "fr") return "fr_CA";
  if (locale === "es") return "es_UY";
  return "en_CA";
}
