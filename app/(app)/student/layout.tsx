import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

/**
 * Server-side student role guard.
 *
 * The parent app layout verifies the Supabase session. This nested layout
 * ensures student-only pages never render for teachers or admins before the
 * client shell has a chance to redirect.
 */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("student", "/student/search");

  return <>{children}</>;
}
