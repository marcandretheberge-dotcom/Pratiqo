import React from "react";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";

export default function GroupSessionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#FAFCFB]">
      <LandingHeader />
      <main id="main-content" className="flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
