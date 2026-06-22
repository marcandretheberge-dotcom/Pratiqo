"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  acceptAllCookieConsent,
  acceptNecessaryOnlyCookieConsent,
  hasRecordedCookieConsent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsent,
} from "@/lib/privacy/cookieConsent";
import { useLocale } from "@/lib/locale-context";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";
import { CookiePreferencesModal } from "@/components/privacy/CookiePreferencesModal";

type CookieConsentContextValue = {
  consent: CookieConsent | null;
  bannerVisible: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAnalytics: () => void;
  acceptNecessaryOnly: () => void;
  savePreferences: (analytics: boolean, diagnostics: boolean) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readCookieConsent();
    setConsent(stored);
    setBannerVisible(!hasRecordedCookieConsent());
    setHydrated(true);

    const onConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent | null>).detail ?? readCookieConsent();
      setConsent(detail);
      setBannerVisible(!detail);
    };

    window.addEventListener("pratiqo:cookie-consent", onConsentChange as EventListener);
    window.addEventListener("storage", onConsentChange);
    return () => {
      window.removeEventListener("pratiqo:cookie-consent", onConsentChange as EventListener);
      window.removeEventListener("storage", onConsentChange);
    };
  }, []);

  const refreshConsent = useCallback((record: CookieConsent | null) => {
    setConsent(record);
    setBannerVisible(!record);
    setPreferencesOpen(false);
  }, []);

  const acceptAnalytics = useCallback(() => {
    refreshConsent(acceptAllCookieConsent(locale, "banner"));
  }, [locale, refreshConsent]);

  const acceptNecessaryOnly = useCallback(() => {
    refreshConsent(acceptNecessaryOnlyCookieConsent(locale, "banner"));
  }, [locale, refreshConsent]);

  const savePreferences = useCallback(
    (analytics: boolean, diagnostics: boolean) => {
      refreshConsent(
        writeCookieConsent({
          analytics,
          diagnostics,
          locale,
          source: "preferences",
        }),
      );
    },
    [locale, refreshConsent],
  );

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      bannerVisible: hydrated && bannerVisible,
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      acceptAnalytics,
      acceptNecessaryOnly,
      savePreferences,
    }),
    [
      acceptAnalytics,
      acceptNecessaryOnly,
      bannerVisible,
      consent,
      hydrated,
      preferencesOpen,
      savePreferences,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      <CookieConsentBanner />
      <CookiePreferencesModal />
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}

export function useOpenCookiePreferences(): () => void {
  const ctx = useContext(CookieConsentContext);
  return ctx?.openPreferences ?? (() => {});
}
