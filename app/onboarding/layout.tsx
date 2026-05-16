import React from "react";
import { requireCurrentUserServer } from "@/lib/auth/server";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireCurrentUserServer("/onboarding");

  return <>{children}</>;
}
