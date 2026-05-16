import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

export default async function TeacherOnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("teacher", "/onboarding/teacher");

  return <>{children}</>;
}
