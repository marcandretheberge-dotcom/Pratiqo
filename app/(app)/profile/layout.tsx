import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

/**
 * Server-side student profile guard.
 *
 * The profile page exposes student account preferences and student booking
 * history, so wrong-role users should be redirected before the client page
 * renders.
 */
export default async function StudentProfileLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("student", "/profile");

  return <>{children}</>;
}
