import { getVerificationLevel, nextVerificationLevel, type VerificationLevel } from "./verification";

export type VerificationStepState =
  | { kind: "not_started" }
  | { kind: "pending" }
  | { kind: "verified" }
  | { kind: "failed"; reason: string | null }
  | { kind: "provided" };

export type DerivedVerificationState = {
  level: VerificationLevel;
  nextLevel: VerificationLevel | null;
  identity: VerificationStepState;
  diploma: VerificationStepState;
  zone: VerificationStepState;
  background: VerificationStepState;
  emailConfirmed: boolean;
  isPro: boolean;
  marketplaceVisible: boolean;
};

export type VerificationStateInput = {
  plan: string | null;
  identity_verified: boolean | null;
  identity_status: string | null;
  stripe_identity_status: string | null;
  stripe_identity_failed_reason: string | null;
  diploma_verified: boolean | null;
  diploma_url: string | null;
  location_verification_status: string | null;
  cv_verification_status: string | null;
  cv_summary: string | null;
  bio: string | null;
  is_verified: boolean | null;
  verification_level: number | null;
};

function deriveIdentity(input: VerificationStateInput): VerificationStepState {
  const ss = (input.stripe_identity_status ?? "").toLowerCase();
  const is = (input.identity_status ?? "").toLowerCase();

  if (Boolean(input.identity_verified) || ss === "verified" || is === "verified") {
    return { kind: "verified" };
  }
  if (ss === "processing" || ss === "requires_input" || is === "pending") {
    return { kind: "pending" };
  }
  if (ss === "failed" || ss === "canceled" || is === "failed") {
    return { kind: "failed", reason: input.stripe_identity_failed_reason ?? null };
  }
  return { kind: "not_started" };
}

function deriveDiploma(input: VerificationStateInput): VerificationStepState {
  if (Boolean(input.diploma_verified)) return { kind: "verified" };
  if (input.diploma_url) return { kind: "pending" };
  return { kind: "not_started" };
}

function deriveZone(input: VerificationStateInput): VerificationStepState {
  const s = (input.location_verification_status ?? "").toLowerCase();
  if (s === "verified" || s === "auto_verified") return { kind: "verified" };
  if (s === "pending" || s === "review") return { kind: "pending" };
  if (s === "failed" || s === "rejected") return { kind: "failed", reason: null };
  return { kind: "not_started" };
}

/** Zone card state merging DB row + optimistic local save status. */
export function deriveEffectiveZoneState(input: {
  location_verification_status: string | null;
  zoneSavedStatus?: string | null;
  hasPrivateAddress?: boolean;
  city?: string | null;
}): VerificationStepState {
  const status = (input.zoneSavedStatus ?? input.location_verification_status ?? "").toLowerCase();
  if (status === "verified" || status === "auto_verified") return { kind: "verified" };
  if (status === "pending" || status === "review") return { kind: "pending" };
  if (status === "failed" || status === "rejected") return { kind: "failed", reason: null };
  const hasAddress = Boolean(input.hasPrivateAddress) || Boolean(input.city?.trim());
  if (hasAddress && (status === "missing" || status === "")) return { kind: "pending" };
  return { kind: "not_started" };
}

function deriveBackground(input: VerificationStateInput): VerificationStepState {
  const s = (input.cv_verification_status ?? "").toLowerCase();
  if (s === "verified") return { kind: "verified" };
  if (s === "pending") return { kind: "pending" };
  if (s === "failed" || s === "rejected") return { kind: "failed", reason: null };
  // "provided" status in DB, or any non-empty summary/bio, signals content was submitted
  if (s === "provided" || input.cv_summary?.trim() || input.bio?.trim()) return { kind: "provided" };
  return { kind: "not_started" };
}

export function deriveVerificationState(input: VerificationStateInput): DerivedVerificationState {
  const plan = (input.plan ?? "free").toLowerCase();
  const isPro = plan === "pro" || plan === "enterprise";

  const level = getVerificationLevel({
    plan: input.plan,
    identity_verified: Boolean(input.identity_verified),
    diploma_verified: Boolean(input.diploma_verified),
    is_verified: input.is_verified !== false,
    verification_level: input.verification_level,
  });

  return {
    level,
    nextLevel: nextVerificationLevel(level),
    identity: deriveIdentity(input),
    diploma: deriveDiploma(input),
    zone: deriveZone(input),
    background: deriveBackground(input),
    emailConfirmed: true,
    isPro,
    marketplaceVisible: Boolean(input.is_verified),
  };
}
