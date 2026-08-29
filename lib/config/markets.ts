import {
  MEMBRE_PRO_COMMISSION_MODEL,
  MEMBRE_PRO_PLAN,
} from "@/lib/config/membrePro";

export type MarketCode = "CA" | "UY";

export type PratiqoMarketStatus =
  | "LAUNCHED"
  | "NEXT_MARKET"
  | "PLANNED"
  | "DISABLED";

export type PratiqoMarketCapabilities = {
  seoEnabled: boolean;
  teacherSignupEnabled: boolean;
  teacherPublishingEnabled: boolean;
  studentSearchEnabled: boolean;
  bookingEnabled: boolean;
  paymentsEnabled: boolean;
  payoutsEnabled: boolean;
  membreProEnabled: boolean;
};

export type MarketAccessConfig = {
  marketCode: MarketCode;
  countryCode: string;
  label: string;
  currency: "CAD" | "UYU" | "USD";
  status: PratiqoMarketStatus;
  capabilities: PratiqoMarketCapabilities;
  isTeacherOnboardingEnabled: boolean;
  isStudentBookingEnabled: boolean;
  isMembreProEnabled: boolean;
  isPayoutEnabled: boolean;
  commissionModel:
    | typeof MEMBRE_PRO_COMMISSION_MODEL
    | { status: "inactive_placeholder"; note: string };
  proMonthlyPriceCad?: typeof MEMBRE_PRO_PLAN.proMonthlyPriceCad;
};

export const MARKET_NOT_SUPPORTED_CODE = "market_not_supported" as const;

export const PRATIQO_MARKETS: Record<MarketCode, MarketAccessConfig> = {
  CA: {
    marketCode: "CA",
    countryCode: "CA",
    label: "Canada",
    currency: "CAD",
    status: "LAUNCHED",
    capabilities: {
      seoEnabled: true,
      teacherSignupEnabled: true,
      teacherPublishingEnabled: true,
      studentSearchEnabled: true,
      bookingEnabled: true,
      paymentsEnabled: true,
      payoutsEnabled: true,
      membreProEnabled: true,
    },
    isTeacherOnboardingEnabled: true,
    isStudentBookingEnabled: true,
    isMembreProEnabled: true,
    isPayoutEnabled: true,
    commissionModel: MEMBRE_PRO_COMMISSION_MODEL,
    proMonthlyPriceCad: MEMBRE_PRO_PLAN.proMonthlyPriceCad,
  },
  UY: {
    marketCode: "UY",
    countryCode: "UY",
    label: "Uruguay",
    currency: "UYU",
    status: "NEXT_MARKET",
    capabilities: {
      seoEnabled: true,
      teacherSignupEnabled: false,
      teacherPublishingEnabled: false,
      studentSearchEnabled: false,
      bookingEnabled: false,
      paymentsEnabled: false,
      payoutsEnabled: false,
      membreProEnabled: false,
    },
    isTeacherOnboardingEnabled: false,
    isStudentBookingEnabled: false,
    isMembreProEnabled: false,
    isPayoutEnabled: false,
    commissionModel: {
      status: "inactive_placeholder",
      note:
        "Uruguay is configured as a NEXT_MARKET planning state only. No Uruguay commission or Pro pricing is active.",
    },
  },
} as const;

/** Default teacher market while Pratiqo is launched in Canada only. */
export const DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE = PRATIQO_MARKETS.CA.countryCode;

export type MarketGate =
  | "teacher_onboarding"
  | "student_booking"
  | "membre_pro"
  | "payout";

export function normalizeCountryCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Blank/null teacher country defaults to the launched market (CA) for pricing
 * and draft creation. Explicit unsupported codes (e.g. FR, UY) stay unchanged.
 */
export function resolveTeacherMarketCountryCode(countryCode: unknown): {
  countryCode: string;
  defaultedFromBlank: boolean;
} {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) {
    return {
      countryCode: DEFAULT_LAUNCHED_TEACHER_COUNTRY_CODE,
      defaultedFromBlank: true,
    };
  }
  return { countryCode: normalized, defaultedFromBlank: false };
}

export function getMarketByCountryCode(
  countryCode: unknown,
): MarketAccessConfig | null {
  const normalized = normalizeCountryCode(countryCode);
  if (normalized === "CA") return PRATIQO_MARKETS.CA;
  if (normalized === "UY") return PRATIQO_MARKETS.UY;
  return null;
}

export function isMarketGateEnabled(
  countryCode: unknown,
  gate: MarketGate,
): boolean {
  const market = getMarketByCountryCode(countryCode);
  if (!market) return false;
  if (gate === "teacher_onboarding") return market.isTeacherOnboardingEnabled;
  if (gate === "student_booking") return market.isStudentBookingEnabled;
  if (gate === "membre_pro") return market.isMembreProEnabled;
  return market.isPayoutEnabled;
}

export function isMarketSeoEnabled(countryCode: unknown): boolean {
  const market = getMarketByCountryCode(countryCode);
  return market?.capabilities.seoEnabled === true;
}

export function isLaunchedMarket(countryCode: unknown): boolean {
  return getMarketByCountryCode(countryCode)?.status === "LAUNCHED";
}

export function isNextMarket(countryCode: unknown): boolean {
  return getMarketByCountryCode(countryCode)?.status === "NEXT_MARKET";
}

export function isTeacherMarketSupported(countryCode: unknown): boolean {
  return isMarketGateEnabled(countryCode, "teacher_onboarding");
}

export function isMembreProMarketSupported(countryCode: unknown): boolean {
  return isMarketGateEnabled(countryCode, "membre_pro");
}

export function isPayoutMarketSupported(countryCode: unknown): boolean {
  return isMarketGateEnabled(countryCode, "payout");
}

export function marketNotSupportedPayload(countryCode: unknown) {
  return {
    code: MARKET_NOT_SUPPORTED_CODE,
    countryCode: normalizeCountryCode(countryCode) || null,
    error:
      "Pratiqo teacher monetization is currently available in Canada. Uruguay is in preparation; other countries are not open yet.",
  };
}
