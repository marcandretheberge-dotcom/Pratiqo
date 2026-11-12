import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CafePracticeInvitationCard } from "@/components/cafe/CafePracticeInvitationCard";
import { isCafeV1Enabled } from "@/lib/cafe/featureFlag";
import {
  CAFE_INVITATION_DEMO,
  resolveCafePracticeInvitation,
  type CafeInvitationCandidate,
} from "@/lib/cafe/practiceInvitation";
import { attachVerifiedCafeTheme } from "@/lib/cafe/themeAssociation";
import type { CafePublicSession } from "@/lib/cafe/publicTypes";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import styles from "../../cafe.module.css";

export const metadata: Metadata = {
  title: "Preview · Pratiquer au Café",
  robots: {
    index: false,
    follow: false,
  },
};

async function loadLiveCandidate(slug: string): Promise<CafeInvitationCandidate | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("cafe_public_sessions", { p_slug: slug });
    if (error) return null;
    const row = Array.isArray(data) ? (data[0] as CafePublicSession | undefined) : null;
    if (!row?.slug) return null;
    return attachVerifiedCafeTheme(row, { [slug]: "introductions" });
  } catch {
    return null;
  }
}

/**
 * Private preview only. Production stays behind CAFE_V1_ENABLED / review gate.
 * Demo sessions are labeled DEMO. Optional ?liveSlug= uses a published local session
 * with an explicit verified theme association.
 */
export default async function CafePratiquerPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isCafeV1Enabled()) notFound();

  const params = (await searchParams) ?? {};
  const liveSlug = typeof params.liveSlug === "string" ? params.liveSlug.trim() : "";
  const yoReturn =
    typeof params.yoReturn === "string" && params.yoReturn.startsWith("/")
      ? params.yoReturn
      : CAFE_INVITATION_DEMO.mission.courseReturnPath;

  const liveCandidate = liveSlug ? await loadLiveCandidate(liveSlug) : null;

  const available = resolveCafePracticeInvitation(
    {
      ...CAFE_INVITATION_DEMO.mission,
      courseReturnPath: yoReturn,
    },
    liveCandidate
      ? [liveCandidate]
      : [CAFE_INVITATION_DEMO.matchingSession, CAFE_INVITATION_DEMO.unrelatedSession],
    { reservationPathAvailable: true },
  );
  const unavailable = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.fullSession, CAFE_INVITATION_DEMO.unrelatedSession],
    { reservationPathAvailable: true },
  );

  return (
    <main className={styles.shell} lang="fr">
      <div className={styles.invitePreview}>
        <div className={styles.inviteBanner}>
          Preview privée Café · données {liveCandidate ? "LIVE locales" : "DEMO étiquetées"} ·
          aucune écriture production distante.
          L’invitation n’apparaît que si le parcours de réservation est disponible
          et qu’une séance correspond au thème et au niveau (themeId vérifié).
        </div>

        <CafePracticeInvitationCard
          caseLabel={
            liveCandidate
              ? `Cas 1 · LIVE · ${liveSlug}`
              : "Cas 1 · mission introductions · table disponible"
          }
          invitation={available}
        />
        <CafePracticeInvitationCard
          caseLabel="Cas 2 · mission introductions · aucune table réservable"
          invitation={unavailable}
        />
      </div>
    </main>
  );
}
