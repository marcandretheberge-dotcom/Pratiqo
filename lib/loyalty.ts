/** Plafond du pool annuel de ristourne (CAD). */
export const RISTOURNE_POOL_MAX = 150_000;

/** Part des profits nets allouée au pool (avant plafond pool). */
export const RISTOURNE_RATE = 0.05;

/** Plafond par professeur éligible (CAD). */
export const RISTOURNE_PER_PROF_MAX = 10_000;

/** Seuil minimum pour qu’un montant calculé puisse faire l’objet d’un versement (sinon report). */
export const RISTOURNE_PER_PROF_MIN = 25;

/** Nombre minimum de professeurs éligibles pour activer la ristourne. */
export const RISTOURNE_MIN_ELIGIBLE_TEACHERS = 10;

/** Plafond cumulatif maximal du pool reporté + pool courant (CAD) — voir CGU. */
export const RISTOURNE_CUMULATIVE_POOL_MAX = 200_000;

export function calculateRistournePool(netProfit: number): number {
  return Math.min(netProfit * RISTOURNE_RATE, RISTOURNE_POOL_MAX);
}

export function isRistourneActivated(eligibleTeachers: number): boolean {
  return eligibleTeachers >= RISTOURNE_MIN_ELIGIBLE_TEACHERS;
}

/**
 * Montant théorique de ristourne pour un prof (avant règle des 25 $ de versement minimum).
 * Si moins de 10 profs éligibles → 0. Si volume total éligible nul → 0.
 */
export function calculateTeacherRistourne(
  teacherVolume: number,
  totalEligibleVolume: number,
  netProfit: number,
  eligibleTeachers: number,
): number {
  if (!isRistourneActivated(eligibleTeachers)) return 0;
  if (totalEligibleVolume <= 0 || teacherVolume < 0) return 0;
  const pool = calculateRistournePool(netProfit);
  const share = teacherVolume / totalEligibleVolume;
  const amount = pool * share;
  return Math.min(Math.max(amount, 0), RISTOURNE_PER_PROF_MAX);
}

/** Montant brut avant plafond par prof (pour détecter le plafond à 10 000 $). */
export function calculateTeacherRistourneUncapped(
  teacherVolume: number,
  totalEligibleVolume: number,
  netProfit: number,
  eligibleTeachers: number,
): number {
  if (!isRistourneActivated(eligibleTeachers)) return 0;
  if (totalEligibleVolume <= 0 || teacherVolume < 0) return 0;
  const pool = calculateRistournePool(netProfit);
  const share = teacherVolume / totalEligibleVolume;
  return Math.max(pool * share, 0);
}

export function teacherRistourneHitsPerProfCap(
  teacherVolume: number,
  totalEligibleVolume: number,
  netProfit: number,
  eligibleTeachers: number,
): boolean {
  const uncapped = calculateTeacherRistourneUncapped(
    teacherVolume,
    totalEligibleVolume,
    netProfit,
    eligibleTeachers,
  );
  return uncapped >= RISTOURNE_PER_PROF_MAX;
}

export function formatCadWhole(amount: number): string {
  return new Intl.NumberFormat("fr", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}
