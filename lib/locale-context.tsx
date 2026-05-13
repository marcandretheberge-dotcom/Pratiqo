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
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_LOCALE, detectLocale, normalizeLocale, type Locale } from "./i18n/client";
import { t as translate, type TranslationKey } from "./translations";
import { getLocaleFromPath, stripLocale } from "./i18n/routing";
import { marketingPathForLocale, isUnprefixedMarketingPath } from "./i18n/marketingPaths";
import {
  formatPrice as formatGeoPrice,
  formatDualPrice as formatGeoDualPrice,
  type Currency,
  getDefaultGeoConfig,
} from "@/lib/geoLocale";

const STORAGE_KEY = "pratiqo-locale";
const STORAGE_KEY_CURRENCY = "pratiqo-currency";

function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  /** ISO 3166-1 alpha-2 country code detected from IP geo, e.g. "CA", "UY". */
  countryCode: string | null;
  /** Single-currency price: uses the user's detected currency. */
  formatPrice: (amount: number) => string;
  /**
   * Dual-price string for UY ("$U 1.000 (US$ 25)").
   * Returns null for all other markets — fall back to formatPrice in that case.
   */
  formatDualPrice: (amountUSD: number) => string | null;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => String(key),
  currency: getDefaultGeoConfig().currency,
  setCurrency: () => {},
  countryCode: null,
  formatPrice: (amount) => String(amount),
  formatDualPrice: () => null,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const urlLocale = pathname ? getLocaleFromPath(pathname) : null;
  const [locale, setLocaleState] = useState<Locale>(urlLocale ?? DEFAULT_LOCALE);
  const [currency, setCurrencyState] = useState<Currency>(getDefaultGeoConfig().currency);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  // Keep state in sync with URL locale (most authoritative source post-1.3).
  useEffect(() => {
    if (urlLocale && urlLocale !== locale) {
      setLocaleState(urlLocale);
      persistLocale(urlLocale);
    }
  }, [urlLocale, locale]);

  useEffect(() => {
    if (urlLocale) return; // URL already pinned the locale
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const normalizedSaved = normalizeLocale(saved);
      if (saved) {
        setLocaleState(normalizedSaved);
      }
      const savedCur = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (savedCur) setCurrencyState(savedCur as Currency);
      if (saved) return;
    } catch {
      /* ignore */
    }
    // No saved preference: use geo lookup first, then fall back to browser language.
    void (async () => {
      try {
        const resp = await fetch("/api/geo", { method: "GET" });
        if (resp.ok) {
          const body = (await resp.json()) as {
            locale?: string | null;
            currency?: Currency;
            country?: string;
          } | null;
          if (body?.locale) {
            const nextLocale = normalizeLocale(body.locale);
            setLocaleState(nextLocale);
            persistLocale(nextLocale);
          } else {
            const detected = detectLocale();
            setLocaleState(detected);
            persistLocale(detected);
          }
          if (body?.currency) {
            setCurrencyState(body.currency);
            try {
              localStorage.setItem(STORAGE_KEY_CURRENCY, body.currency);
            } catch {
              /* ignore */
            }
          }
          if (body?.country) {
            setCountryCode(body.country);
          }
          return;
        }
      } catch {
        /* ignore */
      }
      const detected = detectLocale();
      setLocaleState(detected);
      persistLocale(detected);
    })();
  }, [urlLocale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      const normalized = normalizeLocale(newLocale);
      setLocaleState(normalized);
      persistLocale(normalized);

      // If we're on a marketing page, navigate to the equivalent localized URL
      // so the user stays on the same page in the new language.
      const current = pathname ?? "/";
      const stripped = stripLocale(current);
      if (getLocaleFromPath(current) || isUnprefixedMarketingPath(stripped)) {
        const next = marketingPathForLocale(stripped, normalized);
        if (next !== current) {
          router.replace(next);
        }
      }
    },
    [pathname, router],
  );

  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, newCurrency);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: TranslationKey) => translate(key, locale), [locale]);

  const formatPrice = useCallback(
    (amount: number) => {
      return formatGeoPrice(amount, currency, locale);
    },
    [currency, locale],
  );

  const formatDualPrice = useCallback(
    (amountUSD: number) => {
      return formatGeoDualPrice(amountUSD, currency, locale);
    },
    [currency, locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      currency,
      setCurrency,
      countryCode,
      formatPrice,
      formatDualPrice,
    }),
    [locale, setLocale, t, currency, setCurrency, countryCode, formatPrice, formatDualPrice],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
