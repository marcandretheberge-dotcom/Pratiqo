import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

export default async function UpgradeLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("teacher", "/upgrade");

  return <>{children}</>;
}
