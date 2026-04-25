import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep middleware permissive: route access/role gating happens client-side in `AuthenticatedShell`.
// This avoids blocking student flows like `/student/choose-companion`.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
