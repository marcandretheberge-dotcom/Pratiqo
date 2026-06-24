"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Sparkles, Users } from "lucide-react";
import type { ResourceArticleMeta } from "@/lib/seo/resourceArticles";
import type { ResourceGuideGroupId } from "@/lib/marketing/resourceGuideHub";
import { RESOURCE_GUIDE_GROUPS } from "@/lib/marketing/resourceGuideHub";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/i18n/types";

const GROUP_META: Record<
  ResourceGuideGroupId,
  { titleKey: TranslationKey; icon: typeof BookOpen; descriptionKey?: TranslationKey }
> = {
  choose_teacher: { titleKey: "ressourcesGroupChooseTeacher", icon: Users },
  learn_confidently: { titleKey: "ressourcesGroupLearnConfidently", icon: Sparkles },
  popular_disciplines: { titleKey: "ressourcesGroupPopularDisciplines", icon: GraduationCap },
};

function articlesByGroup(articles: ResourceArticleMeta[]) {
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  return RESOURCE_GUIDE_GROUPS.map((group) => ({
    ...group,
    articles: group.slugOrder.map((slug) => bySlug.get(slug)).filter(Boolean) as ResourceArticleMeta[],
  })).filter((g) => g.articles.length > 0);
}

export default function RessourcesIndexContent({ articles }: { articles: ResourceArticleMeta[] }) {
  const { t } = useLocale();
  const groups = articlesByGroup(articles);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
      <LandingHeader />
      <main className="flex-1">
        <header className="border-b border-[#E8E6DF] bg-gradient-to-b from-[#EAF7F2] to-[#FAFCFB]">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700/80">{t("ressourcesHubEyebrow")}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#2C2C2A] text-balance">
              {t("ressourcesHubTitle")}
            </h1>
            <p className="mt-4 text-base text-[#6B6A65] leading-relaxed max-w-2xl">{t("ressourcesHubIntro")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/trouver-un-prof"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
              >
                {t("ressourcesFindTeachersCta")}
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E8E6DF] bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-[#FAFAF8]"
              >
                <BookOpen size={16} aria-hidden />
                {t("ressourcesSeeBlog")}
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 sm:py-14 space-y-12">
          {groups.map((group) => {
            const meta = GROUP_META[group.id];
            const Icon = meta.icon;
            return (
              <section key={group.id} aria-labelledby={`ressources-group-${group.id}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Icon size={20} aria-hidden />
                  </div>
                  <h2 id={`ressources-group-${group.id}`} className="text-xl font-bold text-[#2C2C2A]">
                    {t(meta.titleKey)}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.articles.map((article) => (
                    <article
                      key={article.slug}
                      className="flex flex-col rounded-2xl border border-[#E8E6DF] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">{article.category}</p>
                      <h3 className="mt-2 text-lg font-bold text-[#2C2C2A] leading-snug">
                        <Link href={`/ressources/${article.slug}`} className="hover:text-teal-700">
                          {article.title}
                        </Link>
                      </h3>
                      <p className="mt-2 flex-1 text-sm text-[#6B6A65] leading-relaxed">{article.description}</p>
                      <Link
                        href={`/ressources/${article.slug}`}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
                      >
                        {t("ressourcesReadGuide")}
                        <ArrowRight size={14} aria-hidden />
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-[#2C2C2A]">{t("ressourcesGroupBecomeTeacher")}</h2>
            <p className="mt-2 text-sm text-[#6B6A65] leading-relaxed max-w-2xl">{t("ressourcesGroupBecomeTeacherDesc")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/devenir-professeur"
                className="inline-flex rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
              >
                {t("ressourcesBecomeTeacherCta")}
              </Link>
              <Link
                href="/trouver-un-prof"
                className="inline-flex rounded-xl border border-[#E8E6DF] px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-[#FAFAF8]"
              >
                {t("ressourcesFindTeachersCta")}
              </Link>
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
