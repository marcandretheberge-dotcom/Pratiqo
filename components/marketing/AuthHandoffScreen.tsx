"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

export function AuthHandoffScreen() {
  const { t } = useLocale();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-[#FAFCFB] px-6 text-center">
      <Loader2 className="h-9 w-9 animate-spin text-teal-700" aria-hidden />
      <p className="text-sm font-semibold text-[var(--p-text)]">{t("authHandoffTitle")}</p>
      <p className="text-sm text-[var(--p-text-muted)] max-w-sm leading-relaxed">{t("authHandoffSubtitle")}</p>
    </div>
  );
}
