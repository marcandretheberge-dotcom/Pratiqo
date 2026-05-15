import React from "react";
import { headers } from "next/headers";
import { requireCurrentUserServer } from "@/lib/auth/server";
import { AuthenticatedShell } from "../../components/AuthenticatedShell";

/**
 * Layer 2 server-side auth guard for the (app) route group.
 *
 * Execution order:
 *   1. middleware.ts — edge, cookie-presence check, redirects to /login
 *   2. This layout — RSC, full getUser() JWT verify, redirects to /login
 *   3. AuthenticatedShell — client, role-based nav/UX layer
 *
 * Legal pages (/legal/*) are not in the middleware matcher and bypass the
 * auth check here via the x-pathname header.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";

  // /legal/* pages are public — skip auth check
  if (pathname.startsWith("/legal")) {
    return <>{children}</>;
  }

  await requireCurrentUserServer(pathname || "/dashboard");

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
