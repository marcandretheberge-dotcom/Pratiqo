"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import type { Locale } from "@/lib/i18n/types";

function teacherSignupHref(locale: Locale): string {
  return locale === "fr" ? "/devenir-enseignant" : "/become-teacher";
}

export function BlogArticleClosingCta({ teacherFacing }: { teacherFacing: boolean }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const teach = teacherSignupHref(locale);
  const studentSearchHref = user ? "/student/search" : "/login?next=/student/search";

  if (teacherFacing) {
    return (
      <section className="mx-auto max-w-[820px] px-4 pb-16 pt-4 sm:px-6">
        <div className="rounded-3xl border border-[#E8E6DE] bg-gradient-to-br from-[#EFF8F4] to-white px-8 py-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-[#2C2C2A] sm:text-2xl">{t("blogCtaTeacherTitle")}</h2>
          <Link
            href={teach}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[#0F6E56] px-8 text-sm font-semibold text-white shadow-md hover:bg-[#0c5a46]"
          >
            {t("blogBecomeTeacherCta")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[820px] px-4 pb-16 pt-4 sm:px-6">
      <div className="rounded-3xl border border-[#E8E6DE] bg-gradient-to-br from-white to-[#FAFAF8] px-8 py-10 text-center shadow-sm">
        <h2 className="text-xl font-bold text-[#2C2C2A] sm:text-2xl">{t("blogCtaStudentTitle")}</h2>
        <Link
          href={studentSearchHref}
          prefetch={false}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[#0F6E56] px-8 text-sm font-semibold text-white shadow-md hover:bg-[#0c5a46]"
        >
          {t("blogFindTeacherCta")}
        </Link>
      </div>
    </section>
  );
}
