import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import { learningHomeCopy } from "@/lib/yo/daily/learningHomeCopy";

/** A normal learner entry point, without adding another control to course headers. */
export function TodayNavLink({ locale }: { locale: YoLocale }) {
  const c = learningHomeCopy[locale];
  return <Link href={buildYoLocaleHref("/yo/aujourdhui", locale)} prefetch={false}
    className="mb-5 flex min-h-16 items-center gap-3 rounded-2xl border border-[#D1DDC9] bg-[#EBF2E3] px-4 py-3 text-[#294D35] transition hover:bg-[#E2EDD7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294D35]">
    <Compass size={24} aria-hidden className="shrink-0" />
    <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{c.today}</span><span className="mt-1 block text-xs leading-5 text-[#5A6C50]">{{ fr: "Reprendre mon parcours, réviser et retrouver mes XP.", en: "Resume my course, review and see my XP.", es: "Retomar mi curso, repasar y ver mis XP." }[locale]}</span></span>
    <ArrowRight size={19} aria-hidden className="shrink-0" />
  </Link>;
}
