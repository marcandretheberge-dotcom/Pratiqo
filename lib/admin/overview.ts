/**
 * Admin marketplace command-center overview — count-only, privacy-safe.
 *
 * Never includes addresses, emails, names, payment payloads, or raw
 * student/teacher detail rows. Callers must still gate with
 * requireAdminApi / requireAdminPage.
 */

import { hasTeacherDisciplineSignal } from "@/lib/teachers/teacherDiscovery";

export type AdminOverview = {
  teachersTotal: number | null;
  teachersVisible: number | null;
  teachersBlocked: number | null;
  teachersHiddenNoDiscipline: number | null;
  teachersProfileIncomplete: number | null;
  teachersBookable: number | null;
  teachersVisiblePaymentSetupRequired: number | null;
  studentsTotal: number | null;
  bookingsTotal: number | null;
  pendingTeacherVerifications: number | null;
  stripeIncompleteTeachers: number | null;
  bookingIssues: number | null;
  teachersMissingRate: number | null;
  teachersMissingAvailability: number | null;
};

type AdminOverviewQuery = PromiseLike<{
  data?: unknown;
  count: number | null;
  error: { message: string } | null;
}> & {
  eq: (...args: unknown[]) => AdminOverviewQuery;
  is: (...args: unknown[]) => AdminOverviewQuery;
  not: (...args: unknown[]) => AdminOverviewQuery;
  or: (...args: unknown[]) => AdminOverviewQuery;
};

export type AdminOverviewModuleId =
  | "teachers"
  | "students"
  | "verifications"
  | "bookings"
  | "payments"
  | "stripe_diagnostics"
  | "package_launch_readiness"
  | "planned_package_orders"
  | "planned_package_launch_monitor"
  | "promotions"
  | "ambassadors"
  | "seo"
  | "support";

export type AdminOverviewModule = {
  id: AdminOverviewModuleId;
  title: string;
  description: string;
  cta: string;
  href: string | null;
  status: "ready" | "coming_soon";
};

/** Static module registry for the /admin command center. */
export const ADMIN_COMMAND_CENTER_MODULES: readonly AdminOverviewModule[] = [
  {
    id: "teachers",
    title: "Professeurs",
    description:
      "Voir les profils, la visibilité, les blocages, l’horaire, l’adresse admin-only et Stripe.",
    cta: "Gérer les professeurs",
    href: "/admin/users",
    status: "ready",
  },
  {
    id: "students",
    title: "Apprenants",
    description:
      "Voir les comptes apprenants, demandes, réservations, crédits et historique.",
    cta: "Gérer les apprenants",
    href: "/admin/users",
    status: "ready",
  },
  {
    id: "verifications",
    title: "Vérifications enseignants",
    description: "Diplômes, qualifications, identité et signaux de confiance.",
    cta: "Voir les vérifications",
    href: "/admin/credentials",
    status: "ready",
  },
  {
    id: "bookings",
    title: "Réservations",
    description: "Suivre les demandes, cours confirmés, annulations et problèmes.",
    cta: "Voir les réservations",
    href: "/admin/bookings",
    status: "ready",
  },
  {
    id: "payments",
    title: "Paiements",
    description: "Stripe, paiements, versements, exigences et revenus plateforme.",
    cta: "Voir les paiements",
    href: "/admin/payments",
    status: "ready",
  },
  {
    id: "stripe_diagnostics",
    title: "Diagnostics Stripe Connect",
    description:
      "Inspecter Connect, Identity, readiness paiement, payouts, sync et faux negatifs possibles.",
    cta: "Voir les diagnostics",
    href: "/admin/stripe-diagnostics",
    status: "ready",
  },
  {
    id: "package_launch_readiness",
    title: "Forfaits — préparation au lancement",
    description:
      "Flags, crédits, annulations, dashboards et garde-fous marketplace avant activation contrôlée.",
    cta: "Voir la préparation",
    href: "/admin/package-launch-readiness",
    status: "ready",
  },
  {
    id: "planned_package_orders",
    title: "Commandes de forfaits planifiés",
    description:
      "Diagnostic paiement, fulfillment, holds et réconciliation — sans versement ni remboursement.",
    cta: "Voir les commandes",
    href: "/admin/planned-package-orders",
    status: "ready",
  },
  {
    id: "planned_package_launch_monitor",
    title: "Suivi lancement forfaits",
    description:
      "Santé checkout/webhook, états bloqués, dashboards et rollback — lecture seule, sans mutation.",
    cta: "Voir le suivi",
    href: "/admin/planned-package-launch-monitor",
    status: "ready",
  },
  {
    id: "promotions",
    title: "Promotions & crédits",
    description: "Codes promo, crédits apprenants, compensations et concours.",
    cta: "Gérer les promotions",
    href: "/admin/promotions",
    status: "ready",
  },
  {
    id: "ambassadors",
    title: "Ambassadeurs",
    description:
      "Activer les professeurs ambassadeurs, gérer les liens et suivre les récompenses.",
    cta: "Gérer les ambassadeurs",
    href: "/admin/ambassadors",
    status: "ready",
  },
  {
    id: "seo",
    title: "SEO & marchés",
    description:
      "Profils indexables, sitemap, pages locales, Canada lancé, Uruguay prochain marché.",
    cta: "Voir SEO & marchés",
    href: null,
    status: "coming_soon",
  },
  {
    id: "support",
    title: "Support & résolution",
    description: "Problèmes utilisateurs, litiges, remboursements, notes internes.",
    cta: "Centre de résolution",
    href: null,
    status: "coming_soon",
  },
] as const;

export const ADMIN_OVERVIEW_UNAVAILABLE_LABEL = "Non disponible";

/** Fields that must never appear on the overview payload. */
export const ADMIN_OVERVIEW_FORBIDDEN_KEYS = [
  "address",
  "street",
  "postal_code",
  "postalCode",
  "exact_address",
  "home_address",
  "phone",
  "email",
  "student_email",
  "teacher_email",
  "stripe_customer_id",
  "stripe_account_id",
  "service_role",
  "serviceRoleKey",
  "access_token",
] as const;

export function emptyAdminOverview(): AdminOverview {
  return {
    teachersTotal: null,
    teachersVisible: null,
    teachersBlocked: null,
    teachersHiddenNoDiscipline: null,
    teachersProfileIncomplete: null,
    teachersBookable: null,
    teachersVisiblePaymentSetupRequired: null,
    studentsTotal: null,
    bookingsTotal: null,
    pendingTeacherVerifications: null,
    stripeIncompleteTeachers: null,
    bookingIssues: null,
    teachersMissingRate: null,
    teachersMissingAvailability: null,
  };
}

export function formatAdminOverviewMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) return ADMIN_OVERVIEW_UNAVAILABLE_LABEL;
  if (!Number.isFinite(value)) return ADMIN_OVERVIEW_UNAVAILABLE_LABEL;
  return String(Math.max(0, Math.trunc(value)));
}

export function assertAdminOverviewPrivacySafe(payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const keys = Object.keys(payload as Record<string, unknown>);
  for (const forbidden of ADMIN_OVERVIEW_FORBIDDEN_KEYS) {
    if (keys.includes(forbidden)) {
      throw new Error(`Admin overview must not expose private key: ${forbidden}`);
    }
  }
}

export type AdminPriorityAlert = {
  id: string;
  label: string;
  count: number | null;
  href: string | null;
};

/**
 * Build priority alerts from overview counts. Null counts are omitted so
 * the UI never invents urgency from unavailable data.
 */
export function buildAdminPriorityAlerts(overview: AdminOverview): AdminPriorityAlert[] {
  const candidates: AdminPriorityAlert[] = [
    {
      id: "teachers-blocked",
      label: "Professeurs cachés sans discipline",
      count: overview.teachersHiddenNoDiscipline,
      href: "/admin/users",
    },
    {
      id: "teachers-blocked-total",
      label: "Profils enseignants non visibles",
      count: overview.teachersBlocked,
      href: "/admin/users",
    },
    {
      id: "teachers-missing-rate",
      label: "Professeurs sans tarif",
      count: overview.teachersMissingRate,
      href: "/admin/users",
    },
    {
      id: "teachers-missing-availability",
      label: "Professeurs sans disponibilité",
      count: overview.teachersMissingAvailability,
      href: "/admin/users",
    },
    {
      id: "stripe-incomplete",
      label: "Stripe incomplet",
      count: overview.stripeIncompleteTeachers,
      href: "/admin/users",
    },
    {
      id: "pending-verifications",
      label: "Vérifications enseignants en attente",
      count: overview.pendingTeacherVerifications,
      href: "/admin/credentials",
    },
    {
      id: "booking-issues",
      label: "Réservations / litiges à surveiller",
      count: overview.bookingIssues,
      href: null,
    },
  ];

  return candidates.filter((alert) => typeof alert.count === "number" && alert.count > 0);
}

function isEmptyAvailability(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}" || trimmed === "null") return true;
    return false;
  }
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function hasValidRate(value: number | string | null | undefined): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function isStripeIncomplete(row: {
  stripe_account_id?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
}): boolean {
  if (!row.stripe_account_id?.trim()) return true;
  if (!row.stripe_connect_onboarding_complete) return true;
  if (!row.stripe_connect_charges_enabled) return true;
  if (!row.stripe_connect_payouts_enabled) return true;
  return false;
}

function isProfileIncomplete(row: {
  name?: string | null;
  bio?: string | null;
  image_url?: string | null;
  price_per_lesson?: number | string | null;
  availability?: unknown;
  city?: string | null;
  region?: string | null;
}): boolean {
  if (!row.name?.trim()) return true;
  if (!row.bio?.trim()) return true;
  if (!row.image_url?.trim()) return true;
  if (!hasValidRate(row.price_per_lesson)) return true;
  if (isEmptyAvailability(row.availability)) return true;
  if (!row.city?.trim() || !row.region?.trim()) return true;
  return false;
}

/**
 * Load count-only admin overview. Failures on individual queries become
 * `null` for that metric so the homepage can show “Non disponible”.
 */
export async function loadAdminOverview(admin: {
  // Service-role Supabase client; typed loosely so route + tests can stub.
  from: (table: string) => unknown;
}): Promise<AdminOverview> {
  const db = admin as {
    from: (table: string) => {
      select: (...args: unknown[]) => AdminOverviewQuery;
    };
  };
  const overview = emptyAdminOverview();

  const safeCount = async (run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    try {
      const { count, error } = await run();
      if (error) {
        console.error("[admin/overview] count failed", error.message);
        return null;
      }
      return typeof count === "number" ? count : null;
    } catch (e) {
      console.error("[admin/overview] count threw", e);
      return null;
    }
  };

  const [teachersTotal, studentsTotal, teachersVisible, pendingDiplomas, pendingCredentials] =
    await Promise.all([
      safeCount(() =>
        db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
      ),
      safeCount(() =>
        db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      ),
      safeCount(() =>
        db.from("teachers_public").select("id", { count: "exact", head: true }),
      ),
      safeCount(() =>
        db
          .from("teachers")
          .select("id", { count: "exact", head: true })
          .not("diploma_url", "is", null)
          .or("diploma_verified.is.null,diploma_verified.eq.false"),
      ),
      safeCount(() =>
        db
          .from("teacher_credentials")
          .select("id", { count: "exact", head: true })
          .eq("verification_status", "pending"),
      ),
    ]);

  overview.teachersTotal = teachersTotal;
  overview.studentsTotal = studentsTotal;
  overview.teachersVisible = teachersVisible;

  if (typeof teachersTotal === "number" && typeof teachersVisible === "number") {
    overview.teachersBlocked = Math.max(0, teachersTotal - teachersVisible);
  }

  if (typeof pendingDiplomas === "number" || typeof pendingCredentials === "number") {
    overview.pendingTeacherVerifications =
      (pendingDiplomas ?? 0) + (pendingCredentials ?? 0);
  }

  // Booking admin dashboards are not shipped yet — stay honest.
  overview.bookingsTotal = null;
  overview.bookingIssues = null;

  try {
    const { data: teacherRows, error } = await db
      .from("teachers")
      .select(
        "id, name, discipline, category, bio, image_url, price_per_lesson, availability, city, region, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, deactivated_at, deleted_at, is_demo",
      )
      .is("deactivated_at", null)
      .is("deleted_at", null);

    if (error) {
      console.error("[admin/overview] teacher operational scan failed", error.message);
      overview.stripeIncompleteTeachers = null;
      overview.teachersMissingRate = null;
      overview.teachersMissingAvailability = null;
    } else {
      const rows = (teacherRows ?? []) as Array<{
        price_per_lesson?: number | string | null;
        availability?: unknown;
        id?: string | null;
        name?: string | null;
        discipline?: string | null;
        category?: string | null;
        image_url?: string | null;
        city?: string | null;
        region?: string | null;
        stripe_account_id?: string | null;
        stripe_connect_onboarding_complete?: boolean | null;
        stripe_connect_charges_enabled?: boolean | null;
        stripe_connect_payouts_enabled?: boolean | null;
        is_demo?: boolean | null;
      }>;
      const active = rows.filter((row) => row.is_demo !== true);
      const discoverable = active.filter((row) =>
        hasTeacherDisciplineSignal({
          discipline: row.discipline,
          category: row.category,
        }),
      );
      overview.stripeIncompleteTeachers = active.filter(isStripeIncomplete).length;
      overview.teachersMissingRate = active.filter((row) => !hasValidRate(row.price_per_lesson)).length;
      overview.teachersMissingAvailability = active.filter((row) =>
        isEmptyAvailability(row.availability),
      ).length;
      overview.teachersHiddenNoDiscipline = active.length - discoverable.length;
      overview.teachersProfileIncomplete = discoverable.filter(isProfileIncomplete).length;
      overview.teachersBookable = discoverable.filter((row) => !isStripeIncomplete(row) && hasValidRate(row.price_per_lesson)).length;
      overview.teachersVisiblePaymentSetupRequired = discoverable.filter(isStripeIncomplete).length;
    }
  } catch (e) {
    console.error("[admin/overview] teacher operational scan threw", e);
    overview.stripeIncompleteTeachers = null;
    overview.teachersMissingRate = null;
    overview.teachersMissingAvailability = null;
    overview.teachersHiddenNoDiscipline = null;
    overview.teachersProfileIncomplete = null;
    overview.teachersBookable = null;
    overview.teachersVisiblePaymentSetupRequired = null;
  }

  assertAdminOverviewPrivacySafe(overview);
  return overview;
}
