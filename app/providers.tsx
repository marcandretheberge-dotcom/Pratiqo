"use client";

// Turbopack production builds do not always run the Sentry webpack injection
// that auto-loads sentry.client.config.ts. Importing it here guarantees the
// browser SDK is bundled whenever the app shell loads.
import "../sentry.client.config";

import React from "react";
import { AuthProvider } from "../components/AuthProvider";
import { LocaleProvider } from "../lib/locale-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>{children}</AuthProvider>
    </LocaleProvider>
  );
}

