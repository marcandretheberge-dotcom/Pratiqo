import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

/**
 * Server-side teacher role guard.
 *
 * The parent app layout verifies the Supabase session. This nested layout
 * ensures teacher-only pages never render for students or admins before the
 * client shell has a chance to redirect.
 */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("teacher", "/teacher/my-profile");

  return <>{children}</>;
}
