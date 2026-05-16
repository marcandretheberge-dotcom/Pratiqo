"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CreditCard, Languages, LayoutTemplate, MapPin, Monitor, Music } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/translations";

export function PremiumLandingHeroCtas({
  onFindTeacher,
  className,
}: {
  onFindTeacher: () => void;
  className?: string;
}) {
  const { t, locale } = useLocale();

  return (
    <div className={cn("mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start", className)}>
      <button
        type="button"
        onClick={onFindTeacher}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-7 text-sm font-bold text-white shadow-[0_12px_32px_rgba(15,110,86,0.22)] transition-colors hover:bg-[#0B5F4A]"
      >
        {t("findTeacher")}
        <ArrowRight size={16} aria-hidden />
      </button>
      <Link
        href={withLocaleHref("/become-teacher", locale)}
        className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#C5DDE8] bg-white/90 px-7 text-sm font-semibold text-[#142235] shadow-sm backdrop-blur-sm transition-colors hover:border-teal-700/30 hover:bg-white"
      >
        {t("becomeTeacher")}
      </Link>
    </div>
  );
}

function FloatingTrustCard({
  labelKey,
  icon: Icon,
  className,
}: {
  labelKey: TranslationKey;
  icon: typeof MapPin;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "absolute flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/90 px-3.5 py-2.5 shadow-[0_12px_40px_rgba(20,34,53,0.10)] backdrop-blur-md",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9F6F1] text-teal-700">
        <Icon size={18} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="text-xs font-bold text-[#142235]">{t(labelKey)}</span>
    </div>
  );
}

/**
 * Abstract hero visual (no approved photography yet).
 * TODO(marketing): replace gradient panel with optimized hero image in public/images/marketing/ when available.
 */
export function PremiumLandingHeroVisual({ className }: { className?: string }) {
  const { t } = useLocale();
  const tiles = [
    { tone: "bg-white/85 text-teal-800", label: t("marketplaceCategoryMusic"), Icon: Music },
    { tone: "bg-teal-700/90 text-white", label: t("marketplaceCategoryLanguages"), Icon: Languages },
    { tone: "bg-[#142235]/90 text-white", label: t("marketplaceCategoryAcademic"), Icon: BookOpen },
    { tone: "bg-white/85 text-[#142235]", label: t("teachingFormatOnline"), Icon: Monitor },
  ] as const;

  return (
    <div className={cn("relative mx-auto w-full max-w-[520px]", className)} aria-hidden>
      <div className="relative aspect-[4/5] max-h-[380px] min-h-[240px] w-full overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#D8ECFA] via-[#F0F7FC] to-[#E6F6EF] shadow-[0_24px_60px_rgba(20,34,53,0.12)] lg:max-h-[420px] lg:min-h-[280px]">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-6 h-44 w-44 rounded-full bg-sky-300/25 blur-2xl" />

        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
          <div className="grid w-full max-w-[280px] grid-cols-2 gap-3">
            {tiles.map(({ tone, label, Icon }) => (
              <div
                key={label}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/50 p-2 text-center shadow-sm backdrop-blur-sm",
                  tone,
                )}
              >
                <Icon size={22} strokeWidth={2} aria-hidden className="opacity-90" />
                <span className="text-[11px] font-bold leading-tight sm:text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <FloatingTrustCard
          labelKey="landingPremiumTrustProfiles"
          icon={LayoutTemplate}
          className="left-2 top-4 sm:left-4 sm:top-8"
        />
        <FloatingTrustCard
          labelKey="landingPremiumTrustLocal"
          icon={MapPin}
          className="right-1 top-[36%] sm:right-4"
        />
        <FloatingTrustCard
          labelKey="landingPremiumTrustPayments"
          icon={CreditCard}
          className="bottom-6 left-4 sm:bottom-10 sm:left-10"
        />
      </div>
    </div>
  );
}

export function PremiumLandingHeroTrustStrip({ className }: { className?: string }) {
  const { t } = useLocale();
  const items: { key: TranslationKey; icon: typeof MapPin }[] = [
    { key: "landingPremiumTrustProfiles", icon: LayoutTemplate },
    { key: "landingPremiumTrustPayments", icon: CreditCard },
    { key: "landingPremiumTrustLocal", icon: MapPin },
  ];

  return (
    <ul
      className={cn(
        "mt-6 flex flex-col gap-3 border-t border-[#DCEAE3]/80 pt-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 lg:justify-start",
        className,
      )}
    >
      {items.map(({ key, icon: Icon }) => (
        <li key={key} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#3D4F63]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E9F6F1] text-teal-700">
            <Icon size={16} strokeWidth={2.25} aria-hidden />
          </span>
          {t(key)}
        </li>
      ))}
    </ul>
  );
}
