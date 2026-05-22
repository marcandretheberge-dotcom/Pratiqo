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
import { DEFAULT_LOCALE, detectLocale, normalizeLocale, type Locale } from "./i18n/client";
import { t as translate, type TranslationKey } from "./translations";
import {
  formatPrice as formatGeoPrice,
  formatDualPrice as formatGeoDualPrice,
  type Currency,
  getDefaultGeoConfig,
} from "@/lib/geoLocale";
import { formatDisplayPrice as formatConvertedDisplayPrice } from "@/lib/currency/format";
import { normalizeCurrency } from "@/lib/currency/rates";

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
  formatDisplayPrice: (amount: number, sourceCurrency?: Currency | string | null) => ReturnType<typeof formatConvertedDisplayPrice>;
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
  formatDisplayPrice: (amount) => ({
    primary: String(amount),
    original: String(amount),
    approximate: false,
    sourceCurrency: "CAD",
    displayCurrency: "CAD",
    asOf: "",
  }),
  formatDualPrice: () => null,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [currency, setCurrencyState] = useState<Currency>(getDefaultGeoConfig().currency);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const normalizedSaved = normalizeLocale(saved);
      if (saved) {
        setLocaleState(normalizedSaved);
      }
      const savedCur = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (savedCur) setCurrencyState(normalizeCurrency(savedCur, getDefaultGeoConfig().currency));
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
            currency?: Currency | string;
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
            const nextCurrency = normalizeCurrency(body.currency, getDefaultGeoConfig().currency);
            setCurrencyState(nextCurrency);
            try {
              localStorage.setItem(STORAGE_KEY_CURRENCY, nextCurrency);
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
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    const normalized = normalizeLocale(newLocale);
    setLocaleState(normalized);
    persistLocale(normalized);
  }, []);

  const setCurrency = useCallback((newCurrency: Currency) => {
    const normalized = normalizeCurrency(newCurrency, getDefaultGeoConfig().currency);
    setCurrencyState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, normalized);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: TranslationKey) => translate(key, locale), [locale]);

  const formatPrice = useCallback(
    (amount: number) => {
      return formatGeoPrice(amount, "CAD", locale);
    },
    [locale],
  );

  const formatDisplayPrice = useCallback(
    (amount: number, sourceCurrency?: Currency | string | null) => {
      return formatConvertedDisplayPrice({
        amount,
        sourceCurrency: sourceCurrency ?? "CAD",
        displayCurrency: currency,
        locale,
      });
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
      formatDisplayPrice,
      formatDualPrice,
    }),
    [locale, setLocale, t, currency, setCurrency, countryCode, formatPrice, formatDisplayPrice, formatDualPrice],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
