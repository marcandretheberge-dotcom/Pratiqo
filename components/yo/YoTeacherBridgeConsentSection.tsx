"use client";

/**
 * YoTeacherBridgeConsentSection
 *
 * Mounts the `YoTeacherBridgeConsentCard` on the YoPratiqo hub (`/yo`) in
 * coming-soon mode. The card is fully interactive — checkbox + change
 * handler — but `comingSoon = true` is hard-coded here, and the section
 * does NOT call any persistence endpoint. This is the safe way to surface
 * the consent UX before the bridge persistence layer is wired.
 *
 * The interactive state lives entirely in this section's React state. When
 * a future PR plumbs a real "save consent" call, replace `setChecked` with
 * a call site that posts to the bridge API and remove `comingSoon`.
 */

import { useState } from "react";

import type { YoLocale } from "@/lib/yo/types";
import { YoTeacherBridgeConsentCard } from "@/components/yo/YoTeacherBridgeConsentCard";
import { buildDominicanA1FoundationDemoSummary } from "@/lib/yopratiqo/teacherBridgeSummary";

const SECTION_ARIA_LABEL: Record<YoLocale, string> = {
  fr: "Aperçu du consentement de partage",
  en: "Sharing consent preview",
  es: "Vista previa del consentimiento para compartir",
};

export function YoTeacherBridgeConsentSection({ locale }: { locale: YoLocale }): React.JSX.Element {
  const [checked, setChecked] = useState(false);
  const summary = buildDominicanA1FoundationDemoSummary();

  return (
    <section
      aria-label={SECTION_ARIA_LABEL[locale] ?? SECTION_ARIA_LABEL.fr}
      data-testid="yo-teacher-bridge-consent-section"
      className="bg-[#FAFCFB] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <YoTeacherBridgeConsentCard
          locale={locale}
          checked={checked}
          onCheckedChange={setChecked}
          comingSoon={true}
          companionName={summary.companion?.companionName ?? null}
          completedModulesCount={summary.completedModules.length}
          currentLevelLabel={summary.currentLevel}
        />
      </div>
    </section>
  );
}
