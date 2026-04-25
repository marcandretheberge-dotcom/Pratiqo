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
import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from "./i18n";
import { t as translate, type TranslationKey } from "./translations";
import { formatPrice as formatGeoPrice, type Currency, getDefaultGeoConfig } from "@/lib/geoLocale";

const STORAGE_KEY = "pratiqo-locale";
const STORAGE_KEY_CURRENCY = "pratiqo-currency";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => String(key),
  currency: getDefaultGeoConfig().currency,
  setCurrency: () => {},
  formatPrice: (amount) => String(amount),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [currency, setCurrencyState] = useState<Currency>(getDefaultGeoConfig().currency);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isLocale(saved)) {
        setLocaleState(saved);
      }
      const savedCur = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (savedCur) setCurrencyState(savedCur as Currency);
      if (saved && isLocale(saved)) return;
    } catch {
      /* ignore */
    }
    // No saved preference: use geo lookup first, then fall back to browser language.
    void (async () => {
      try {
        const resp = await fetch("/api/geo", { method: "GET" });
        if (resp.ok) {
          const body = (await resp.json()) as { locale?: Locale; currency?: Currency } | null;
          if (body?.locale && isLocale(body.locale)) {
            setLocaleState(body.locale);
            try {
              localStorage.setItem(STORAGE_KEY, body.locale);
            } catch {
              /* ignore */
            }
          } else {
            setLocaleState(detectLocale());
          }
          if (body?.currency) {
            setCurrencyState(body.currency);
            try {
              localStorage.setItem(STORAGE_KEY_CURRENCY, body.currency);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      } catch {
        /* ignore */
      }
      setLocaleState(detectLocale());
    })();
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      /* ignore */
    }
  }, []);

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

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      currency,
      setCurrency,
      formatPrice,
    }),
    [locale, setLocale, t, currency, setCurrency, formatPrice],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
