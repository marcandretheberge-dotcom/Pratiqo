// Server component: admin profile detail page.
//
// The /admin layout already runs `requireAdminPage()`, which redirects
// unauthenticated visitors to /login and non-admins to /dashboard, so
// rendering here is gated server-side. The data fetch goes through a
// service-role Supabase client; nothing on this page is sent down to
// non-admin browsers.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ShieldAlert, ShieldCheck, GraduationCap, User as UserIcon } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  loadActiveFounderPromo,
  loadFounderPromoHistory,
  rowToSnapshot,
  type FounderPromoRow,
} from "@/lib/admin/founderPromo";
import {
  getEffectivePlatformFeeBasisPoints,
  resolveEffectiveCommissionSource,
  type EffectiveCommissionSource,
} from "@/lib/payments/commission";
import {
  isFounderPromoCurrentlyActive,
} from "@/lib/payments/founderPromo";
import { FounderPromoCard } from "@/components/admin/FounderPromoCard";
import {
  TeacherOnboardingSupportCard,
  type TeacherOnboardingDiagnosis,
  type TeacherOnboardingSnapshot,
} from "@/components/admin/TeacherOnboardingSupportCard";
import {
  TeacherBadgesCard,
  type TeacherBadgeStatusRow,
} from "@/components/admin/TeacherBadgesCard";
import { ProfileDeactivationCard } from "@/components/admin/ProfileDeactivationCard";
import {
  isProfileReactivationAllowed,
  loadProfileDeactivationSnapshot,
} from "@/lib/admin/profileDeactivation";
import {
  validateTeacherLessonOffers,
  type TeacherLessonOfferInput,
} from "@/lib/pricing/lessonOffer";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";
import { LESSON_DURATION_OPTIONS } from "@/lib/pricing/lessonDuration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileDetailRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "student" | "teacher" | "admin";
  plan: string | null;
  subscription_status: string | null;
  pro_current_period_end: string | null;
  teacher_onboarding_complete: boolean | null;
  companion_chosen: boolean | null;
  deletion_requested_at: string | null;
  is_active: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  anonymized_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function roleStyle(role: ProfileDetailRow["role"]) {
  if (role === "admin") {
    return {
      Icon: ShieldCheck,
      label: "Admin",
      className: "bg-violet-50 text-violet-800 border-violet-200",
    };
  }
  if (role === "teacher") {
    return {
      Icon: GraduationCap,
      label: "Enseignant",
      className: "bg-teal-50 text-teal-800 border-teal-200",
    };
  }
  return {
    Icon: UserIcon,
    label: "Élève",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

function commissionSourceLabel(source: EffectiveCommissionSource): string {
  if (source === "paid_pro") return "Membre Pro payé";
  if (source === "founder_promo") return "Promotion fondateur";
  return "Taux standard";
}

function commissionSourceClass(source: EffectiveCommissionSource): string {
  if (source === "paid_pro") return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (source === "founder_promo") return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-slate-300 bg-slate-50 text-slate-800";
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id?.trim()) notFound();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, email, name, role, plan, subscription_status, pro_current_period_end, teacher_onboarding_complete, companion_chosen, deletion_requested_at, is_active, deactivated_at, deleted_at, anonymized_at, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/users/:id] page load failed", error.message);
    return (
      <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <p className="font-bold">Erreur lors du chargement du profil.</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      </main>
    );
  }

  if (!data) notFound();

  const profile = data as ProfileDetailRow;
  const isTeacher = profile.role === "teacher";
  const isPaidPro = profile.plan === "pro";
  const deactivationSnapshot = await loadProfileDeactivationSnapshot(admin, profile.id);
  const canReactivate = deactivationSnapshot
    ? isProfileReactivationAllowed(deactivationSnapshot)
    : false;

  const activePromo: FounderPromoRow | null = isTeacher
    ? await loadActiveFounderPromo(admin, profile.id)
    : null;
  const promoHistory: FounderPromoRow[] = isTeacher
    ? await loadFounderPromoHistory(admin, profile.id, 10)
    : [];

  const founderSnapshot = rowToSnapshot(activePromo);
  const effectiveBps = getEffectivePlatformFeeBasisPoints({
    teacherPlan: profile.plan,
    founderPromo: founderSnapshot,
  });
  const effectiveSource = resolveEffectiveCommissionSource({
    teacherPlan: profile.plan,
    founderPromo: founderSnapshot,
  });

  // ── Teacher-onboarding support snapshot ────────────────────────────
  // Loaded server-side so the admin gets the diagnosis on first render
  // and so we never expose the service-role client to the browser. The
  // helper logic is the SAME as the API route's diagnose() — duplicated
  // intentionally to keep the page render dependency-free of the route
  // module.
  type TeacherSupportRow = {
    id: string;
    user_id: string;
    price_per_lesson: number | string | null;
    home_lesson_enabled: boolean | null;
    home_lesson_price: number | string | null;
    home_lesson_min_duration: number | null;
    default_lesson_duration_minutes: number | null;
    intro_session_enabled: boolean | null;
    intro_session_price_cents: number | string | null;
    intro_session_duration_minutes: number | string | null;
    intro_session_discount_percent: number | string | null;
    verified_experience_active: boolean | null;
    verified_experience_set_at: string | null;
    verified_experience_set_by: string | null;
  };

  let teacherSupport:
    | {
        snapshot: TeacherOnboardingSnapshot;
        diagnosis: TeacherOnboardingDiagnosis;
      }
    | null = null;
  let teacherBadges: TeacherBadgeStatusRow[] | null = null;

  if (isTeacher) {
    const { data: teacherRow } = await admin
      .from("teachers")
      .select(
        "id, user_id, price_per_lesson, home_lesson_enabled, home_lesson_price, home_lesson_min_duration, default_lesson_duration_minutes, intro_session_enabled, intro_session_price_cents, intro_session_duration_minutes, intro_session_discount_percent, verified_experience_active, verified_experience_set_at, verified_experience_set_by",
      )
      .eq("user_id", profile.id)
      .maybeSingle();

    const row = teacherRow as TeacherSupportRow | null;
    if (row) {
      // Admin-controlled trust badges. Loaded server-side so the admin
      // never sees the boolean flicker, and so the audit metadata
      // (set_at / set_by) does NOT travel through the public
      // teachers_public projection — it comes directly from the
      // service-role read here.
      teacherBadges = [
        {
          key: "verified_experience",
          active: Boolean(row.verified_experience_active),
          setAt: row.verified_experience_set_at ?? null,
          setBy: row.verified_experience_set_by ?? null,
        },
      ];
      const standardHourly = Number(row.price_per_lesson);
      const hasStandard = Number.isFinite(standardHourly) && standardHourly > 0;
      const standardCents = hasStandard ? Math.round(standardHourly * 100) : 0;
      const explicitHome = Number(row.home_lesson_price);
      const hasExplicitHome = Number.isFinite(explicitHome) && explicitHome > 0;
      const homeHourly = row.home_lesson_enabled
        ? hasExplicitHome
          ? explicitHome
          : hasStandard
            ? standardHourly
            : null
        : null;
      const minHomeMinutes = Number(row.home_lesson_min_duration ?? 60);
      const safeMinutes =
        Number.isFinite(minHomeMinutes) && minHomeMinutes > 0 ? minHomeMinutes : 60;
      const homeCents =
        homeHourly != null ? Math.round(homeHourly * 100 * (safeMinutes / 60)) : 0;

      const offerCheck: TeacherLessonOfferInput = {
        price_per_lesson: row.price_per_lesson,
        home_lesson_enabled: row.home_lesson_enabled,
        home_lesson_price: row.home_lesson_price,
        home_lesson_min_duration: row.home_lesson_min_duration,
        intro_session_enabled: row.intro_session_enabled,
        intro_session_price_cents: row.intro_session_price_cents,
        intro_session_duration_minutes: row.intro_session_duration_minutes,
        intro_session_discount_percent: row.intro_session_discount_percent,
      };
      const check = validateTeacherLessonOffers(offerCheck);

      const missingFields: string[] = [];
      if (!hasStandard) missingFields.push("price_per_lesson");
      if (row.home_lesson_enabled === true && !hasExplicitHome) {
        missingFields.push("home_lesson_price");
      }
      if (!row.default_lesson_duration_minutes) missingFields.push("default_lesson_duration_minutes");

      teacherSupport = {
        snapshot: {
          id: row.id,
          price_per_lesson: row.price_per_lesson,
          home_lesson_enabled: row.home_lesson_enabled,
          home_lesson_price: row.home_lesson_price,
          home_lesson_min_duration: row.home_lesson_min_duration,
          default_lesson_duration_minutes: row.default_lesson_duration_minutes,
        },
        diagnosis: {
          minimumPassed: check.ok,
          minimumDollars: MIN_LESSON_PRICE_DOLLARS,
          effective: {
            standardHourly: hasStandard ? standardHourly : null,
            standardCents,
            homeHourly,
            homeCents,
            defaultDurationMinutes: row.default_lesson_duration_minutes ?? 60,
          },
          missingFields,
        },
      };
    }
  }

  const { Icon: RoleIcon, label: roleLabel, className: roleClass } = roleStyle(profile.role);

  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
        >
          <ChevronLeft size={16} aria-hidden />
          Retour à la liste
        </Link>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Profil utilisateur
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold text-[#2C2C2A]">
                {profile.name ?? "(sans nom)"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">{profile.email ?? "(sans email)"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${roleClass}`}
                >
                  <RoleIcon size={12} aria-hidden />
                  {roleLabel}
                </span>
                {profile.deletion_requested_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-rose-800">
                    <ShieldAlert size={12} aria-hidden />
                    Suppression demandée
                  </span>
                ) : null}
                {profile.is_active === false || profile.deactivated_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-slate-800">
                    Désactivé
                  </span>
                ) : null}
                {isPaidPro ? (
                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-900">
                    Membre Pro payé
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#2C2C2A]">Identifiants &amp; statuts</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">ID</dt>
              <dd className="mt-1 font-mono text-xs break-all text-slate-800">{profile.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Créé le</dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(profile.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dernière mise à jour
              </dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(profile.updated_at)}</dd>
            </div>
            {isTeacher ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Onboarding enseignant
                </dt>
                <dd className="mt-1 text-slate-800">
                  {profile.teacher_onboarding_complete ? "Complet" : "En cours"}
                </dd>
              </div>
            ) : (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Compagnon choisi
                </dt>
                <dd className="mt-1 text-slate-800">
                  {profile.companion_chosen ? "Oui" : "Non"}
                </dd>
              </div>
            )}
            {isTeacher ? (
              <>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Membre Pro (Stripe)
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {isPaidPro ? "Actif" : "Aucun abonnement actif"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Période en cours jusqu&apos;au
                  </dt>
                  <dd className="mt-1 text-slate-800">
                    {formatDate(profile.pro_current_period_end)}
                  </dd>
                </div>
              </>
            ) : null}
            {profile.deletion_requested_at ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Suppression demandée le
                </dt>
                <dd className="mt-1 text-slate-800">{formatDateTime(profile.deletion_requested_at)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Compte actif
              </dt>
              <dd className="mt-1 text-slate-800">
                {profile.is_active !== false && !profile.deactivated_at ? "Oui" : "Non"}
              </dd>
            </div>
          </dl>
        </section>

        {deactivationSnapshot && profile.role !== "admin" ? (
          <ProfileDeactivationCard
            targetUserId={profile.id}
            initialSnapshot={deactivationSnapshot}
            initialCanReactivate={canReactivate}
          />
        ) : null}

        {isTeacher ? (
          <>
            <section
              className={`rounded-3xl border p-6 shadow-sm ${commissionSourceClass(effectiveSource)}`}
              data-testid="effective-commission-block"
            >
              <h2 className="text-lg font-bold">Commission effective actuelle</h2>
              <p className="mt-2 text-3xl font-black">
                {(effectiveBps / 100).toFixed(2)} %
              </p>
              <p className="mt-1 text-sm font-semibold">
                {commissionSourceLabel(effectiveSource)}
              </p>
              <p className="mt-2 text-xs">
                Précédence appliquée :{" "}
                <strong>Membre Pro payé</strong> &gt; <strong>Promotion fondateur</strong>{" "}
                &gt; <strong>Taux standard</strong>. La promotion fondateur n&apos;active
                jamais le statut payé Membre Pro.
              </p>
            </section>

            {teacherBadges ? (
              <TeacherBadgesCard
                teacherUserId={profile.id}
                initialBadges={teacherBadges}
              />
            ) : null}

            {teacherSupport ? (
              <TeacherOnboardingSupportCard
                teacherUserId={profile.id}
                initialTeacher={teacherSupport.snapshot}
                initialDiagnosis={teacherSupport.diagnosis}
                durationOptions={LESSON_DURATION_OPTIONS as readonly number[]}
                minimumHourlyRate={MIN_LESSON_PRICE_DOLLARS}
              />
            ) : (
              <section
                className="rounded-3xl border border-[#DCEAE3] bg-white p-6 text-sm text-slate-600 shadow-sm"
                data-testid="teacher-onboarding-support-empty"
              >
                Aucun profil <em>teachers</em> trouvé pour cet utilisateur — la
                fiche de support onboarding apparaîtra une fois que le professeur
                aura commencé son inscription.
              </section>
            )}

            <FounderPromoCard
              teacherId={profile.id}
              activePromo={
                activePromo
                  ? {
                      id: activePromo.id,
                      started_at: activePromo.started_at,
                      ends_at: activePromo.ends_at,
                      commission_rate_bps: activePromo.commission_rate_bps,
                      ended_early_at: activePromo.ended_early_at,
                      is_active: isFounderPromoCurrentlyActive({
                        startedAt: activePromo.started_at,
                        endsAt: activePromo.ends_at,
                        commissionRateBps: activePromo.commission_rate_bps,
                        endedEarlyAt: activePromo.ended_early_at,
                      }),
                    }
                  : null
              }
              history={promoHistory.map((row) => ({
                id: row.id,
                started_at: row.started_at,
                ends_at: row.ends_at,
                commission_rate_bps: row.commission_rate_bps,
                ended_early_at: row.ended_early_at,
                created_at: row.created_at,
                created_by_email: row.created_by_email,
                ended_early_by_email: row.ended_early_by_email,
              }))}
              isPaidPro={isPaidPro}
            />
          </>
        ) : (
          <section className="rounded-3xl border border-[#DCEAE3] bg-white p-6 text-sm text-slate-600 shadow-sm">
            La promotion fondateur ne s&apos;applique qu&apos;aux comptes enseignants. Change
            d&apos;abord le rôle dans la liste si nécessaire.
          </section>
        )}
      </div>
    </main>
  );
}
