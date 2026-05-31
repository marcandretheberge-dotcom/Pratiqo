"use client";

/**
 * FindTeacherTrustStrip — three trust cards rendered immediately
 * below the search module on `/trouver-un-prof`.
 *
 * Copy (FR / EN / ES) lives in `lib/i18n/locales/*.json` under the
 * `findTeacherTrust*` keys, so the strip is fully locale-aware via
 * `useLocale().t()`.
 *
 * Visually mirrors the existing `LandingHeroTrustStrip` (white
 * card, rounded-3xl, soft teal-tinted shadow, 3-up grid) so the new
 * marketing page does not feel disconnected from the homepage. The
 * copy intentionally differs — homepage uses verified / available /
 * formats, this page uses Profils clairs / Paiements sécurisés /
 * Profs locaux per the marketing brief.
 */

import { BadgeCheck, MapPin, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/translations";

type TrustCard = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  icon: typeof BadgeCheck;
};

const TRUST_CARDS: readonly TrustCard[] = [
  {
    titleKey: "findTeacherTrustClearProfilesTitle",
    bodyKey: "findTeacherTrustClearProfilesBody",
    icon: BadgeCheck,
  },
  {
    titleKey: "findTeacherTrustSecurePaymentsTitle",
    bodyKey: "findTeacherTrustSecurePaymentsBody",
    icon: ShieldCheck,
  },
  {
    titleKey: "findTeacherTrustLocalTeachersTitle",
    bodyKey: "findTeacherTrustLocalTeachersBody",
    icon: MapPin,
  },
];

export function FindTeacherTrustStrip({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-4 rounded-3xl border border-[#DCF0E8] bg-white px-4 py-5 shadow-[0_4px_16px_rgba(15,110,86,0.05)] sm:grid-cols-3 sm:gap-5 sm:px-6 sm:py-6",
        className,
      )}
      aria-label="Pratiqo trust signals"
    >
      {TRUST_CARDS.map(({ titleKey, bodyKey, icon: Icon }) => (
        <li
          key={titleKey}
          className="flex items-start gap-3 text-left sm:items-center"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E9F6F1] text-teal-700 shadow-sm">
            <Icon size={22} strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-tight text-[#1a1f1d]">
              {t(titleKey)}
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-neutral-700">
              {t(bodyKey)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
