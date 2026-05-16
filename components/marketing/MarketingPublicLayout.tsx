"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

type MarketingPublicLayoutProps = {
  children: ReactNode;
  /** Optional wrapper classes (e.g. page background). */
  className?: string;
  /** Extra classes on `<main>`. */
  mainClassName?: string;
};

/**
 * Shared shell for public marketing / SEO pages: homepage-aligned header + footer.
 */
export function MarketingPublicLayout({ children, className, mainClassName }: MarketingPublicLayoutProps) {
  return (
    <div className={cn("relative flex min-h-[100dvh] flex-col bg-[#FAFCFB]", className)}>
      <MarketingHeader />
      <main id="main-content" className={cn("flex flex-1 flex-col", mainClassName)}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
