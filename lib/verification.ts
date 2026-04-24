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
    color: "#888780",
    bgColor: "#F1EFE8",
    description: "Profil non vérifié",
    perks: ["Profil visible", "Messages autorisés", "Max 2 élèves"],
  },
  1: {
    level: 1,
    label: "Email vérifié",
    badge: "✓",
    color: "#1D9E75",
    bgColor: "#E1F5EE",
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
    label: "Pro Vérifié Pratiqo",
    badge: "⭐",
    color: "#FFFFFF",
    bgColor: "#0F6E56",
    description: "Niveau maximum de confiance",
    perks: ["Position #1 recherche", "Programme Platine", "Ristourne annuelle"],
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

export function nextLevelRequirements(
  current: VerificationLevel,
  ctx: { plan?: string | null; identity_verified?: boolean; diploma_verified?: boolean },
): string[] {
  const next = nextVerificationLevel(current);
  if (!next) return [];

  const plan = String(ctx.plan || "free").toLowerCase();
  const isPro = plan === "pro" || plan === "enterprise";
  const idV = Boolean(ctx.identity_verified);
  const dipV = Boolean(ctx.diploma_verified);

  if (next === 1) return ["Confirmer ton adresse courriel (connexion Google)."];
  if (next === 2) return ["Soumettre une pièce d'identité et la faire valider par l'équipe Pratiqo."];
  if (next === 3) return ["Téléverser un diplôme ou certificat et attendre la validation."];
  if (next === 4) {
    const lines = ["Avoir les niveaux 1 à 3 complétés."];
    if (!isPro) lines.unshift("Passer au forfait Pro ou Entreprise.");
    if (!idV) lines.push("Vérification d'identité (niveau 2) requise.");
    if (!dipV) lines.push("Vérification de diplôme (niveau 3) requise.");
    return lines;
  }
  return [];
}
