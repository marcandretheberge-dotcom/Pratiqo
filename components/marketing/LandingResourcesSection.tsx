"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

const RESOURCE_CARDS = [
  {
    href: "/blog/comment-choisir-tuteur-enfant-quebec",
    audienceKey: "landingResourceAudienceParents" as const,
    titleKey: "landingResourceCard1Title" as const,
  },
  {
    href: "/blog/tuteur-en-ligne-ou-a-domicile",
    audienceKey: "landingResourceAudienceStudents" as const,
    titleKey: "landingResourceCard2Title" as const,
  },
  {
    href: "/blog/donner-cours-prives-quebec",
    audienceKey: "landingResourceAudienceTeachers" as const,
    titleKey: "landingResourceCard3Title" as const,
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
          <div className="mt-3">
            <Link
              href="/ressources"
              className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-900"
            >
              {t("landingResourcesCta")}
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>

        <ul className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          {RESOURCE_CARDS.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="group flex h-full min-w-0 items-center gap-3 rounded-lg border border-[#E8E6DF] bg-white p-4 hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-teal-700">{t(card.audienceKey)}</p>
                  <h3 className="mt-1 text-sm font-semibold leading-relaxed text-[#2C2C2A] group-hover:underline">{t(card.titleKey)}</h3>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
