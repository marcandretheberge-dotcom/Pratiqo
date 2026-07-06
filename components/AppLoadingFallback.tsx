"use client";

import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export function AppLoadingFallback({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "flex min-h-[50vh] items-center justify-center text-sm text-[var(--p-text-muted)]",
        className,
      )}
    >
      {t("loading")}
    </div>
  );
}

export function AppLoadingText({ className }: { className?: string }) {
  const { t } = useLocale();
  return <span className={className}>{t("loading")}</span>;
}
