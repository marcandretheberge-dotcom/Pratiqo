/** Language exchange is independent of the course catalogue. ISO 639-1 plus searchable BCP47 additions. */
export const CAFE_LANGUAGE_CODES = (
  "aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu"
).split(" ");

const COURSE_ALIASES: Record<string, string> = {
  french: "fr", francais: "fr", français: "fr", english: "en", anglais: "en",
  spanish: "es", espagnol: "es", espanol: "es", español: "es", italian: "it", italien: "it",
  portuguese: "pt", portugais: "pt", german: "de", allemand: "de", arabic: "ar", arabe: "ar",
  japanese: "ja", japonais: "ja", chinese: "zh", mandarin: "cmn", korean: "ko", coreen: "ko",
};

export function canonicalCafeLanguage(value: string | null | undefined): string | null {
  const raw = value?.trim().toLowerCase();
  if (!raw) return null;
  const code = COURSE_ALIASES[raw] ?? raw;
  return code.length <= 35 && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code) ? code : null;
}

export function cafeLanguageLabel(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language", fallback: "code" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function cafeLanguageOptions(locale: string, extra: string[] = []) {
  return [...new Set([...CAFE_LANGUAGE_CODES, ...extra])]
    .map((code) => ({ code, label: cafeLanguageLabel(code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

/** Parse a local wall-clock input in the viewer's time zone, rejecting DST gaps/invalid dates. */
export function cafeScheduledIso(localValue: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)) return null;
  const value = new Date(localValue);
  if (!Number.isFinite(value.getTime()) || value.getTime() <= now || value.getTime() > now + 90 * 86_400_000) return null;
  const [date, time] = localValue.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (value.getFullYear() !== year || value.getMonth() + 1 !== month || value.getDate() !== day
    || value.getHours() !== hour || value.getMinutes() !== minute) return null;
  return value.toISOString();
}

export function cafeViewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function cafeLocalDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
