"use client";

import React from "react";
import { AuthProvider } from "../components/AuthProvider";
import { InstallAppPrompt } from "@/components/app/InstallAppPrompt";
import { PwaServiceWorker } from "@/components/PwaServiceWorker";
import { LocaleProvider } from "../lib/locale-context";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { CookieConsentProvider } from "@/components/privacy/CookieConsentProvider";
import { MobileNativeBridge } from "@/components/mobile/MobileNativeBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <CookieConsentProvider>
        <MobileNativeBridge />
        <AuthProvider>{children}</AuthProvider>
        <InstallAppPrompt />
        <PwaServiceWorker />
        <PostHogPageView />
      </CookieConsentProvider>
    </LocaleProvider>
  );
}

