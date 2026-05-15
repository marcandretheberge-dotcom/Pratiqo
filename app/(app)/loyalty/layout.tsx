import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

/**
 * Server-side teacher loyalty guard.
 *
 * Loyalty and ristourne pages are teacher program surfaces, so wrong-role users
 * should be redirected before teacher financial context can render.
 */
export default async function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("teacher", "/loyalty");

  return <>{children}</>;
}
