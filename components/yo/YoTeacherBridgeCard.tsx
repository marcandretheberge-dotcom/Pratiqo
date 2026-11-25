import Link from "next/link";
import { GraduationCap, MessageCircle } from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import type { YoPratiqoModuleConfig } from "@/lib/yo/yopratiqoProductConfig";

const CTA_LABEL = lstr("Trouver un professeur sur Pratiqo", "Find a teacher on Pratiqo", "Buscar un profesor en Pratiqo");

export function YoTeacherBridgeCard({
  locale,
  moduleConfig,
  title,
  body,
  href,
}: {
  locale: YoLocale;
  moduleConfig: YoPratiqoModuleConfig;
  title: YoLocalizedString;
  body: YoLocalizedString;
  href?: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[#DDF4F1] bg-white p-6 shadow-[0_10px_30px_rgba(15,58,52,0.07)]">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 size-48 rounded-full bg-[#DDF4F1]/80 blur-3xl"
      />
      <div className="relative flex flex-col gap-4">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-[#F4B400]/45 bg-[#FFF4D6] text-[#0F6E56]">
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
          href={href ?? moduleConfig.teacherSearchUrl}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-[#0F6E56]/18 bg-[#DDF4F1]/70 px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#DDF4F1]"
        >
          <MessageCircle className="size-4" aria-hidden />
          {t(CTA_LABEL, locale)}
        </Link>
      </div>
    </article>
  );
}
