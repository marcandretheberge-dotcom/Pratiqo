"use client";

import { useId } from "react";
import Link from "next/link";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";

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
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-5xl rounded-3xl border border-[#DCEAE3] bg-white p-4 text-[#18231F] shadow-[0_24px_80px_rgba(15,110,86,0.22)] backdrop-blur sm:bottom-5 sm:p-5"
      data-testid="cookie-consent-banner"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-black text-[#10251F]">
              {t("cookieBannerTitle")}
            </h2>
            <p id={descriptionId} className="mt-2 max-w-3xl text-sm leading-relaxed text-[#56645F]">
              {t("cookieBannerDescription")}{" "}
              <Link href="/legal/confidentialite" className="font-semibold text-teal-700 underline underline-offset-2">
                {t("footerPrivacy")}
              </Link>
            </p>
          </div>
        </div>

        <div className="grid shrink-0 gap-2 sm:grid-cols-3 md:min-w-[520px]">
          <button
            type="button"
            onClick={acceptAnalytics}
            className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {t("cookieAcceptAnalytics")}
          </button>
          <button
            type="button"
            onClick={acceptNecessaryOnly}
            className="rounded-2xl border border-teal-700 bg-white px-4 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {t("cookieNecessaryOnly")}
          </button>
          <button
            type="button"
            onClick={openPreferences}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DCEAE3] bg-[#F8FBF8] px-4 py-3 text-sm font-bold text-[#25312D] transition hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {t("cookieManageChoices")}
          </button>
        </div>
      </div>
    </section>
  );
}
