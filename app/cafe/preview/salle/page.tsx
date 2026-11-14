import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CafeConversationRoom } from "@/components/cafe/CafeConversationRoom";
import { isCafeV1Enabled } from "@/lib/cafe/featureFlag";
import { CAFE_INVITATION_DEMO } from "@/lib/cafe/practiceInvitation";

export const metadata: Metadata = {
  title: "Preview · Salle Café (DÉMO)",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Private labeled DEMO of the first conversation-room UX.
 * Not a real Daily session. Production stays behind CAFE_V1_ENABLED.
 */
export default function CafeSalleDemoPreviewPage() {
  if (!isCafeV1Enabled()) notFound();

  return (
    <CafeConversationRoom
      mode="demo"
      slug="demo-salle-preview"
      sessionTitle={CAFE_INVITATION_DEMO.matchingSession.title}
      courseReturnHref={CAFE_INVITATION_DEMO.mission.courseReturnPath}
    />
  );
}
