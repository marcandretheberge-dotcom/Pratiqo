import React from "react";
import { requireRoleServer } from "@/lib/auth/server";

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  await requireRoleServer("student", "/booking");

  return <>{children}</>;
}
