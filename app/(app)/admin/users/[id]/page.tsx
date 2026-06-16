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
      "id, email, name, role, plan, subscription_status, pro_current_period_end, teacher_onboarding_complete, companion_chosen, deletion_requested_at, created_at, updated_at",
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
          </dl>
        </section>

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
