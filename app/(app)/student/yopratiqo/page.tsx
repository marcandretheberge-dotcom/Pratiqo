/**
 * /student/yopratiqo — authenticated YoPratiqo student hub.
 *
 * Purpose
 * -------
 * Dedicated logged-in landing surface for the YoPratiqo product. A
 * learner who entered through `/yo`, completed the free Intro deck,
 * and then signed in should arrive here — NOT on the generic
 * `/dashboard` — so the YoPratiqo product narrative survives the
 * OAuth round-trip.
 *
 * What this route IS
 * ------------------
 *   • A small YoPratiqo-branded shell mounted INSIDE the existing
 *     authenticated AppShell (so the global student header + bottom
 *     tab bar remain visible — the cross-product bridge between
 *     YoPratiqo and Pratiqo stays one click away in both directions).
 *   • A composition of audited primitives:
 *       - `YoPratiqoLogo`            (brand mark)
 *       - `YoStudentCompanionCard`   (the same card that lives on
 *                                     `/student/progress` — real
 *                                     companion + real snapshots,
 *                                     never invented progress)
 *       - links into the Dominican Republic Course Home + the
 *         five deck routes (Intro → Module 5) using paths that
 *         already exist in the routing tree
 *       - secondary link to `/student/progress` so a YoPratiqo
 *         learner can always reach the full Pratiqo progression
 *         page
 *   • Locale-aware in FR / EN / ES via the `lib/locale-context`
 *     `useLocale` hook (read inside the client child).
 *
 * What this route IS NOT
 * ----------------------
 *   • It does NOT replace `/student/progress`. The full Pratiqo
 *     progression page stays the canonical "everything I'm learning
 *     and booking" surface; this hub is a YoPratiqo-only zoom-in.
 *   • It does NOT introduce any new persistence, API call, or AI
 *     surface. Progress data still comes from `GET /api/yo/progress`
 *     via `YoStudentCompanionCard`.
 *   • It does NOT enable paid YoPratiqo checkout (the product config
 *     `premiumModulesEnabled: false` is unchanged).
 *   • It does NOT expose raw quiz answers, attempt logs, or any
 *     teacher-side data.
 *
 * Privacy / safety
 * ----------------
 * `robots: noindex, nofollow` so search engines don't crawl an
 * authenticated route. The AppShell parent layout already enforces
 * the auth gate (unauthenticated visitors are redirected to
 * `/login?next=/student/yopratiqo`, which the auth callback respects
 * via `sanitizeRelativeRedirectPath` + `resolvePostAuthRedirect`).
 */

import type { Metadata } from "next";
import { YoStudentHubContent } from "@/components/yo/YoStudentHubContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon YoPratiqo · Pratiqo",
  description:
    "Mon YoPratiqo — compagnon, parcours, et accès rapide à toute ma progression Pratiqo.",
  robots: { index: false, follow: false },
};

export default function StudentYopratiqoHubPage() {
  return <YoStudentHubContent />;
}
