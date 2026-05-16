import React from "react";
import { requireAdminServer } from "@/lib/auth/server";

export default async function SupabaseLayout({ children }: { children: React.ReactNode }) {
  await requireAdminServer("/supabase");

  return <>{children}</>;
}
