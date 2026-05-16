import React from "react";
import { requireAnyRoleServer } from "@/lib/auth/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRoleServer(["student", "teacher"], "/dashboard");

  return <>{children}</>;
}
