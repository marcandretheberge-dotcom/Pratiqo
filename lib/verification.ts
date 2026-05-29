import type { TranslationKey } from "./translations";

export type VerificationLevel = 0 | 1 | 2 | 3 | 4;

export interface VerificationInfo {
  level: VerificationLevel;
  label: string;
  badge: string;
  color: string;
  bgColor: string;
  description: string;
  perks: string[];
}

/** UI palette: level 0 gray, 1 teal, 2 amber, 3 purple, 4 dark teal + white text */
export const VERIFICATION_LEVELS: Record<VerificationLevel, VerificationInfo> = {
  0: {
    level: 0,
    label: "Non vérifié",
    badge: "○",
    color: "#6B6A65",
    bgColor: "#F1EFE8",
    description: "Profil non vérifié",
    perks: ["Profil visible", "Messages autorisés", "Max 2 élèves"],
  },
  1: {
    level: 1,
    label: "Email vérifié",
    badge: "✓",
    color: "#50BEB2",
    bgColor: "#E8F5F3",
    description: "Adresse email confirmée",
    perks: ["Paiements acceptés", "Jusqu'à 5 élèves", "Profil complet"],
  },
  2: {
    level: 2,
    label: "Identité vérifiée",
    badge: "✓✓",
    color: "#BA7517",
    bgColor: "#FAEEDA",
    description: "Identité confirmée par Pratiqo",
    perks: ["Cours à domicile autorisés", "Priorité recherche", "Badge visible"],
  },
  3: {
    level: 3,
    label: "Diplômé vérifié",
    badge: "🎓",
    color: "#534AB7",
    bgColor: "#EEEDFE",
    description: "Diplôme ou certification vérifié",
    perks: ["Top résultats recherche", "Tarif suggéré +20%", "Badge diplôme"],
  },
  4: {
    level: 4,
    label: "Pratiqo Pro",
    badge: "⭐",
    color: "#FFFFFF",
    bgColor: "#1F5A54",
    description: "Adhésion Membre Pro active",
    perks: ["Badge Membre Pro visible", "Commission réduite", "Outils avancés"],
  },
};

type LevelInput = {
  identity_verified?: boolean;
  diploma_verified?: boolean;
  is_verified?: boolean;
  plan?: string | null;
  /** Stored admin / sync level — effective level is at least the computed business rules */
  verification_level?: number | null;
};

function computedLevel(teacher: LevelInput): VerificationLevel {
  const plan = String(teacher.plan || "free").toLowerCase();
  const isPro = plan === "pro" || plan === "enterprise";
  const idV = Boolean(teacher.identity_verified);
  const dipV = Boolean(teacher.diploma_verified);

  if (teacher.is_verified === false && !idV && !dipV) return 0;

  if (isPro) {
    if (idV && dipV) return 4;
    if (dipV) return 3;
    if (idV) return 2;
    return 1;
  }
  if (dipV) return 3;
  if (idV) return 2;
  return 1;
}

export function getVerificationLevel(teacher: LevelInput): VerificationLevel {
  const base = computedLevel(teacher);
  const stored =
    typeof teacher.verification_level === "number" && Number.isFinite(teacher.verification_level)
      ? Math.round(teacher.verification_level)
      : null;
  if (stored == null) return base;
  const merged = Math.max(base, stored) as number;
  return Math.min(4, Math.max(0, merged)) as VerificationLevel;
}

export function nextVerificationLevel(level: VerificationLevel): VerificationLevel | null {
  if (level >= 4) return null;
  return (level + 1) as VerificationLevel;
}

/** i18n keys for `t()` — see `lib/translations.ts` verificationReq* */
export function nextLevelRequirementKeys(
  current: VerificationLevel,
  ctx: { plan?: string | null; identity_verified?: boolean; diploma_verified?: boolean },
): TranslationKey[] {
  const next = nextVerificationLevel(current);
  if (!next) return [];

  const plan = String(ctx.plan || "free").toLowerCase();
  const isPro = plan === "pro" || plan === "enterprise";
  const idV = Boolean(ctx.identity_verified);
  const dipV = Boolean(ctx.diploma_verified);

  if (next === 1) return ["verificationReqConfirmEmail"];
  if (next === 2) return ["verificationReqSubmitId"];
  if (next === 3) return ["verificationReqSubmitDiploma"];
  if (next === 4) {
    const lines: TranslationKey[] = ["verificationReqComplete123"];
    if (!isPro) lines.unshift("verificationReqUpgradePro");
    if (!idV) lines.push("verificationReqIdentityPending");
    if (!dipV) lines.push("verificationReqDiplomaPending");
    return lines;
  }
  return [];
}

export function verificationLevelTitleKey(level: VerificationLevel): TranslationKey {
  const map: Record<VerificationLevel, TranslationKey> = {
    0: "verificationUnverified",
    1: "verificationEmail",
    2: "verificationIdentity",
    3: "verificationDiploma",
    4: "verificationPro",
  };
  return map[level];
}

const BADGE_DESC_KEYS: Record<VerificationLevel, TranslationKey> = {
  0: "verificationBadgeDesc0",
  1: "verificationBadgeDesc1",
  2: "verificationBadgeDesc2",
  3: "verificationBadgeDesc3",
  4: "verificationBadgeDesc4",
};

const BADGE_PERK_KEYS: Record<VerificationLevel, [TranslationKey, TranslationKey, TranslationKey]> = {
  0: ["verificationBadgeL0p0", "verificationBadgeL0p1", "verificationBadgeL0p2"],
  1: ["verificationBadgeL1p0", "verificationBadgeL1p1", "verificationBadgeL1p2"],
  2: ["verificationBadgeL2p0", "verificationBadgeL2p1", "verificationBadgeL2p2"],
  3: ["verificationBadgeL3p0", "verificationBadgeL3p1", "verificationBadgeL3p2"],
  4: ["verificationBadgeL4p0", "verificationBadgeL4p1", "verificationBadgeL4p2"],
};

export function verificationBadgeDescriptionKey(level: VerificationLevel): TranslationKey {
  return BADGE_DESC_KEYS[level];
}

export function verificationBadgePerkKeys(level: VerificationLevel): [TranslationKey, TranslationKey, TranslationKey] {
  return BADGE_PERK_KEYS[level];
}
