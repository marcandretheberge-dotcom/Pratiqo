"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarHeart } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export function TeacherScheduleChangeHelperPanel({
  messagesHref,
  onOpenRescheduleModal,
  onRequestCancelThisClass,
  cancelBusy,
}: {
  messagesHref: string;
  onOpenRescheduleModal: () => void;
  onRequestCancelThisClass: () => void;
  cancelBusy?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-sm",
        "lg:sticky lg:top-24 lg:self-start",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-[#0F6E56]">
        <CalendarHeart size={18} className="shrink-0 opacity-90" aria-hidden />
        <h3 className="text-sm font-bold leading-snug text-[#2C2C2A]">{t("needToChangeClassTitle")}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#6B6760]">{t("needToChangeClassBody")}</p>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onOpenRescheduleModal}
          disabled={cancelBusy}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#0F6E56] text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47] disabled:opacity-50"
        >
          {t("proposeNewTime")}
        </button>
        <button
          type="button"
          onClick={() => router.push(messagesHref)}
          disabled={cancelBusy}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#0F6E56]/30 bg-white text-sm font-semibold text-[#0F6E56] transition hover:bg-[#0F6E56]/[0.05] disabled:opacity-50"
        >
          {t("messageStudent")}
        </button>
        <Link
          href="/legal/annulation"
          className="text-center text-xs font-medium text-[#0F6E56]/80 underline-offset-2 hover:underline"
        >
          {t("viewCancellationPolicy")}
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200/70 bg-slate-50/50 px-3 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{t("dangerZone")}</p>
        <button
          type="button"
          onClick={onRequestCancelThisClass}
          disabled={cancelBusy}
          className="mt-1.5 text-left text-xs font-medium text-rose-700/65 underline-offset-2 transition hover:text-rose-800/90 hover:underline disabled:opacity-50"
        >
          {t("cancelThisClass")}
        </button>
      </div>
    </aside>
  );
}
