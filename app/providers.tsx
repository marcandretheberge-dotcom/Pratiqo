"use client";

import React from "react";
import { AuthProvider } from "../components/AuthProvider";
import { PwaServiceWorker } from "@/components/PwaServiceWorker";
import { LocaleProvider } from "../lib/locale-context";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>{children}</AuthProvider>
      <PwaServiceWorker />
      <PostHogPageView />
    </LocaleProvider>
  );
}

