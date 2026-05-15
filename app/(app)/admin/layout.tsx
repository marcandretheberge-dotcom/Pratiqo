import React from "react";
import { requireAdminServer } from "@/lib/auth/server";

/**
 * Server-side admin role guard.
 *
 * Runs after the parent (app)/layout.tsx has already verified the user is
 * authenticated. This layout performs the additional role check: admin pages
 * must never render HTML for non-admin users, even if they somehow bypass the
 * client-side AuthenticatedShell redirect.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminServer("/admin/operations");

  return <>{children}</>;
}
