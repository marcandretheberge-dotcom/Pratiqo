import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";

import type { YoLocale } from "@/lib/yo/types";
import {
  YO_TEACHER_BRIDGE_COMING_SOON_COPY,
  getTeacherBridgeConsentCopy,
} from "@/lib/yopratiqo/teacherBridge";

export function YoTeacherBridgeTeaser({ locale }: { locale: YoLocale }) {
  const copy = YO_TEACHER_BRIDGE_COMING_SOON_COPY[locale] ?? YO_TEACHER_BRIDGE_COMING_SOON_COPY.fr;

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-6 overflow-hidden rounded-[2rem] border border-[#DDF4F1] bg-gradient-to-br from-[#FAFCFB] via-white to-[#FFF4D6] p-6 shadow-[0_16px_42px_rgba(15,58,52,0.08)] sm:p-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
              <GraduationCap className="size-3.5" aria-hidden />
              {copy.eyebrow}
            </span>
            <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-[#0F6E56] sm:text-3xl">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/74 sm:text-base">
              {copy.body}
            </p>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/86 p-5 shadow-[0_10px_30px_rgba(15,58,52,0.08)]">
            <p className="flex items-center gap-2 text-sm font-bold text-[#0F6E56]">
              <ShieldCheck className="size-4 text-[#1D9E75]" aria-hidden />
              {copy.status}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#0F6E56]/72">
              {getTeacherBridgeConsentCopy(locale)}
            </p>
            <Link
              href="/trouver-un-prof"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#0F6E56]/18 bg-[#DDF4F1]/70 px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#DDF4F1]"
            >
              {locale === "fr" ? "Trouver un professeur" : locale === "es" ? "Encontrar un profesor" : "Find a teacher"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
