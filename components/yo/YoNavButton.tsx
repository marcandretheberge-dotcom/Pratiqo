"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

type YoNavButtonVariant = "desktop" | "mobile";

export function YoNavButton({
  variant = "desktop",
  className,
}: {
  variant?: YoNavButtonVariant;
  className?: string;
}) {
  const { t } = useLocale();
  const isMobile = variant === "mobile";

  return (
    <Link
      href="/yo"
      aria-label="Yo Pratiqo"
      className={cn(
        "group inline-flex shrink-0 items-center border border-[#F4B400]/45 bg-[#FFF4D6] text-[#0F6E56] shadow-[0_1px_0_rgba(244,180,0,0.18)] transition hover:border-[#F4B400]/70 hover:bg-[#ffefbd] hover:text-[#0F6E56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2",
        isMobile
          ? "max-w-[170px] gap-2 rounded-2xl px-3 py-2 text-left"
          : "gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-[#F4B400]/20 text-[#0F6E56]",
          isMobile ? "size-8" : "size-5",
        )}
      >
        <Sparkles className={isMobile ? "size-4" : "size-3.5"} />
      </span>
      <span className={cn("min-w-0", isMobile ? "flex flex-col leading-tight" : "inline-flex items-center gap-1.5")}>
        <span className={cn("font-bold", isMobile ? "text-sm" : "text-xs")}>Yo Pratiqo</span>
        {isMobile ? (
          <span className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-tight text-[#0F6E56]/72">
            {t("yoNavMobileSubtext")}
          </span>
        ) : (
          <span className="rounded-full border border-[#F4B400]/50 bg-white/65 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#0F6E56]/80">
            {t("yoNavBadgeNew")}
          </span>
        )}
      </span>
    </Link>
  );
}
