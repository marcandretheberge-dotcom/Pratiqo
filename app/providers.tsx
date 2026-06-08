"use client";

import React from "react";
import { AuthProvider } from "../components/AuthProvider";
import { PwaServiceWorker } from "@/components/PwaServiceWorker";
import { LocaleProvider } from "../lib/locale-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>{children}</AuthProvider>
      <PwaServiceWorker />
    </LocaleProvider>
  );
}

