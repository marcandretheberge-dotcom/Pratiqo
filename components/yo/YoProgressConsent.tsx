"use client";

import { StudentOnboardingConsentGate } from "@/components/student/StudentOnboardingConsentGate";

export function YoProgressConsent({ destination }: { destination: string }) {
  return <StudentOnboardingConsentGate product="yo" onBack={() => window.location.assign("/yo")}
    onSuccess={() => window.location.replace(destination)} />;
}
