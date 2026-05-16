import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

export default async function GroupSessionSuccessLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("student", "/student/group-sessions");

  return <>{children}</>;
}
