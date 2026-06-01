import Link from "next/link";
import { GraduationCap, MessageCircle } from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import type { YoPratiqoModuleConfig } from "@/lib/yo/yopratiqoProductConfig";

const CTA_LABEL = lstr("Trouver un professeur", "Find a teacher");

export function YoTeacherBridgeCard({
  locale,
  moduleConfig,
  title,
  body,
}: {
  locale: YoLocale;
  moduleConfig: YoPratiqoModuleConfig;
  title: YoLocalizedString;
  body: YoLocalizedString;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_10px_30px_rgba(15,58,52,0.08)]">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 size-48 rounded-full bg-[#F4B400]/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-4">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#0F6E56] text-white shadow-[0_12px_28px_rgba(15,110,86,0.2)]">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#0F6E56]">
            {t(title, locale)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/76">
            {t(body, locale)}
          </p>
        </div>
        <Link
          href={moduleConfig.teacherSearchUrl}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.2)] transition hover:bg-[#0b5b47]"
        >
          <MessageCircle className="size-4" aria-hidden />
          {t(CTA_LABEL, locale)}
        </Link>
      </div>
    </article>
  );
}
