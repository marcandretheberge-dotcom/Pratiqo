"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

const RESOURCE_CARDS = [
  {
    href: "/blog/comment-choisir-tuteur-enfant-quebec",
    audienceKey: "landingResourceAudienceParents" as const,
    titleKey: "landingResourceCard1Title" as const,
    descKey: "landingResourceCard1Description" as const,
  },
  {
    href: "/blog/tuteur-en-ligne-ou-a-domicile",
    audienceKey: "landingResourceAudienceStudents" as const,
    titleKey: "landingResourceCard2Title" as const,
    descKey: "landingResourceCard2Description" as const,
  },
  {
    href: "/blog/donner-cours-prives-quebec",
    audienceKey: "landingResourceAudienceTeachers" as const,
    titleKey: "landingResourceCard3Title" as const,
    descKey: "landingResourceCard3Description" as const,
  },
] as const;

export function LandingResourcesSection({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <section
      className={`border-t border-[#E8E6DF] bg-[#FAFCFB] py-14 sm:py-20 ${className ?? ""}`}
      aria-labelledby="landing-resources-heading"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="landing-resources-heading" className="text-2xl font-bold tracking-tight text-[#2C2C2A] sm:text-3xl">
            {t("landingResourcesTitle")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-700 sm:text-base">{t("landingResourcesSubtitle")}</p>
          <div className="mt-8">
            <Link
              href="/blog"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#0F6E56] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#0d5c48]"
            >
              {t("landingResourcesCta")}
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>

        <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {RESOURCE_CARDS.map((card) => (
            <li key={card.href}>
              <article className="flex h-full flex-col rounded-3xl border border-[#E8E6DF] bg-white p-6 shadow-[0_8px_30px_rgba(44,44,42,0.06)] transition-shadow hover:shadow-md">
                <p className="inline-flex w-fit rounded-full bg-[#EFF8F4] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0F6E56]">
                  {t(card.audienceKey)}
                </p>
                <h3 className="mt-4 text-lg font-bold leading-snug text-[#2C2C2A]">{t(card.titleKey)}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-700">{t(card.descKey)}</p>
                <Link
                  href={card.href}
                  className="mt-6 inline-flex items-center text-sm font-semibold text-[#0F6E56] underline-offset-4 hover:underline"
                >
                  {t("landingResourceReadArticle")}
                  <ArrowRight className="ml-1 h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
