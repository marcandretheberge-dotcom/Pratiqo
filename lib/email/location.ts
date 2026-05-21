import type { EmailLocale } from "@/lib/email/locale";
import { EMAIL_FALLBACK_LOCALE } from "@/lib/email/locale";
import { formatEmailTeachingLocation } from "@/lib/email/messages/booking";

/** Localized lesson format label for emails (online / home / studio). */
export function lessonLocationLabel(
  teachingMode?: string | null,
  meetingUrl?: string | null,
  locale?: EmailLocale,
): string {
  return formatEmailTeachingLocation(locale ?? EMAIL_FALLBACK_LOCALE, teachingMode, meetingUrl);
}
