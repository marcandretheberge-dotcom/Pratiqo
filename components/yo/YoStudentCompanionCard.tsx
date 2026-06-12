"use client";

/**
 * YoStudentCompanionCard
 *
 * Dashboard / progress-page card that surfaces the YoPratiqo travel
 * companion alongside the student's own YoPratiqo progress.
 *
 * What this card IS
 * -----------------
 *   • A separate card titled "YoPratiqo Companion", visually adjacent
 *     to (but independent from) the existing legacy companion card.
 *   • Renders the YoPratiqo travel-companion PNG via `CompanionAvatar`
 *     in a pose that reflects the student's own progress state.
 *   • Locale-aware in FR / EN / ES.
 *   • Includes an explicit privacy note that teachers only ever receive
 *     a useful summary when the student grants consent during booking,
 *     and that raw quiz answers are NEVER shared.
 *
 * What this card is NOT
 * ---------------------
 *   • It does NOT replace or modify the legacy companion families
 *     (`forest | phoenix | dragon | star`). The legacy `CompanionCard`
 *     continues to render in its own section, untouched.
 *   • It does NOT enable any paid YoPratiqo checkout.
 *   • It does NOT call AI, does NOT send raw quiz answers, does NOT
 *     fabricate progress when no data is available.
 *   • It does NOT share progress with teachers — that path lives in the
 *     booking-time consent flow (`/api/bookings/[id]/yopratiqo-bridge`).
 *
 * Data flow
 * ---------
 *   • Reads the authenticated student's OWN snapshots from
 *     `GET /api/yo/progress` (auth via Supabase access token).
 *   • Renders an empty state (with a soft CTA to /yo) when there are
 *     no snapshots, when the user is signed out, or when the API call
 *     fails. Never invents progress.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ShieldCheck, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import {
  type StudentCompanionLocale,
  type StudentCompanionSnapshotInput,
  type StudentCompanionState,
  deriveStudentCompanionState,
} from "@/lib/yopratiqo/studentCompanionState";

const COPY: Record<
  StudentCompanionLocale,
  {
    title: string;
    subtitle: string;
    emptyBody: string;
    moduleCountLabel: string;
    levelLabel: string;
    courseLabel: string;
    privacy: string;
    activityLabel: string;
  }
> = {
  fr: {
    title: "Yoppo, ton compagnon",
    subtitle:
      "Yoppo suit ta progression dans les modules, en plus de ton compagnon Pratiqo classique.",
    emptyBody:
      "Commence un module YoPratiqo pour faire voyager Yoppo.",
    moduleCountLabel: "Modules complétés",
    levelLabel: "Niveau",
    courseLabel: "Parcours",
    privacy:
      "Les professeurs reçoivent seulement un résumé utile lorsque tu choisis de le partager pendant la réservation. Les réponses brutes aux quiz ne sont pas partagées.",
    activityLabel: "Dernière activité",
  },
  en: {
    title: "Yoppo, your companion",
    subtitle:
      "Yoppo tracks your module progress, alongside your classic Pratiqo companion.",
    emptyBody:
      "Start a YoPratiqo module to wake up Yoppo.",
    moduleCountLabel: "Completed modules",
    levelLabel: "Level",
    courseLabel: "Track",
    privacy:
      "Teachers receive only a useful summary when you choose to share it during booking. Raw quiz answers are not shared.",
    activityLabel: "Last activity",
  },
  es: {
    title: "Yoppo, tu compañero",
    subtitle:
      "Yoppo sigue tu progreso en los módulos, además de tu compañero clásico de Pratiqo.",
    emptyBody:
      "Comienza un módulo de YoPratiqo para despertar a Yoppo.",
    moduleCountLabel: "Módulos completados",
    levelLabel: "Nivel",
    courseLabel: "Recorrido",
    privacy:
      "Los profesores reciben solo un resumen útil cuando eliges compartirlo durante la reserva. Las respuestas brutas de los cuestionarios no se comparten.",
    activityLabel: "Última actividad",
  },
};

function safeLocale(locale: StudentCompanionLocale | undefined): StudentCompanionLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

type FetchState =
  | { status: "loading" }
  | { status: "ready"; snapshots: StudentCompanionSnapshotInput[] }
  | { status: "unauthenticated" }
  | { status: "error" };

export type YoStudentCompanionCardProps = {
  /** UI locale. Defaults to "fr". */
  locale: StudentCompanionLocale;
  /**
   * Optional pre-fetched snapshots. When provided the card skips the
   * client fetch — useful for server components, Storybook, and tests.
   */
  initialSnapshots?: StudentCompanionSnapshotInput[];
  className?: string;
};

export function YoStudentCompanionCard({
  locale,
  initialSnapshots,
  className,
}: YoStudentCompanionCardProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];

  const [fetchState, setFetchState] = useState<FetchState>(() => {
    if (initialSnapshots) {
      return { status: "ready", snapshots: initialSnapshots };
    }
    return { status: "loading" };
  });

  useEffect(() => {
    if (initialSnapshots) return;
    let cancelled = false;

    void (async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          if (!cancelled) setFetchState({ status: "unauthenticated" });
          return;
        }
        const res = await fetch("/api/yo/progress", {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          if (!cancelled) setFetchState({ status: "error" });
          return;
        }
        const body = (await res.json().catch(() => ({}))) as {
          snapshots?: StudentCompanionSnapshotInput[];
        };
        const snapshots = Array.isArray(body.snapshots) ? body.snapshots : [];
        if (!cancelled) setFetchState({ status: "ready", snapshots });
      } catch {
        if (!cancelled) setFetchState({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialSnapshots]);

  // Derive the visual + display state from whatever snapshots we have.
  // Loading / error / unauthenticated all fall through to the empty
  // state with the safe CTA — we never invent progress.
  const snapshots =
    fetchState.status === "ready" ? fetchState.snapshots : [];
  const derived: StudentCompanionState = deriveStudentCompanionState(snapshots, {
    locale: l,
  });

  const isLoading = fetchState.status === "loading";

  return (
    <section
      data-testid="yo-student-companion-card"
      data-yo-student-companion="card"
      data-yo-student-companion-state={derived.state}
      data-yo-student-companion-has-progress={
        derived.hasAnyProgress ? "true" : "false"
      }
      className={cn(
        "rounded-3xl border border-[#DDF4F1] bg-gradient-to-br from-[#FAFCFB] via-white to-[#FFF4D6]",
        "p-4 shadow-[0_10px_28px_rgba(15,58,52,0.07)] sm:p-5",
        className,
      )}
    >
      <header className="flex items-start gap-4">
        <CompanionAvatar
          visualId="travel"
          state={derived.state}
          locale={l}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            Yoppo
          </p>
          <h2
            data-testid="yo-student-companion-card-title"
            className="mt-1 text-lg font-semibold tracking-tight text-[#0F6E56] sm:text-xl"
          >
            {copy.title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/72 sm:text-sm">
            {copy.subtitle}
          </p>
        </div>
      </header>

      {isLoading ? (
        <div
          data-testid="yo-student-companion-card-loading"
          className="mt-4 h-16 animate-pulse rounded-2xl bg-white/70"
          aria-hidden
        />
      ) : derived.hasAnyProgress ? (
        <dl
          data-testid="yo-student-companion-card-stats"
          className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-[#DDF4F1] bg-white/85 p-3 sm:grid-cols-2"
        >
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/65">
              {copy.moduleCountLabel}
            </dt>
            <dd className="mt-0.5 text-lg font-bold text-[#0F6E56]">
              {derived.completedModulesCount}
            </dd>
          </div>
          {derived.currentLevelLabel ? (
            <div>
              <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/65">
                {copy.levelLabel}
              </dt>
              <dd className="mt-0.5 text-lg font-bold text-[#0F6E56]">
                {derived.currentLevelLabel}
              </dd>
            </div>
          ) : null}
          {derived.courseLabel ? (
            <div className="col-span-2">
              <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0F6E56]/65">
                {copy.courseLabel}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#0F6E56]">
                {derived.courseLabel}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p
          data-testid="yo-student-companion-card-empty"
          className="mt-4 rounded-2xl border border-dashed border-[#DDF4F1] bg-white/70 px-4 py-3 text-sm leading-relaxed text-[#0F6E56]/82"
        >
          <Sparkles className="me-2 inline size-4 align-text-bottom text-[#1D9E75]" aria-hidden />
          {copy.emptyBody}
        </p>
      )}

      <Link
        href={derived.primaryCtaHref}
        data-testid="yo-student-companion-card-cta"
        className="mt-4 inline-flex items-center justify-between gap-3 rounded-2xl border border-[#0F6E56]/15 bg-white px-4 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#FFF4D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
      >
        <span>{derived.primaryCtaLabel}</span>
        <ChevronRight className="size-4" aria-hidden />
      </Link>

      <p
        data-testid="yo-student-companion-card-privacy"
        className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#0F6E56]/72"
      >
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#1D9E75]" aria-hidden />
        <span>{copy.privacy}</span>
      </p>
    </section>
  );
}
