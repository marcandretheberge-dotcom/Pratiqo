import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth/server";

/**
 * Server-side admin role guard.
 *
 * Runs after the parent (app)/layout.tsx has already verified the user is
 * authenticated. This layout performs the additional role check — admin pages
 * must never render HTML for non-admin users, even if they somehow bypass the
 * client-side AuthenticatedShell redirect.
 *
 * Uses the anon Supabase client (user's own session + RLS) to read the profile
 * role — no service-role elevation needed for a self-profile lookup.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getCurrentUserServer();

  if (!user) {
    redirect("/login?next=/admin/operations");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { role?: string } | null)?.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
