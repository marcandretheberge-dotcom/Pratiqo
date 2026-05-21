import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage("/admin");
  return <>{children}</>;
}
