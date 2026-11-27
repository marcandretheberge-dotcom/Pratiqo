import type { Metadata } from "next";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoDocumentLanguage } from "@/components/yo/YoDocumentLanguage";
import { YoLearningToday } from "@/components/yo/daily/YoLearningToday";
import { dailyLanguage } from "@/lib/yo/daily/learningHome";
import { loadDailyCourse } from "@/lib/yo/daily/learningHome.server";
import { learningHomeCopy } from "@/lib/yo/daily/learningHomeCopy";
import { buildYoLocaleHref, getYoLocale } from "@/lib/yo/localize";
import styles from "@/components/yo/daily/learningToday.module.css";

type Props = { searchParams: Promise<{ lang?: string | string[]; language?: string | string[] }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = getYoLocale((await searchParams).lang);
  return { title: `${learningHomeCopy[locale].today} · YoPratiqo`, robots: { index: false, follow: false } };
}
export default async function LearningTodayPage({ searchParams }: Props) {
  const query = await searchParams, locale = getYoLocale(query.lang), language = dailyLanguage(query.language);
  const course = await loadDailyCourse(language), c = learningHomeCopy[locale];
  return <div className={styles.shell} lang={locale}>
    <YoDocumentLanguage locale={locale} />
    <YoAppHeader locale={locale} backHref={buildYoLocaleHref("/yo/langues", locale)} backLabel={c.back} title={c.today} selectorPath={`/yo/aujourdhui?language=${language}`} surfaceId="learning-today" hideLogoOnMobile />
    <YoLearningToday key={`${language}:${locale}`} course={course} locale={locale} restoreLanguage={query.language === undefined} />
  </div>;
}
