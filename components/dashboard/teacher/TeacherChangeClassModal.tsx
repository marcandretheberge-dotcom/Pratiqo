"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export function TeacherChangeClassModal({
  open,
  onClose,
  messagesHref,
  onRequestCancelThisClass,
}: {
  open: boolean;
  onClose: () => void;
  /** `/messages` or `/messages?peer=…` */
  messagesHref: string;
  /** Opens the existing cancel confirmation flow for the contextual booking. */
  onRequestCancelThisClass: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const goMessages = () => {
    router.push(messagesHref);
    onClose();
  };

  const node = (
    <div className="fixed inset-0 z-[195] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/35" aria-label={t("bookingClose")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "relative z-[196] w-full max-w-md rounded-2xl border border-[#E8E6DF] bg-white p-6 shadow-[0_20px_60px_rgba(44,44,42,0.12)]",
          "max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-slate-500 transition-colors hover:bg-[#F1EFE8]"
          aria-label={t("bookingClose")}
        >
          <X size={18} />
        </button>
        <h2 id={titleId} className="pr-10 text-lg font-bold tracking-tight text-[#2C2C2A]">
          {t("changeThisClassTitle")}
        </h2>
        <p id={descId} className="mt-3 text-sm leading-relaxed text-[#6B6760]">
          {t("changeThisClassBody")}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={goMessages}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-700 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            {t("proposeNewTime")}
          </button>
          <button
            type="button"
            onClick={goMessages}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-teal-700/35 bg-white text-sm font-semibold text-teal-700 transition hover:bg-teal-700/[0.06]"
          >
            {t("messageStudent")}
          </button>
          <Link
            href="/legal/annulation"
            onClick={onClose}
            className="text-center text-xs font-medium text-teal-700/85 underline-offset-2 hover:underline"
          >
            {t("viewCancellationPolicy")}
          </Link>
        </div>
        <div className="mt-8 border-t border-[#F1EFE8] pt-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestCancelThisClass();
            }}
            className="text-xs font-medium text-rose-600/75 underline-offset-2 transition hover:text-rose-700 hover:underline"
          >
            {t("cancelThisClass")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
