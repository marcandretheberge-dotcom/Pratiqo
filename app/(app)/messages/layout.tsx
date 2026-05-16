import React from "react";
import { requireAnyRoleServer } from "@/lib/auth/server";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRoleServer(["student", "teacher"], "/messages");

  return <>{children}</>;
}
