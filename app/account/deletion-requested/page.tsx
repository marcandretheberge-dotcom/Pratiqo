"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

export default function AccountDeletionRequestedPage() {
  const { t } = useLocale();

  return (
    <main className="min-h-[70dvh] bg-[#FAFCFB] px-4 py-16">
      <section className="mx-auto max-w-xl rounded-3xl border border-[#DCEAE3] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E1F5EE] text-[#0F6E56]">
          <CheckCircle2 size={28} aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#2C2C2A]">{t("accountDeletionRequestedTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("accountDeletionRequestedBody")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#0F6E56] px-6 text-sm font-bold text-white hover:bg-[#128061]"
        >
          {t("backHome")}
        </Link>
      </section>
    </main>
  );
}
