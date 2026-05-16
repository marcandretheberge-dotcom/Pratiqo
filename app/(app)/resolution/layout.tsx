import React from "react";
import { requireAnyRoleServer } from "@/lib/auth/server";

export default async function ResolutionLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRoleServer(["student", "teacher"], "/resolution");

  return <>{children}</>;
}
