import {
  MEMBRE_PRO_COMMISSION_MODEL,
  MEMBRE_PRO_PLAN,
} from "@/lib/config/membrePro";

export type MarketCode = "CA" | "UY";

export type MarketAccessConfig = {
  marketCode: MarketCode;
  countryCode: string;
  label: string;
  currency: "CAD" | "UYU" | "USD";
  isTeacherOnboardingEnabled: boolean;
  isStudentBookingEnabled: boolean;
  isMembreProEnabled: boolean;
  isPayoutEnabled: boolean;
  status: "launched" | "waitlist";
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
    isTeacherOnboardingEnabled: true,
    isStudentBookingEnabled: true,
    isMembreProEnabled: true,
    isPayoutEnabled: true,
    status: "launched",
    commissionModel: MEMBRE_PRO_COMMISSION_MODEL,
    proMonthlyPriceCad: MEMBRE_PRO_PLAN.proMonthlyPriceCad,
  },
  UY: {
    marketCode: "UY",
    countryCode: "UY",
    label: "Uruguay",
    currency: "UYU",
    isTeacherOnboardingEnabled: false,
    isStudentBookingEnabled: false,
    isMembreProEnabled: false,
    isPayoutEnabled: false,
    status: "waitlist",
    commissionModel: {
      status: "inactive_placeholder",
      note:
        "Uruguay is configured for future market planning only. No Uruguay commission or Pro pricing is active.",
    },
  },
} as const;

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
      "Pratiqo is not open to teachers in this country yet. Canada is the only supported launch market for teacher monetization.",
  };
}
