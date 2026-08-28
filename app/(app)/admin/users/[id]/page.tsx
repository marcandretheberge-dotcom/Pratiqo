// Server component: admin profile detail page.
//
// The /admin layout already runs `requireAdminPage()`, which redirects
// unauthenticated visitors to /login and non-admins to /dashboard, so
// rendering here is gated server-side. The data fetch goes through a
// service-role Supabase client; nothing on this page is sent down to
// non-admin browsers.

import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  CreditCard,
  ExternalLink,
  Eye,
  GraduationCap,
  MapPin,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
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
import { TeacherIdentityVerificationCard } from "@/components/admin/TeacherIdentityVerificationCard";
import {
  TeacherBadgesCard,
  type TeacherBadgeStatusRow,
} from "@/components/admin/TeacherBadgesCard";
import { ProfileDeactivationCard } from "@/components/admin/ProfileDeactivationCard";
import { TeacherSeoPublicationCard } from "@/components/admin/TeacherSeoPublicationCard";
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
import { evaluateTeacherSeoPublication } from "@/lib/seo/teacherSeoPublication";
import { fetchTeacherSeoPublicationRowByUserId } from "@/lib/seo/teacherPublicProfileData";
import { loadAdminTeacher360, type AdminTeacher360 } from "@/lib/admin/teacher360";
import { getAdminAmbassadorForTeacher } from "@/lib/admin/ambassadors";

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

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  return "Non disponible";
}

function valueOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(value);
}

function formatCents(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return formatCurrency(value / 100);
}

const VISIBILITY_BLOCKER_LABELS: Record<string, string> = {
  BLOCKER_TEACHER_ROW_MISSING: "Profil professeur manquant",
  BLOCKER_PROFILE_INACTIVE: "Profil/compte inactif",
  BLOCKER_TEACHER_INACTIVE: "Profil enseignant désactivé",
  BLOCKER_DEMO_PROFILE: "Profil démo exclu",
  BLOCKER_INVALID_PUBLIC_IDS: "Identifiants publics invalides",
  BLOCKER_MISSING_SUBJECT: "Matière manquante",
  BLOCKER_FAILED_IDENTITY_IF_SEARCH_BLOCKING: "Identité échouée",
  BLOCKER_BY_RLS_OR_PUBLIC_VIEW: "Absent de la projection publique",
};

const VISIBILITY_WARNING_LABELS: Record<string, string> = {
  WARNING_PROFILE_NOT_PUBLISHED: "Profil public désactivé",
  WARNING_MISSING_PUBLIC_DATA: "Données publiques manquantes",
  WARNING_MISSING_BASE_RATE: "Tarif manquant",
  WARNING_MISSING_TEACHING_FORMAT: "Format de cours manquant",
  WARNING_MISSING_PUBLIC_LOCATION_OR_ONLINE: "Localisation manquante pour cours en personne",
  WARNING_UNSUPPORTED_COUNTRY: "Pays/marché non supporté",
  WARNING_IDENTITY_NOT_VERIFIED: "Identité non vérifiée",
  WARNING_NO_AVAILABILITY: "Aucune disponibilité",
  WARNING_NO_INTRO_LESSON: "Pas de cours d’introduction",
  WARNING_PROFILE_LOW_COMPLETION: "Profil peu complété",
};

function AdminField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Admin360Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#DCEAE3] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          {icon}
        </span>
        <h3 className="text-base font-bold text-[#2C2C2A]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function CodePills({
  codes,
  labels,
  tone,
}: {
  codes: string[];
  labels: Record<string, string>;
  tone: "rose" | "amber";
}) {
  if (codes.length === 0) {
    return <p className="text-sm text-slate-500">Aucun.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {codes.map((code) => (
        <span
          key={code}
          title={code}
          className={
            tone === "rose"
              ? "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800"
              : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
          }
        >
          {labels[code] ?? code}
        </span>
      ))}
    </div>
  );
}

function Teacher360Panel({ data }: { data: AdminTeacher360 }) {
  const stripeWarning = !data.payments.paymentReady || !data.payments.payoutReady;

  return (
    <section
      className="space-y-5 rounded-[2rem] border border-teal-200 bg-teal-50/40 p-5 shadow-sm"
      data-testid="admin-teacher-360"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-teal-700">
            Admin seulement
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#2C2C2A]">Teacher 360</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Vue opérationnelle privée: identité, visibilité, adresse, horaire, paiements et actions recommandées.
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${
            data.visibility.visibleInSearch
              ? "border-teal-200 bg-white text-teal-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
          data-testid="admin-teacher-360-search-status"
        >
          Visible en recherche: {data.visibility.visibleInSearch ? "Oui" : "Non"}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Admin360Card title="Identity / account" icon={<UserIcon size={18} aria-hidden />}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField label="Nom" value={valueOrDash(data.identity.displayName)} />
            <AdminField label="Email" value={valueOrDash(data.identity.email)} />
            <AdminField label="Rôle" value={valueOrDash(data.identity.role)} />
            <AdminField label="Compte actif" value={yesNo(data.identity.isActive)} />
            <AdminField label="Onboarding" value={yesNo(data.identity.onboardingComplete)} />
            <AdminField label="Dernière connexion" value={formatDateTime(data.identity.lastSignInAt)} />
            <AdminField label="Profile ID" value={data.identity.id} mono />
            <AdminField label="Teacher ID" value={valueOrDash(data.publicProfile.teacherId)} mono />
          </dl>
        </Admin360Card>

        <Admin360Card title="Profil public" icon={<Eye size={18} aria-hidden />}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField label="Publié" value={yesNo(data.publicProfile.isPublic)} />
            <AdminField label="Slug public" value={valueOrDash(data.publicProfile.publicSlug)} />
            <AdminField label="Photo" value={yesNo(data.publicProfile.hasPhoto)} />
            <AdminField label="Bio" value={yesNo(data.publicProfile.hasBio)} />
            <AdminField label="Tarif horaire" value={formatCurrency(data.publicProfile.hourlyRate)} />
            <AdminField label="Intro" value={yesNo(data.publicProfile.introLessonEnabled)} />
            <AdminField label="Prix intro" value={formatCents(data.publicProfile.introLessonPriceCents)} />
            <AdminField label="Durée intro" value={valueOrDash(data.publicProfile.introLessonDurationMinutes)} />
          </dl>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Matières</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.publicProfile.subjects.length ? (
                data.publicProfile.subjects.map((subject) => (
                  <span key={subject} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {subject}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
          </div>
          {data.publicProfile.publicProfileUrl ? (
            <Link
              href={data.publicProfile.publicProfileUrl}
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:underline"
            >
              Voir le profil public
              <ExternalLink size={14} aria-hidden />
            </Link>
          ) : null}
        </Admin360Card>

        <Admin360Card title="Visibilité recherche" icon={<SearchCheck size={18} aria-hidden />}>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-rose-700">Blocages</p>
              <CodePills codes={data.visibility.blockers} labels={VISIBILITY_BLOCKER_LABELS} tone="rose" />
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-amber-700">À surveiller</p>
              <CodePills codes={data.visibility.warnings} labels={VISIBILITY_WARNING_LABELS} tone="amber" />
            </div>
          </div>
        </Admin360Card>

        <Admin360Card title="Location / address" icon={<MapPin size={18} aria-hidden />}>
          <div
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900"
            data-testid="admin-teacher-360-private-address-label"
          >
            Adresse privée — visible admin seulement. Ne jamais exposer dans recherche, profil public, SEO ou logs.
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField label="Adresse privée" value={valueOrDash(data.privateLocation.addressLine)} />
            <AdminField label="Adresse 2" value={valueOrDash(data.privateLocation.addressLine2)} />
            <AdminField label="Ville" value={valueOrDash(data.privateLocation.city)} />
            <AdminField label="Région" value={valueOrDash(data.privateLocation.region)} />
            <AdminField label="Code postal" value={valueOrDash(data.privateLocation.postalCode)} />
            <AdminField label="Pays" value={valueOrDash(data.privateLocation.countryCode)} />
            <AdminField label="Coord. privées" value={
              data.privateLocation.lat !== null && data.privateLocation.lng !== null
                ? `${data.privateLocation.lat}, ${data.privateLocation.lng}`
                : "—"
            } />
            <AdminField label="Rayon public" value={
              data.publicLocation.teachingRadiusKm !== null ? `${data.publicLocation.teachingRadiusKm} km` : "—"
            } />
          </dl>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-sm font-bold text-[#2C2C2A]">Localisation publique</p>
            <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AdminField label="Ville publique" value={valueOrDash(data.publicLocation.city)} />
              <AdminField label="Région publique" value={valueOrDash(data.publicLocation.region)} />
              <AdminField label="Zone approximative" value={valueOrDash(data.publicLocation.approximateZone)} />
              <AdminField label="Signal carte public" value={yesNo(data.publicLocation.hasPublicMapSignal)} />
              <AdminField label="En ligne" value={yesNo(data.teachingCapabilities.onlineCapable)} />
              <AdminField label="Présentiel/domicile" value={yesNo(data.teachingCapabilities.inPersonCapable)} />
            </dl>
          </div>
        </Admin360Card>

        <Admin360Card title="Schedule / availability" icon={<CalendarDays size={18} aria-hidden />}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField label="Disponibilités" value={yesNo(data.availability.hasAvailability)} />
            <AdminField label="Fenêtres" value={valueOrDash(data.availability.availableWindowCount)} />
            <AdminField label="Jours configurés" value={data.availability.configuredDays.join(", ") || "—"} />
            <AdminField label="Prochain jour disponible" value={valueOrDash(data.availability.nextAvailableSlot)} />
            <AdminField label="Date de début des cours" value={valueOrDash(data.availability.availableFromDate)} />
            <AdminField
              label="Horaire"
              value={data.availability.scheduleMode === "precise" ? "Précis" : "Général"}
            />
            <AdminField
              label="Dernière activation horaire précis"
              value={valueOrDash(data.availability.preciseScheduleActivatedAt)}
            />
          </dl>
          {data.availability.upcomingExceptions.length ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Exceptions au calendrier
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {data.availability.upcomingExceptions.map((ex) => (
                  <li key={ex.exceptionDate}>
                    {ex.exceptionDate} — {ex.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-4 text-sm text-slate-700">{data.availability.summary ?? "Aucune disponibilité configurée."}</p>
          {data.availability.rawPreview.length ? (
            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-600">
                Données brutes disponibles
              </summary>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-slate-700">
                {JSON.stringify(data.availability.rawPreview, null, 2)}
              </pre>
            </details>
          ) : null}
        </Admin360Card>

        <Admin360Card title="Payments / Stripe" icon={<CreditCard size={18} aria-hidden />}>
          {stripeWarning ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              Stripe incomplet: ce professeur peut être visible, mais il ne peut pas accepter de réservations payées tant que Stripe n’est pas complété.
            </div>
          ) : null}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField label="Compte Stripe" value={yesNo(data.payments.stripeAccountExists)} />
            <AdminField label="Paiements activés" value={yesNo(data.payments.chargesEnabled)} />
            <AdminField label="Versements activés" value={yesNo(data.payments.payoutsEnabled)} />
            <AdminField label="Exigences dues" value={valueOrDash(data.payments.requirementsDueCount)} />
            <AdminField label="Payment ready" value={yesNo(data.payments.paymentReady)} />
            <AdminField label="Payout ready" value={yesNo(data.payments.payoutReady)} />
          </dl>
        </Admin360Card>

        <Admin360Card title="Marketplace activity" icon={<Activity size={18} aria-hidden />}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField label="Demandes" value={valueOrDash(data.activity.bookingRequestsCount)} />
            <AdminField label="Confirmées" value={valueOrDash(data.activity.confirmedBookingsCount)} />
            <AdminField label="Complétées" value={valueOrDash(data.activity.completedBookingsCount)} />
            <AdminField label="Annulées" value={valueOrDash(data.activity.cancelledBookingsCount)} />
            <AdminField label="Messages" value={valueOrDash(data.activity.messagesCount)} />
            <AdminField label="Avis" value={valueOrDash(data.activity.reviewsCount)} />
            <AdminField label="Note" value={valueOrDash(data.activity.rating)} />
            <AdminField label="Dernière activité" value={formatDateTime(data.activity.lastMarketplaceActivity)} />
          </dl>
        </Admin360Card>
      </div>

      <Admin360Card title="Actions recommandées" icon={<ShieldCheck size={18} aria-hidden />}>
        <div className="flex flex-wrap gap-2" data-testid="admin-teacher-360-recommended-actions">
          {data.recommendedActions.length ? (
            data.recommendedActions.map((action) =>
              action.href && action.status === "link" ? (
                <Link
                  key={action.id}
                  href={action.href}
                  className="inline-flex items-center justify-center rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
                >
                  {action.label}
                </Link>
              ) : (
                <span
                  key={action.id}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500"
                  title="Action à venir"
                >
                  {action.label} · À venir
                </span>
              ),
            )
          ) : (
            <p className="text-sm text-slate-500">Aucune action prioritaire.</p>
          )}
        </div>
      </Admin360Card>
    </section>
  );
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
  let teacherSeoPublication:
    | {
        teacherId: string;
        evaluation: ReturnType<typeof evaluateTeacherSeoPublication>;
      }
    | null = null;
  let teacherProfileId: string | null = null;
  const teacher360 = await loadAdminTeacher360(admin, profile.id);

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
      teacherProfileId = row.id;
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

    const seoRow = await fetchTeacherSeoPublicationRowByUserId(profile.id);
    if (seoRow) {
      teacherSeoPublication = {
        teacherId: seoRow.id,
        evaluation: evaluateTeacherSeoPublication(seoRow, "fr"),
      };
    }
  }

  const ambassadorMembership = teacherProfileId
    ? await getAdminAmbassadorForTeacher(admin, teacherProfileId)
    : null;

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

            {teacher360 ? <Teacher360Panel data={teacher360} /> : null}

            {teacher360?.publicProfile.teacherId ? (
              <TeacherIdentityVerificationCard
                teacherId={teacher360.publicProfile.teacherId}
                identityVerified={teacher360.identityVerification.identityVerified}
                identityStatus={teacher360.identityVerification.identityStatus}
                stripeIdentityStatus={teacher360.identityVerification.stripeIdentityStatus}
                identityVerifiedManually={teacher360.identityVerification.manualVerified}
                identityVerifiedManuallyAt={teacher360.identityVerification.manualVerifiedAt}
                identityManualVerificationNote={teacher360.identityVerification.manualNote}
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

            <section
              className="rounded-3xl border border-[#DCEAE3] bg-white p-6 shadow-sm"
              data-testid="admin-user-ambassador-card"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#2C2C2A]">Ambassadeur Pratiqo</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Le statut ambassadeur est distinct de Membre Pro et de la promotion
                    fondateur. Il s’active sur un professeur existant, sans recréer son compte.
                  </p>
                  {teacherProfileId ? (
                    <p className="mt-2 break-all font-mono text-xs text-slate-500">
                      teachers.id: {teacherProfileId}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-amber-800">
                      Aucun profil teachers trouvé pour activer ce professeur.
                    </p>
                  )}
                </div>
                {ambassadorMembership ? (
                  <Link
                    href={`/admin/ambassadors/${ambassadorMembership.ambassadorId}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white hover:bg-[#0B5845]"
                  >
                    Gérer l’ambassadeur
                  </Link>
                ) : teacherProfileId ? (
                  <Link
                    href={`/admin/ambassadors?teacherId=${encodeURIComponent(teacherProfileId)}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-100"
                  >
                    Activer comme ambassadeur
                  </Link>
                ) : null}
              </div>
              {ambassadorMembership ? (
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <AdminField label="Statut" value={ambassadorMembership.status} />
                  <AdminField
                    label="Lien principal"
                    value={
                      ambassadorMembership.primaryCode
                        ? `/r/${ambassadorMembership.primaryCode}`
                        : "Aucun"
                    }
                  />
                  <AdminField
                    label="Récompenses à payer"
                    value={formatCents(ambassadorMembership.rewardsOutstandingCents)}
                  />
                </dl>
              ) : null}
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

            {teacherSeoPublication ? (
              <TeacherSeoPublicationCard
                targetUserId={profile.id}
                teacherId={teacherSeoPublication.teacherId}
                initialEvaluation={teacherSeoPublication.evaluation}
              />
            ) : null}

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
