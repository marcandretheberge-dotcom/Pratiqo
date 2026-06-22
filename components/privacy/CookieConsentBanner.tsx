"use client";

import { useId } from "react";
import Link from "next/link";
import { useCookieConsent } from "@/components/privacy/CookieConsentProvider";
import { useLocale } from "@/lib/locale-context";

export function CookieConsentBanner() {
  const { t } = useLocale();
  const { bannerVisible, acceptAnalytics, acceptNecessaryOnly, openPreferences } = useCookieConsent();
  const titleId = useId();
  const descriptionId = useId();

  if (!bannerVisible) return null;

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-x-0 bottom-0 z-[120] border-t border-[#E8E4DC] bg-[#FFFCF7]/95 px-4 py-4 shadow-[0_-8px_32px_rgba(44,44,42,0.08)] backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 id={titleId} className="text-base font-semibold text-[#2C2C2A]">
            {t("cookieBannerTitle")}
          </h2>
          <p id={descriptionId} className="text-sm leading-relaxed text-[#5C5A56]">
            {t("cookieBannerDescription")}{" "}
            <Link href="/legal/confidentialite" className="underline underline-offset-2 hover:text-[#2C2C2A]">
              {t("footerPrivacy")}
            </Link>
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[18rem] sm:flex-none">
          <button
            type="button"
            onClick={acceptAnalytics}
            className="rounded-xl bg-[#2C2C2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f1f1d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2C2A]"
          >
            {t("cookieAcceptAnalytics")}
          </button>
          <button
            type="button"
            onClick={acceptNecessaryOnly}
            className="rounded-xl border border-[#D8D2C8] bg-white px-4 py-2.5 text-sm font-medium text-[#2C2C2A] transition hover:bg-[#F7F3EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2C2A]"
          >
            {t("cookieNecessaryOnly")}
          </button>
          <button
            type="button"
            onClick={openPreferences}
            className="rounded-xl px-4 py-2 text-sm font-medium text-[#5C5A56] underline underline-offset-2 transition hover:text-[#2C2C2A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2C2A]"
          >
            {t("cookieManageChoices")}
          </button>
        </div>
      </div>
    </section>
  );
}
